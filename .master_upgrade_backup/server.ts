import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { AppDatabase, AppUser, BallType, Match, Team, Tournament, Player, UserRole } from './src/types/cricket';
import {
  createEmptyInnings,
  editDelivery,
  processDelivery,
  undoLastDelivery,
} from './src/utils/cricketEngine';
import { getInitialCricketData } from './src/utils/initialData';
import { generateSalt, generateToken, hashPassword, verifyPassword } from './src/utils/authUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'cricket_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory state with disk persistence
let dbState: AppDatabase;

function loadDatabase(): AppDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.matches && parsed.teams) {
        // Ensure users and sessions structure exists
        if (!parsed.users || Object.keys(parsed.users).length === 0) {
          const initial = getInitialCricketData();
          parsed.users = initial.users;
          parsed.sessions = {};
          parsed.resetTokens = {};
        }
        if (!parsed.sessions) parsed.sessions = {};
        if (!parsed.resetTokens) parsed.resetTokens = {};
        return parsed;
      }
    } catch (err) {
      console.error('Error reading cricket_db.json, re-initializing seed data:', err);
    }
  }
  const initial = getInitialCricketData();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(data: AppDatabase) {
  try {
    data.lastUpdated = Date.now();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving cricket_db.json:', err);
  }
}

dbState = loadDatabase();

// Sanitize state before sending to clients (strip password hashes and secret tokens)
function getSanitizedDbState(): AppDatabase {
  const sanitizedUsers: Record<string, AppUser> = {};
  Object.entries(dbState.users || {}).forEach(([id, u]) => {
    sanitizedUsers[id] = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      assignedMatchIds: u.assignedMatchIds,
    };
  });

  return {
    ...dbState,
    users: sanitizedUsers,
    sessions: {},
    resetTokens: {},
  };
}

// Active SSE client connections for real-time synchronization
const sseClients = new Set<Response>();

function broadcastStateUpdate() {
  saveDatabase(dbState);
  const sanitized = getSanitizedDbState();
  const payload = `data: ${JSON.stringify({ type: 'STATE_UPDATE', state: sanitized })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Authentication Helpers
function getAuthUser(req: Request): AppUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const session = dbState.sessions?.[token];
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < Date.now()) {
    delete dbState.sessions[token];
    return null;
  }
  return dbState.users[session.userId] || null;
}

// Auth Middleware: enforces role check on protected routes
function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required. Please log in to perform this action.',
      });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${user.role}`,
      });
    }
    (req as any).user = user;
    next();
  };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Enable CORS for external streaming apps and broadcast overlays
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // SSE Real-Time Sync Endpoint (Public)
  app.get('/api/live/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send initial sanitized snapshot
    res.write(`data: ${JSON.stringify({ type: 'INIT', state: getSanitizedDbState() })}\n\n`);

    sseClients.add(res);

    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(pingInterval);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(pingInterval);
      sseClients.delete(res);
    });
  });

  // Get full database state (Public - sanitized)
  app.get('/api/state', (req: Request, res: Response) => {
    res.json(getSanitizedDbState());
  });

  // Get specific match (Public)
  app.get('/api/matches/:id', (req: Request, res: Response) => {
    const match = dbState.matches[req.params.id];
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  });

  // ==========================================
  // REAL AUTHENTICATION & USER MANAGEMENT APIS
  // ==========================================

  // Register New User
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { email, password, name, requestedRole } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Check if user already exists
      const existing = Object.values(dbState.users).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      // First user bootstrap rule:
      // If there are no admins in the database or if email is the configured owner, make them admin.
      const hasAnyAdmin = Object.values(dbState.users).some((u) => u.role === 'admin');
      const isOwnerEmail = normalizedEmail === 'wasimmakrani531@gmail.com';

      let assignedRole: UserRole = 'viewer';
      if (!hasAnyAdmin || isOwnerEmail) {
        assignedRole = 'admin';
      } else if (requestedRole === 'scorer') {
        // Scorer request: default to viewer until approved or assign scorer
        assignedRole = 'scorer';
      }

      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const newUser: AppUser = {
        id: userId,
        email: normalizedEmail,
        name: name.trim(),
        role: assignedRole,
        passwordHash,
        salt,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      dbState.users[userId] = newUser;

      // Create session
      const token = generateToken();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      dbState.sessions[token] = { userId, expiresAt };

      broadcastStateUpdate();

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          assignedMatchIds: newUser.assignedMatchIds,
        },
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  // Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = Object.values(dbState.users).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!user || !user.passwordHash || !user.salt) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isValid = verifyPassword(password, user.passwordHash, user.salt);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      user.lastLoginAt = Date.now();

      // Create session token
      const token = generateToken();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      dbState.sessions[token] = { userId: user.id, expiresAt };

      saveDatabase(dbState);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          assignedMatchIds: user.assignedMatchIds,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      delete dbState.sessions[token];
      saveDatabase(dbState);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Get Current Authenticated User (Me)
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      assignedMatchIds: user.assignedMatchIds,
    });
  });

  // Forgot Password: generate secure token
  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required.' });

      const normalizedEmail = email.trim().toLowerCase();
      const user = Object.values(dbState.users).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!user) {
        // Return generic success to prevent email enumeration
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been generated.',
        });
      }

      const resetToken = generateToken();
      const expiresAt = Date.now() + 3600000; // 1 hour
      if (!dbState.resetTokens) dbState.resetTokens = {};
      dbState.resetTokens[resetToken] = {
        token: resetToken,
        userId: user.id,
        expiresAt,
      };

      saveDatabase(dbState);

      // In production/cloud, email would be sent. In app, provide token for instant testing
      res.json({
        success: true,
        message: 'Password reset token generated successfully.',
        resetToken,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset Password using token
  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: 'Reset token and new password are required.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      const tokenRecord = dbState.resetTokens?.[resetToken];
      if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      const user = dbState.users[tokenRecord.userId];
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const salt = generateSalt();
      user.passwordHash = hashPassword(newPassword, salt);
      user.salt = salt;
      if (dbState.resetTokens) {
        delete dbState.resetTokens[resetToken];
      }

      saveDatabase(dbState);
      res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin User Management: List all registered users
  app.get('/api/admin/users', requireRole(['admin']), (req: Request, res: Response) => {
    const list = Object.values(dbState.users).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      assignedMatchIds: u.assignedMatchIds,
    }));
    res.json(list);
  });

  // Admin User Management: Update a user's role or assign matches
  app.put('/api/admin/users/:id/role', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const targetUser = dbState.users[req.params.id];
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      const { role, assignedMatchIds } = req.body;
      const currentUser = (req as any).user as AppUser;

      // Prevent demoting the last remaining admin
      if (targetUser.role === 'admin' && role !== 'admin') {
        const adminCount = Object.values(dbState.users).filter((u) => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last remaining Admin account.' });
        }
      }

      if (role && ['admin', 'scorer', 'viewer'].includes(role)) {
        targetUser.role = role;
      }
      if (Array.isArray(assignedMatchIds)) {
        targetUser.assignedMatchIds = assignedMatchIds;
      }

      broadcastStateUpdate();
      res.json({
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        assignedMatchIds: targetUser.assignedMatchIds,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // MATCH SCORING ROUTES (PROTECTED: Admin / Scorer)
  // ==========================================

  // Create match (Quick Match or Tournament Match) - Protected (Admin only)
  app.post('/api/matches', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const {
        name,
        tournamentId,
        tournamentName,
        stage = 'Quick Match',
        ballType = 'leather',
        overs = 20,
        oversPerBowler = 4,
        venue = 'Cricket Ground',
        date = new Date().toISOString().split('T')[0],
        team1,
        team2,
        toss,
      } = req.body;

      if (!team1 || !team2) {
        return res.status(400).json({ error: 'Team 1 and Team 2 are required.' });
      }

      const matchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      if (!dbState.teams[team1.id]) dbState.teams[team1.id] = team1;
      if (!dbState.teams[team2.id]) dbState.teams[team2.id] = team2;

      let battingFirstTeam = team1;
      let bowlingFirstTeam = team2;

      if (toss) {
        if (
          (toss.wonById === team1.id && toss.decision === 'bowl') ||
          (toss.wonById === team2.id && toss.decision === 'bat')
        ) {
          battingFirstTeam = team2;
          bowlingFirstTeam = team1;
        }
      }

      const inn1 = createEmptyInnings(battingFirstTeam, bowlingFirstTeam, overs, 10);
      const inn2 = createEmptyInnings(bowlingFirstTeam, battingFirstTeam, overs, 10);

      const newMatch: Match = {
        id: matchId,
        name: name || `${team1.name} vs ${team2.name}`,
        tournamentId,
        tournamentName,
        stage,
        ballType: (ballType as BallType) || 'leather',
        overs: Number(overs) || 20,
        oversPerBowler: Number(oversPerBowler) || Math.ceil(overs / 5),
        venue,
        date,
        team1,
        team2,
        toss,
        innings: [inn1, inn2],
        currentInningsIndex: 0,
        status: 'live',
        isDemo: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      dbState.matches[matchId] = newMatch;

      if (tournamentId && dbState.tournaments[tournamentId]) {
        if (!dbState.tournaments[tournamentId].fixtures.includes(matchId)) {
          dbState.tournaments[tournamentId].fixtures.push(matchId);
        }
      }

      broadcastStateUpdate();
      res.status(201).json(newMatch);
    } catch (err: any) {
      console.error('Error creating match:', err);
      res.status(500).json({ error: err.message || 'Failed to create match' });
    }
  });

  // Record delivery - Protected (Admin or Authorized Scorer)
  app.post('/api/matches/:id/delivery', requireRole(['admin', 'scorer']), (req: Request, res: Response) => {
    try {
      const match = dbState.matches[req.params.id];
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const user = (req as any).user as AppUser;
      // If scorer with restricted matches, verify authorization
      if (user.role === 'scorer' && user.assignedMatchIds && user.assignedMatchIds.length > 0) {
        if (!user.assignedMatchIds.includes(match.id)) {
          return res.status(403).json({ error: 'You are not authorized to score this match.' });
        }
      }

      const updatedMatch = processDelivery(match, req.body);
      dbState.matches[match.id] = updatedMatch;

      broadcastStateUpdate();
      res.json(updatedMatch);
    } catch (err: any) {
      console.error('Error processing delivery:', err);
      res.status(400).json({ error: err.message || 'Scoring error' });
    }
  });

  // Undo delivery - Protected (Admin or Authorized Scorer)
  app.post('/api/matches/:id/undo', requireRole(['admin', 'scorer']), (req: Request, res: Response) => {
    try {
      const match = dbState.matches[req.params.id];
      if (!match) return res.status(404).json({ error: 'Match not found' });

      const updatedMatch = undoLastDelivery(match);
      dbState.matches[match.id] = updatedMatch;

      broadcastStateUpdate();
      res.json(updatedMatch);
    } catch (err: any) {
      console.error('Error undoing delivery:', err);
      res.status(400).json({ error: err.message || 'Undo error' });
    }
  });

  // Edit delivery - Protected (Admin or Authorized Scorer)
  app.post('/api/matches/:id/edit-delivery', requireRole(['admin', 'scorer']), (req: Request, res: Response) => {
    try {
      const match = dbState.matches[req.params.id];
      if (!match) return res.status(404).json({ error: 'Match not found' });

      const { deliveryId, updatedFields } = req.body;
      if (!deliveryId || !updatedFields) {
        return res.status(400).json({ error: 'deliveryId and updatedFields are required' });
      }

      const updatedMatch = editDelivery(match, deliveryId, updatedFields);
      dbState.matches[match.id] = updatedMatch;

      broadcastStateUpdate();
      res.json(updatedMatch);
    } catch (err: any) {
      console.error('Error editing delivery:', err);
      res.status(400).json({ error: err.message || 'Edit delivery error' });
    }
  });

  // Switch to 2nd innings - Protected (Admin or Authorized Scorer)
  app.post('/api/matches/:id/start-second-innings', requireRole(['admin', 'scorer']), (req: Request, res: Response) => {
    try {
      const match = dbState.matches[req.params.id];
      if (!match) return res.status(404).json({ error: 'Match not found' });

      match.currentInningsIndex = 1;
      match.status = 'live';
      match.target = match.innings[0].totalRuns + 1;
      match.updatedAt = Date.now();

      broadcastStateUpdate();
      res.json(match);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reopen match - Protected (Admin or Authorized Scorer)
  app.post('/api/matches/:id/reopen', requireRole(['admin', 'scorer']), (req: Request, res: Response) => {
    try {
      const match = dbState.matches[req.params.id];
      if (!match) return res.status(404).json({ error: 'Match not found' });

      match.status = 'live';
      match.result = undefined;
      match.innings[match.currentInningsIndex].isCompleted = false;
      match.updatedAt = Date.now();

      broadcastStateUpdate();
      res.json(match);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update match metadata - Protected (Admin only)
  app.put('/api/matches/:id', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const match = dbState.matches[req.params.id];
      if (!match) return res.status(404).json({ error: 'Match not found' });

      Object.assign(match, req.body, { updatedAt: Date.now() });
      broadcastStateUpdate();
      res.json(match);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete match - Protected (Admin only)
  app.delete('/api/matches/:id', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const matchId = req.params.id;
      if (dbState.matches[matchId]) {
        delete dbState.matches[matchId];
        Object.values(dbState.tournaments).forEach((t) => {
          t.fixtures = t.fixtures.filter((fId) => fId !== matchId);
        });
        broadcastStateUpdate();
        res.json({ success: true, message: 'Match deleted' });
      } else {
        res.status(404).json({ error: 'Match not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // TOURNAMENT ROUTES (Protected: Admin only)
  // ==========================================

  app.post('/api/tournaments', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const { name, format = 'league', season = '2026', ballType = 'leather', overs = 20, teamIds = [], groups = [] } = req.body;
      const tId = `tourn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const newTournament: Tournament = {
        id: tId,
        name: name || 'New Tournament',
        format,
        season,
        ballType,
        overs: Number(overs) || 20,
        groups: groups.length > 0 ? groups : [{ id: 'grp_default', name: 'Group A', teamIds }],
        teamIds,
        fixtures: [],
        status: 'draft',
        rules: { ptsWin: 2, ptsTie: 1, ptsLoss: 0, ptsNR: 1 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      dbState.tournaments[tId] = newTournament;
      broadcastStateUpdate();
      res.status(201).json(newTournament);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/tournaments/:id', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const t = dbState.tournaments[req.params.id];
      if (!t) return res.status(404).json({ error: 'Tournament not found' });
      Object.assign(t, req.body, { updatedAt: Date.now() });
      broadcastStateUpdate();
      res.json(t);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/tournaments/:id', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      if (dbState.tournaments[req.params.id]) {
        delete dbState.tournaments[req.params.id];
        broadcastStateUpdate();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // TEAMS & PLAYERS (Protected: Admin only)
  // ==========================================

  app.post('/api/teams', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const team: Team = req.body;
      if (!team.id) {
        team.id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      }
      dbState.teams[team.id] = team;
      broadcastStateUpdate();
      res.status(201).json(team);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/players', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const player: Player = req.body;
      if (!player.id) {
        player.id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      }
      dbState.players[player.id] = player;
      if (player.teamId && dbState.teams[player.teamId]) {
        const team = dbState.teams[player.teamId];
        const exists = team.squad.some((p) => p.id === player.id);
        if (!exists) {
          team.squad.push(player);
        } else {
          team.squad = team.squad.map((p) => (p.id === player.id ? player : p));
        }
      }
      broadcastStateUpdate();
      res.status(201).json(player);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dedicated Auction Squad Sync Endpoint
  // Adds player directly into official team squad, handles UNSOLD, and prevents duplicates
  app.post('/api/auction/sync-sold-player', requireRole(['admin', 'scorer']), (req: Request, res: Response) => {
    try {
      const { id, name, category, role, teamId, teamName, team: rawTeam, soldPrice, basePrice, status, number } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Player name is required.' });
      }

      const playerId = String(id || (number ? `p_num_${number}` : `p_${String(name).replace(/\s+/g, '_').toLowerCase()}`));

      // Handle UNSOLD status
      if (status === 'UNSOLD') {
        // Remove from all squads if previously assigned
        Object.values(dbState.teams).forEach((t) => {
          t.squad = t.squad.filter((p) => p.id !== playerId);
        });
        if (dbState.players[playerId]) {
          dbState.players[playerId].auctionStatus = 'UNSOLD';
          dbState.players[playerId].teamId = undefined;
          dbState.players[playerId].soldPrice = 0;
        }
        broadcastStateUpdate();
        return res.status(200).json({ success: true, status: 'UNSOLD', playerId });
      }

      // Resolve team by ID, name, or raw team value from dropdown
      const searchTeamName = (teamName || (typeof rawTeam === 'string' ? rawTeam : rawTeam?.name) || '').trim();
      let targetTeam = teamId ? dbState.teams[teamId] : undefined;

      if (!targetTeam && searchTeamName) {
        targetTeam = Object.values(dbState.teams).find(
          (t) =>
            t.name.toLowerCase() === searchTeamName.toLowerCase() ||
            t.shortName.toLowerCase() === searchTeamName.toLowerCase() ||
            t.name.toLowerCase().includes(searchTeamName.toLowerCase())
        );
      }

      // If team not found by name, pick the first matching team or fallback
      const resolvedTeamId = targetTeam ? targetTeam.id : (teamId || Object.keys(dbState.teams)[0]);
      const resolvedTeamName = targetTeam ? targetTeam.name : (searchTeamName || 'Assigned Team');

      let playerRole: Player['role'] = 'all_rounder';
      const cat = (category || role || '').toLowerCase();
      if (cat.includes('bat')) playerRole = 'batter';
      else if (cat.includes('bowl')) playerRole = 'bowler';
      else if (cat.includes('keeper') || cat.includes('wk')) playerRole = 'wicket_keeper';

      const existingPlayer = dbState.players[playerId];
      const playerObj: Player = {
        id: playerId,
        name: String(name),
        teamId: resolvedTeamId,
        role: playerRole,
        battingStyle: existingPlayer?.battingStyle || 'right_hand',
        bowlingStyle: existingPlayer?.bowlingStyle || 'right_arm_medium',
        auctionStatus: 'SOLD',
        soldPrice: Number(soldPrice || 0),
        soldToTeamId: resolvedTeamId,
        soldToTeamName: resolvedTeamName,
        basePrice: Number(basePrice || 0),
        careerStats: existingPlayer?.careerStats || {
          matches: 0,
          innings: 0,
          runs: 0,
          balls: 0,
          highestScore: 0,
          fours: 0,
          sixes: 0,
          fifties: 0,
          hundreds: 0,
          wickets: 0,
          oversBowled: 0,
          runsConceded: 0,
          maidens: 0,
          bestBowling: '0/0',
          catches: 0,
          runOuts: 0,
          stumpings: 0,
          mvpPoints: 0,
        },
      };

      // 1. Save in global players catalog
      dbState.players[playerId] = playerObj;

      // 2. Strict Deduplication across all teams:
      // Remove from any other team's squad to guarantee a player belongs to only ONE team
      Object.values(dbState.teams).forEach((t) => {
        if (t.id !== resolvedTeamId) {
          t.squad = t.squad.filter((p) => p.id !== playerId);
        }
      });

      // 3. Add or update inside target team squad (no duplicates)
      if (dbState.teams[resolvedTeamId]) {
        const team = dbState.teams[resolvedTeamId];
        const existingIdx = team.squad.findIndex((p) => p.id === playerId);
        if (existingIdx >= 0) {
          team.squad[existingIdx] = playerObj;
        } else {
          team.squad.push(playerObj);
        }
      }

      // 4. Update any existing matches where this team is playing so lineups have the player
      Object.values(dbState.matches).forEach((match) => {
        if (match.team1.id === resolvedTeamId) {
          const idx = match.team1.squad.findIndex((p) => p.id === playerId);
          if (idx >= 0) match.team1.squad[idx] = playerObj;
          else match.team1.squad.push(playerObj);
        }
        if (match.team2.id === resolvedTeamId) {
          const idx = match.team2.squad.findIndex((p) => p.id === playerId);
          if (idx >= 0) match.team2.squad[idx] = playerObj;
          else match.team2.squad.push(playerObj);
        }
      });

      broadcastStateUpdate();
      res.status(200).json({ success: true, player: playerObj, teamName: resolvedTeamName });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // SYSTEM & BACKUP (Protected: Admin only)
  // ==========================================

  app.post('/api/reset-demo', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const resetAll = req.body.resetAll === true;
      if (resetAll) {
        dbState = getInitialCricketData();
      } else {
        const fresh = getInitialCricketData();
        Object.entries(fresh.matches).forEach(([k, v]) => {
          if (!dbState.matches[k]) dbState.matches[k] = v;
        });
        Object.entries(fresh.teams).forEach(([k, v]) => {
          if (!dbState.teams[k]) dbState.teams[k] = v;
        });
        Object.entries(fresh.tournaments).forEach(([k, v]) => {
          if (!dbState.tournaments[k]) dbState.tournaments[k] = v;
        });
      }
      broadcastStateUpdate();
      res.json({ success: true, message: 'Sample data restored' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/backup/export', requireRole(['admin']), (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=cricket_backup_${Date.now()}.json`);
    res.json(getSanitizedDbState());
  });

  app.post('/api/backup/import', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const imported = req.body;
      if (imported && imported.matches && imported.teams) {
        dbState = imported;
        if (!dbState.users) dbState.users = getInitialCricketData().users;
        if (!dbState.sessions) dbState.sessions = {};
        broadcastStateUpdate();
        res.json({ success: true, message: 'Database imported successfully' });
      } else {
        res.status(400).json({ error: 'Invalid cricket database backup JSON' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public OBS overlay data endpoint
  app.get('/api/obs/:id', (req: Request, res: Response) => {
    const match = dbState.matches[req.params.id];
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const currentInn = match.innings[match.currentInningsIndex];
    const battingTeam = match.currentInningsIndex === 0 ? match.team1 : match.team2;
    const bowlingTeam = match.currentInningsIndex === 0 ? match.team2 : match.team1;

    const striker = currentInn.batters.find((b) => b.playerId === currentInn.currentStrikerId);
    const nonStriker = currentInn.batters.find((b) => b.playerId === currentInn.currentNonStrikerId);
    const bowler = currentInn.bowlers.find((b) => b.playerId === currentInn.currentBowlerId);

    const recentBalls = currentInn.deliveries.slice(-12);

    res.json({
      matchName: match.name,
      ballType: match.ballType,
      status: match.status,
      battingTeam: { name: battingTeam.name, shortName: battingTeam.shortName, color: battingTeam.color },
      bowlingTeam: { name: bowlingTeam.name, shortName: bowlingTeam.shortName, color: bowlingTeam.color },
      score: `${currentInn.totalRuns}/${currentInn.wickets}`,
      overs: currentInn.oversFormatted,
      maxOvers: currentInn.maxOvers,
      target: match.target,
      runsNeeded: match.target ? Math.max(0, match.target - currentInn.totalRuns) : undefined,
      ballsRemaining: match.target ? Math.max(0, match.overs * 6 - currentInn.legalDeliveries) : undefined,
      striker: striker ? { name: striker.name, runs: striker.runs, balls: striker.balls, fours: striker.fours, sixes: striker.sixes } : null,
      nonStriker: nonStriker ? { name: nonStriker.name, runs: nonStriker.runs, balls: nonStriker.balls } : null,
      bowler: bowler ? { name: bowler.name, figures: `${bowler.wickets}/${bowler.runsConceded}`, overs: bowler.overs, economy: bowler.economy } : null,
      recentBalls: recentBalls.map((b) => ({
        label: b.isWicket ? 'W' : b.extraType === 'wide' ? 'Wd' : b.extraType === 'noBall' ? 'Nb' : String(b.runsBat),
        isWicket: b.isWicket,
        isBoundary: b.runsBat === 4 || b.runsBat === 6,
      })),
      result: match.result?.summaryText,
    });
  });

  // Source Code ZIP Export Endpoint
  const publicDir = path.resolve(__dirname, 'public');
  app.use(express.static(publicDir));
  app.get(
    [
      '/api/export-source-zip',
      '/api/download-project-zip',
      '/cricket-live-score-complete-project.zip',
      '/kpl-cricket-live-score-source.zip',
    ],
    (req: Request, res: Response) => {
      const zipPath = path.resolve(publicDir, 'cricket-live-score-complete-project.zip');
      const fallbackZip = path.resolve(publicDir, 'kpl-cricket-live-score-source.zip');
      const fileToSend = fs.existsSync(zipPath) ? zipPath : fallbackZip;

      if (fs.existsSync(fileToSend)) {
        res.setHeader('Content-Type', 'application/zip');
        res.download(fileToSend, 'cricket-live-score-complete-project.zip');
      } else {
        res.status(404).json({ error: 'Source code ZIP is being generated. Please retry in a few seconds.' });
      }
    }
  );

  // Mount Vite or static server
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏏 Universal Cricket Live Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Universal Cricket Live Server:', err);
  process.exit(1);
});
