import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { initializeApp as initializeAdminApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import type { AppDatabase, AppUser, BallType, Match, Team, Tournament, Player, UserRole } from './src/types/cricket.js';
import {
  createEmptyInnings,
  editDelivery,
  processDelivery,
  undoLastDelivery,
} from './src/utils/cricketEngine.js';
import { createEmptyDatabase } from './src/utils/emptyDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel the app runs as a serverless function: no writable disk, no long-lived
// connections, no child processes. State then lives in Firestore instead of a JSON file.
const IS_SERVERLESS = Boolean(process.env.VERCEL);
const USE_FIRESTORE_STORE = IS_SERVERLESS || process.env.DATA_STORE === 'firestore';

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'cricket_db.json');

// Ensure data folder exists (local file store only)
if (!USE_FIRESTORE_STORE && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// The founding organizer. Only used to restore an admin if none exists; after that,
// admins add and promote other admins from the Admin Dashboard.
const FOUNDING_ADMIN_EMAIL = 'wasimmakrani531@gmail.com';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Firebase Admin (verifies Google sign-in ID tokens). Credentials come from, in order:
//   1. FIREBASE_SERVICE_ACCOUNT       — the service account JSON as a string (for hosted deploys)
//   2. FIREBASE_SERVICE_ACCOUNT_PATH  — path to the service account JSON file
//   3. secrets/firebase-service-account.json (git-ignored, for local dev)
function loadServiceAccount(): ServiceAccount & { project_id?: string } {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(__dirname, 'secrets', 'firebase-service-account.json');
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Firebase service account not found at ${keyPath}. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH.`
    );
  }
  return JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
}

const serviceAccount = loadServiceAccount();
const adminApp = initializeAdminApp(
  { credential: cert(serviceAccount), projectId: serviceAccount.project_id },
  'azad-live-admin'
);
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp);

// Seeded demo accounts from the old email/password system. Their emails are on domains we don't
// control, so anyone owning those domains could claim them via Google sign-in.
const LEGACY_DEMO_USER_IDS = ['u_admin_demo', 'u_scorer_demo', 'u_viewer_demo'];

// In-memory state with disk persistence
let dbState: AppDatabase;

/** Strips legacy password-auth data so it can never be used or leaked again. */
function migrateLegacyAuth(db: any): AppDatabase {
  delete db.sessions;
  delete db.resetTokens;
  if (!db.users) db.users = {};
  for (const id of LEGACY_DEMO_USER_IDS) delete db.users[id];
  for (const u of Object.values<any>(db.users)) {
    delete u.passwordHash;
    delete u.salt;
    delete u.isMasterAdmin;
  }
  if (!db.auctionSyncMap) db.auctionSyncMap = {};
  return db;
}

function loadDatabase(): AppDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.matches && parsed.teams) {
        const migrated = migrateLegacyAuth(parsed);
        saveDatabase(migrated);
        return migrated;
      }
    } catch (err) {
      console.error('Error reading cricket_db.json, re-initializing seed data:', err);
    }
  }
  const initial = createEmptyDatabase();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(data: AppDatabase) {
  data.lastUpdated = Date.now();
  if (USE_FIRESTORE_STORE) {
    // Written to Firestore before the response is sent (see the /api store middleware)
    stateDirty = true;
    return;
  }
  try {
    // Write to a temp file then rename, so a crash mid-write can't corrupt the database
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error saving cricket_db.json:', err);
  }
}

// ==========================================
// FIRESTORE STATE STORE (serverless / DATA_STORE=firestore)
// ==========================================
// The whole database is one gzipped document (private: only the Admin SDK can read it).
// live_state/current holds just a version number; it's publicly readable so browsers can
// listen to it and re-fetch /api/state when it changes (replaces SSE on serverless).
const STATE_DOC = adminDb.collection('app_state').doc('main');
const LIVE_DOC = adminDb.collection('live_state').doc('current');
const MAX_STATE_BYTES = 1_000_000; // Firestore document limit is ~1 MiB

let stateVersion = -1; // version dbState was loaded at / last saved as (-1 = not loaded)
let stateDirty = false;
let flushChain: Promise<void> = Promise.resolve();

class StateConflictError extends Error {}

async function refreshStateFromFirestore(): Promise<void> {
  if (stateDirty) return; // unsaved local changes are saved first
  const live = await LIVE_DOC.get();
  const remoteVersion = live.exists ? Number(live.get('version')) || 0 : 0;
  if (dbState && remoteVersion === stateVersion) return;

  const snap = await STATE_DOC.get();
  if (stateDirty) return; // another request changed state while we were reading
  if (snap.exists) {
    const json = zlib.gunzipSync(snap.get('data') as Buffer).toString('utf-8');
    dbState = migrateLegacyAuth(JSON.parse(json));
    stateVersion = Number(snap.get('version')) || 0;
  } else {
    console.log('🆕 [AZAD LIVE] No database in Firestore yet, starting with an empty one.');
    dbState = migrateLegacyAuth(createEmptyDatabase());
    stateVersion = 0;
    stateDirty = true;
  }
  ensureFoundingAdmin();
}

/** Saves dbState if it changed. Rejects with StateConflictError if another instance saved first. */
function flushState(): Promise<void> {
  const run = flushChain.then(async () => {
    if (!stateDirty) return;
    stateDirty = false;
    const data = zlib.gzipSync(Buffer.from(JSON.stringify(dbState), 'utf-8'));
    if (data.length > MAX_STATE_BYTES) {
      stateDirty = true;
      throw new Error(`Database is too large for Firestore (${data.length} bytes compressed).`);
    }
    const baseVersion = stateVersion;
    try {
      stateVersion = await adminDb.runTransaction(async (tx) => {
        const live = await tx.get(LIVE_DOC);
        const current = live.exists ? Number(live.get('version')) || 0 : 0;
        if (current !== baseVersion) {
          throw new StateConflictError(`State changed elsewhere (v${current}, expected v${baseVersion})`);
        }
        const version = baseVersion + 1;
        const updatedAt = Date.now();
        tx.set(STATE_DOC, { data, version, updatedAt });
        tx.set(LIVE_DOC, { version, updatedAt });
        return version;
      });
    } catch (err) {
      if (err instanceof StateConflictError) {
        stateVersion = -1; // discard this instance's copy; the next request reloads
      } else {
        stateDirty = true; // keep the change so the next save retries it
      }
      throw err;
    }
  });
  flushChain = run.catch(() => {});
  return run;
}

if (!USE_FIRESTORE_STORE) {
  dbState = loadDatabase();
  ensureFoundingAdmin();
}

/** Guarantees at least one admin exists so the platform can always be managed. */
function ensureFoundingAdmin() {
  if (Object.values(dbState.users).some((u) => u.role === 'admin')) return;
  const existing = Object.values(dbState.users).find((u) => u.email.toLowerCase() === FOUNDING_ADMIN_EMAIL);
  if (existing) {
    existing.role = 'admin';
  } else {
    const id = 'u_founding_admin';
    dbState.users[id] = { id, email: FOUNDING_ADMIN_EMAIL, name: 'Tournament Director', role: 'admin', createdAt: Date.now() };
  }
  saveDatabase(dbState);
  console.log(`🔑 [AZAD LIVE] No admin found. ${FOUNDING_ADMIN_EMAIL} will be admin on their first Google sign-in.`);
}

// Public state sent to every client: user accounts are never included
function getSanitizedDbState(): AppDatabase {
  return {
    ...dbState,
    users: {},
  };
}

function toPublicUser(u: AppUser) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    photoURL: u.photoURL,
    role: u.role,
    isPending: !u.firebaseUid,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    assignedMatchIds: u.assignedMatchIds,
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

// ==========================================
// AUTHENTICATION (Google Sign-In via Firebase)
// ==========================================

/** Verifies the Firebase ID token and requires a verified Google account. */
async function verifyGoogleToken(req: Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.firebase?.sign_in_provider !== 'google.com') return null;
    if (!decoded.email || decoded.email_verified !== true) return null;
    return decoded;
  } catch {
    return null;
  }
}

function findUserByUid(uid: string): AppUser | undefined {
  return Object.values(dbState.users).find((u) => u.firebaseUid === uid);
}

async function getAuthUser(req: Request): Promise<AppUser | null> {
  const decoded = await verifyGoogleToken(req);
  if (!decoded) return null;
  return findUserByUid(decoded.uid) || null;
}

function isAdmin(user: AppUser): boolean {
  return user.role === 'admin';
}

/** Admins can score any match; scorers only the matches an admin assigned to them. */
function canScoreMatch(user: AppUser, matchId: string): boolean {
  if (isAdmin(user)) return true;
  return user.role === 'scorer' && Boolean(user.assignedMatchIds?.includes(matchId));
}

// Auth Middleware: enforces role check on protected routes
function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in with Google to perform this action.',
      });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${user.role}`,
      });
    }
    res.locals.user = user;
    next();
  };
}

// Scoring guard: requires admin, or a scorer assigned to the match in :id
function requireMatchScorer() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in with Google.' });
    }
    if (!dbState.matches[req.params.id]) {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (!canScoreMatch(user, req.params.id)) {
      return res.status(403).json({ error: 'You are not authorized to score this match.' });
    }
    res.locals.user = user;
    next();
  };
}

// Simple fixed-window rate limiter (per IP + bucket)
function rateLimit(bucket: string, maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${bucket}:${req.ip}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
    }
    next();
  };
}

// Fields an admin may change on an existing match / tournament via PUT
const EDITABLE_MATCH_FIELDS = ['name', 'venue', 'date', 'stage', 'status', 'toss', 'oversPerBowler', 'customLogos'] as const;
const EDITABLE_TOURNAMENT_FIELDS = ['name', 'format', 'season', 'ballType', 'overs', 'groups', 'teamIds', 'fixtures', 'status', 'rules'] as const;

function pickFields<T extends object>(body: any, fields: readonly string[]): Partial<T> {
  const picked: any = {};
  if (!body || typeof body !== 'object') return picked;
  for (const f of fields) {
    if (f in body) picked[f] = body[f];
  }
  return picked;
}

/**
 * Builds the Express app with every API route. Used directly by the Vercel function
 * (api/index.ts) and by startServer() for the long-running local / container server.
 */
export async function createApp() {
  const app = express();

  // Trust the first proxy (Vercel / Cloud Run / reverse proxy) so req.ip is the real client IP for rate limiting
  app.set('trust proxy', 1);

  // Firestore store: load the latest state before each API request, and hold the
  // response until any change it made is saved (a serverless instance can be frozen
  // as soon as the response is sent).
  let lastAuctionCatchUp = 0;
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    if (!USE_FIRESTORE_STORE) return next();
    try {
      await refreshStateFromFirestore();
      if (IS_SERVERLESS && Date.now() - lastAuctionCatchUp > 15_000) {
        lastAuctionCatchUp = Date.now();
        await catchUpAuctionFromFirestore();
      }
    } catch (err) {
      console.error('[AZAD LIVE] Could not load state from Firestore:', err);
      return res.status(503).json({ error: 'Database temporarily unavailable. Please retry.' });
    }

    const originalEnd = res.end.bind(res) as (...args: any[]) => Response;
    (res as any).end = (...args: any[]) => {
      if (!stateDirty) return originalEnd(...args);
      flushState().then(
        () => originalEnd(...args),
        (err) => {
          const conflict = err instanceof StateConflictError;
          console.error('[AZAD LIVE] Could not save state:', err);
          if (res.headersSent) return originalEnd(...args);
          const body = JSON.stringify({
            error: conflict
              ? 'Someone else updated the data at the same moment. Please retry.'
              : 'Could not save your change. Please retry.',
          });
          res.statusCode = conflict ? 409 : 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Length', Buffer.byteLength(body));
          originalEnd(body);
        }
      );
      return res;
    };
    next();
  });

  // Live streaming relays video through ffmpeg in a long-running process: not possible on serverless
  if (IS_SERVERLESS) {
    app.use(['/api/stream/start', '/api/stream/chunk', '/api/stream/end'], (req: Request, res: Response) => {
      res.status(501).json({
        error: 'Live streaming to YouTube is not available on this deployment (Vercel can\'t run ffmpeg). Use OBS with the overlay links instead.',
      });
    });
  }

  // Binary streaming chunk ingest middleware
  app.use('/api/stream/chunk', express.raw({ type: '*/*', limit: '50mb' }));
  app.use(express.json({ limit: '10mb' }));

  // Baseline security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Allows the Google sign-in popup to report back to this window
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  // CORS: read-only requests are open (broadcast overlays, external score widgets).
  // Mutating requests are only allowed cross-origin from ALLOWED_ORIGINS.
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
  );
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const isReadOnly = req.method === 'GET' || req.method === 'HEAD';
    const preflightMethod = String(req.headers['access-control-request-method'] || '').toUpperCase();
    const isReadOnlyPreflight = req.method === 'OPTIONS' && (preflightMethod === 'GET' || preflightMethod === 'HEAD');

    if (isReadOnly || isReadOnlyPreflight) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Rate limits (stream chunks are excluded: they arrive every second during a broadcast)
  const writeLimiter = rateLimit('write', 240, 60_000);
  app.use('/api/auth', rateLimit('auth', 30, 60_000));
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.path.startsWith('/stream/chunk')) return next();
    return writeLimiter(req, res, next);
  });

  // SSE Real-Time Sync Endpoint (Public). Not available on serverless: browsers listen to
  // Firestore live_state/current instead (see X-Realtime header on /api/state).
  app.get('/api/live/stream', (req: Request, res: Response) => {
    if (IS_SERVERLESS) {
      return res.status(404).json({ error: 'Live stream not available here; use Firestore live_state.' });
    }
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
    // Tells the browser how to receive live updates: SSE (long-running server) or Firestore (serverless)
    res.setHeader('X-Realtime', IS_SERVERLESS ? 'firestore' : 'sse');
    res.setHeader('Cache-Control', 'no-store');
    res.json(getSanitizedDbState());
  });

  // Get specific match (Public)
  app.get('/api/matches/:id', (req: Request, res: Response) => {
    const match = dbState.matches[req.params.id];
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  });

  // ==========================================
  // AUTHENTICATION: GOOGLE SIGN-IN + ROLE-BASED ACCESS
  // ==========================================

  // Exchange a Google (Firebase) ID token for the app user profile.
  // Creates the account on first sign-in. New accounts are viewers unless an admin
  // added their email in advance with a role (see POST /api/admin/users).
  app.post('/api/auth/session', async (req: Request, res: Response) => {
    try {
      const decoded = await verifyGoogleToken(req);
      if (!decoded) {
        return res.status(401).json({ error: 'A verified Google account is required to sign in.' });
      }

      const email = decoded.email!.toLowerCase();
      let user = findUserByUid(decoded.uid);

      if (!user) {
        // Link a pre-existing account (created before Google sign-in) by verified email
        user = Object.values(dbState.users).find((u) => !u.firebaseUid && u.email.toLowerCase() === email);
      }

      if (!user) {
        const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        user = {
          id: userId,
          email,
          name: decoded.name || email.split('@')[0],
          role: 'viewer',
          createdAt: Date.now(),
        };
        dbState.users[userId] = user;
      }

      user.firebaseUid = decoded.uid;
      user.email = email;
      if (decoded.name) user.name = decoded.name;
      if (decoded.picture) user.photoURL = decoded.picture;
      user.lastLoginAt = Date.now();

      saveDatabase(dbState);
      res.json(toPublicUser(user));
    } catch (err: any) {
      console.error('Sign-in error:', err);
      res.status(500).json({ error: 'Sign-in failed. Please try again.' });
    }
  });

  // Get Current Authenticated User (Me)
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(toPublicUser(user));
  });

  // Admin User Management: List all registered users
  app.get('/api/admin/users', requireRole(['admin']), (req: Request, res: Response) => {
    res.json(Object.values(dbState.users).map(toPublicUser));
  });

  // Admin User Management: Add a user by email before they sign in (e.g. invite another admin).
  // The account is linked automatically the first time they sign in with that Google email.
  app.post('/api/admin/users', requireRole(['admin']), (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = req.body?.role as UserRole;
    const name = String(req.body?.name || '').trim().slice(0, 100);

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!['admin', 'scorer', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    if (Object.values(dbState.users).some((u) => u.email.toLowerCase() === email)) {
      return res.status(409).json({ error: 'A user with this email already exists. Change their role in the list instead.' });
    }

    const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newUser: AppUser = { id, email, name: name || email.split('@')[0], role, createdAt: Date.now() };
    dbState.users[id] = newUser;
    saveDatabase(dbState);
    res.status(201).json(toPublicUser(newUser));
  });

  // Admin User Management: Remove a user
  app.delete('/api/admin/users/:id', requireRole(['admin']), (req: Request, res: Response) => {
    const targetUser = dbState.users[req.params.id];
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    const currentUser = res.locals.user as AppUser;
    if (targetUser.id === currentUser.id) {
      return res.status(400).json({ error: 'You cannot remove your own account.' });
    }
    if (targetUser.role === 'admin') {
      const adminCount = Object.values(dbState.users).filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last remaining Admin account.' });
      }
    }
    delete dbState.users[targetUser.id];
    saveDatabase(dbState);
    res.json({ success: true });
  });

  // Admin User Management: Update a user's role or assign matches
  app.put('/api/admin/users/:id/role', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const targetUser = dbState.users[req.params.id];
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      const { role, assignedMatchIds } = req.body;

      if (role !== undefined && !['admin', 'scorer', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role.' });
      }

      if (targetUser.role === 'admin' && role && role !== 'admin') {
        // Prevent demoting the last remaining admin
        const adminCount = Object.values(dbState.users).filter((u) => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last remaining Admin account.' });
        }
      }

      if (role) {
        targetUser.role = role;
      }
      if (Array.isArray(assignedMatchIds)) {
        targetUser.assignedMatchIds = assignedMatchIds.filter(
          (id: unknown) => typeof id === 'string' && Boolean(dbState.matches[id])
        );
      }

      saveDatabase(dbState);
      res.json(toPublicUser(targetUser));
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

  // Record delivery - Protected (Admin or Assigned Scorer)
  app.post('/api/matches/:id/delivery', requireMatchScorer(), (req: Request, res: Response) => {
    try {
      const match = dbState.matches[req.params.id];

      const updatedMatch = processDelivery(match, req.body);
      dbState.matches[match.id] = updatedMatch;

      broadcastStateUpdate();
      res.json(updatedMatch);
    } catch (err: any) {
      console.error('Error processing delivery:', err);
      res.status(400).json({ error: err.message || 'Scoring error' });
    }
  });

  // Undo delivery - Protected (Admin or Assigned Scorer)
  app.post('/api/matches/:id/undo', requireMatchScorer(), (req: Request, res: Response) => {
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

  // Edit delivery - Protected (Admin or Assigned Scorer)
  app.post('/api/matches/:id/edit-delivery', requireMatchScorer(), (req: Request, res: Response) => {
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

  // Switch to 2nd innings - Protected (Admin or Assigned Scorer)
  app.post('/api/matches/:id/start-second-innings', requireMatchScorer(), (req: Request, res: Response) => {
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

  // Reopen match - Protected (Admin or Assigned Scorer)
  app.post('/api/matches/:id/reopen', requireMatchScorer(), (req: Request, res: Response) => {
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

      Object.assign(match, pickFields<Match>(req.body, EDITABLE_MATCH_FIELDS), { updatedAt: Date.now() });
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
      Object.assign(t, pickFields<Tournament>(req.body, EDITABLE_TOURNAMENT_FIELDS), { updatedAt: Date.now() });
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

  // ==========================================
  // RESILIENT AUCTION SQUAD SYNCHRONIZATION
  // ==========================================

  interface AuctionSyncInput {
    id?: string;
    name?: string;
    category?: string;
    role?: string;
    teamId?: string;
    teamName?: string;
    team?: any;
    soldPrice?: number;
    basePrice?: number;
    status: 'SOLD' | 'UNSOLD' | 'IN_AUCTION' | 'UPCOMING';
    number?: string | number;
    updatedAt?: number;
  }

  interface AuctionSyncResult {
    success: boolean;
    skipped?: boolean;
    reason?: string;
    error?: string;
    playerId?: string;
    player?: Player;
    teamName?: string;
    teamId?: string;
    status?: string;
  }

  function applyAuctionSync(input: AuctionSyncInput, source: 'api' | 'firestore_listener'): AuctionSyncResult {
    if (!dbState.auctionSyncMap) dbState.auctionSyncMap = {};

    const { id, name, category, role, teamId, teamName, team: rawTeam, soldPrice, basePrice, status, number, updatedAt } = input;
    if (!name && !id) {
      return { success: false, error: 'Player name or ID is required.' };
    }

    const playerId = String(id || (number ? `p_num_${number}` : `p_${String(name).replace(/\s+/g, '_').toLowerCase()}`));
    const eventTime = Number(updatedAt) || Date.now();

    const lastSync = dbState.auctionSyncMap[playerId];

    // 1. Stale event protection: reject if a newer event was already processed
    if (lastSync && lastSync.updatedAt && eventTime < lastSync.updatedAt) {
      console.log(`[Auction Sync - ${source}] Skipped stale event for player ${playerId} (incoming: ${eventTime}, recorded: ${lastSync.updatedAt})`);
      return { success: true, skipped: true, reason: `Stale event rejected: newer record already processed for player ${playerId}` };
    }

    // 2. Handle UNSOLD status
    if (status === 'UNSOLD') {
      if (lastSync && lastSync.status === 'UNSOLD') {
        return { success: true, skipped: true, reason: 'Player is already UNSOLD (idempotent)' };
      }

      // Remove strictly this player from all team squads (preserves all other players)
      Object.values(dbState.teams).forEach((t) => {
        t.squad = t.squad.filter((p) => p.id !== playerId);
      });

      // Remove strictly this player from matches squad rosters
      Object.values(dbState.matches).forEach((match) => {
        match.team1.squad = match.team1.squad.filter((p) => p.id !== playerId);
        match.team2.squad = match.team2.squad.filter((p) => p.id !== playerId);
      });

      if (dbState.players[playerId]) {
        dbState.players[playerId].auctionStatus = 'UNSOLD';
        dbState.players[playerId].teamId = undefined;
        dbState.players[playerId].soldPrice = 0;
      }

      dbState.auctionSyncMap[playerId] = {
        status: 'UNSOLD',
        updatedAt: eventTime,
      };

      broadcastStateUpdate();
      console.log(`[Auction Sync - ${source}] Player ${playerId} (${name || ''}) marked UNSOLD and removed from all squads.`);
      return { success: true, status: 'UNSOLD', playerId };
    }

    // 3. For SOLD status: Validate team strictly (NO silent fallback)
    const searchTeamName = (teamName || (typeof rawTeam === 'string' ? rawTeam : rawTeam?.name) || '').trim();
    let targetTeam = teamId ? dbState.teams[teamId] : undefined;

    if (!targetTeam && searchTeamName) {
      targetTeam = Object.values(dbState.teams).find(
        (t) =>
          t.name.toLowerCase() === searchTeamName.toLowerCase() ||
          t.shortName.toLowerCase() === searchTeamName.toLowerCase() ||
          t.id.toLowerCase() === searchTeamName.toLowerCase()
      );
    }

    if (!targetTeam) {
      const errorMsg = `Invalid team: Neither teamId "${teamId}" nor teamName "${searchTeamName}" exists in AZAD LIVE database.`;
      console.warn(`[Auction Sync - ${source}] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const resolvedTeamId = targetTeam.id;
    const resolvedTeamName = targetTeam.name;
    const resolvedPrice = Number(soldPrice || 0);

    // 4. Idempotency check: if already SOLD to this exact team for the exact price, skip redundant mutation
    if (
      lastSync &&
      lastSync.status === 'SOLD' &&
      lastSync.teamId === resolvedTeamId &&
      lastSync.soldPrice === resolvedPrice
    ) {
      return { success: true, skipped: true, reason: 'Player already assigned to this team for this price (idempotent)' };
    }

    // 5. Build updated player object
    let playerRole: Player['role'] = 'all_rounder';
    const cat = (category || role || '').toLowerCase();
    if (cat.includes('bat')) playerRole = 'batter';
    else if (cat.includes('bowl')) playerRole = 'bowler';
    else if (cat.includes('keeper') || cat.includes('wk')) playerRole = 'wicket_keeper';

    const existingPlayer = dbState.players[playerId];
    const playerObj: Player = {
      id: playerId,
      name: String(name || existingPlayer?.name || 'Player'),
      teamId: resolvedTeamId,
      role: playerRole,
      battingStyle: existingPlayer?.battingStyle || 'right_hand',
      bowlingStyle: existingPlayer?.bowlingStyle || 'right_arm_medium',
      auctionStatus: 'SOLD',
      soldPrice: resolvedPrice,
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

    // 6. Save in global players catalog
    dbState.players[playerId] = playerObj;

    // 7. Team transfer / deduplication: remove strictly this player from all other teams
    Object.values(dbState.teams).forEach((t) => {
      if (t.id !== resolvedTeamId) {
        t.squad = t.squad.filter((p) => p.id !== playerId);
      }
    });

    // 8. Add or update inside target team squad (never duplicate)
    const existingIdx = targetTeam.squad.findIndex((p) => p.id === playerId);
    if (existingIdx >= 0) {
      targetTeam.squad[existingIdx] = playerObj;
    } else {
      targetTeam.squad.push(playerObj);
    }

    // 9. Update existing matches where this team is playing (keeps active deliveries & playing XI safe)
    Object.values(dbState.matches).forEach((match) => {
      if (match.team1.id === resolvedTeamId) {
        const idx = match.team1.squad.findIndex((p) => p.id === playerId);
        if (idx >= 0) match.team1.squad[idx] = playerObj;
        else match.team1.squad.push(playerObj);
      } else {
        match.team1.squad = match.team1.squad.filter((p) => p.id !== playerId);
      }

      if (match.team2.id === resolvedTeamId) {
        const idx = match.team2.squad.findIndex((p) => p.id === playerId);
        if (idx >= 0) match.team2.squad[idx] = playerObj;
        else match.team2.squad.push(playerObj);
      } else {
        match.team2.squad = match.team2.squad.filter((p) => p.id !== playerId);
      }
    });

    // 10. Persist sync record for cross-session idempotency
    dbState.auctionSyncMap[playerId] = {
      status: 'SOLD',
      teamId: resolvedTeamId,
      soldPrice: resolvedPrice,
      updatedAt: eventTime,
    };

    broadcastStateUpdate();
    console.log(`[Auction Sync - ${source}] Player ${playerId} (${name}) synced to ${resolvedTeamName} for ₹${resolvedPrice}`);
    return { success: true, player: playerObj, teamName: resolvedTeamName, teamId: resolvedTeamId };
  }

  // Dedicated Auction Squad Sync Endpoint (Protected: Strictly Organizer / Admin only)
  // Rejects unauthenticated users, scorers, and viewers
  app.post('/api/auction/sync-sold-player', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const result = applyAuctionSync(req.body, 'api');
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // SYSTEM & BACKUP (Protected: Admin only)
  // ==========================================

  app.get('/api/backup/export', requireRole(['admin']), (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=cricket_backup_${Date.now()}.json`);
    res.json(getSanitizedDbState());
  });

  app.post('/api/backup/import', requireRole(['admin']), (req: Request, res: Response) => {
    try {
      const imported = req.body;
      if (imported && imported.matches && imported.teams) {
        // Accounts are never imported: backups don't contain them, and importing them would allow role tampering
        dbState = migrateLegacyAuth({ ...imported, users: dbState.users });
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

  // =========================================================================
  // AZAD LIVE DIRECT MOBILE LIVE STREAMING & YOUTUBE RTMPS RELAY SYSTEM
  // =========================================================================

  interface ServerStreamSession {
    sessionId: string;
    matchId: string;
    ownerUserId: string;
    streamKey?: string;
    quality: string;
    startedAt: number;
    ffmpegProcess?: any;
    bytesReceived: number;
    chunksReceived: number;
    lastChunkTimestamp: number;
    status: 'live' | 'ended' | 'error';
    isTestMode: boolean;
    error?: string;
  }

  const activeServerStreamSessions = new Map<string, ServerStreamSession>();

  // 1. Start Stream Session & Spawn FFmpeg RTMPS Relay to YouTube (Protected)
  app.post('/api/stream/start', async (req: Request, res: Response) => {
    try {
      const { matchId, streamKey, quality, youtubeBroadcastId } = req.body;

      if (!matchId || typeof matchId !== 'string' || !dbState.matches[matchId]) {
        return res.status(404).json({ error: 'Match not found. Please select a valid cricket match.' });
      }

      // Organizer Authorization Check
      const authUser = await getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: 'Authentication required. Please sign in with Google before starting a broadcast.' });
      }

      if (!canScoreMatch(authUser, matchId)) {
        return res.status(403).json({
          error: 'Permission denied: Only the authorized Tournament Organizer or Scorer can broadcast live.',
        });
      }

      const trimmedKey = (streamKey || '').trim();
      const isTestMode = !trimmedKey;

      // Validate stream key format (prevent shell injection or malformed RTMPS URL)
      if (!isTestMode) {
        if (trimmedKey.length > 128 || !/^[a-zA-Z0-9\-_]+$/.test(trimmedKey)) {
          return res.status(400).json({ error: 'Invalid YouTube stream key format.' });
        }
      }

      const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let ffmpegProcess: any = null;

      if (!isTestMode) {
        const rtmpsUrl = `rtmps://a.rtmps.youtube.com/live2/${trimmedKey}`;
        console.log(`📡 [AZAD LIVE] Launching FFmpeg YouTube RTMPS Relay for match ${matchId} (Session: ${sessionId})...`);

        // FFmpeg transcode & remux pipeline from stdin WebM/MP4 stream to YouTube FLV
        const ffmpegArgs = [
          '-loglevel', 'warning',
          '-re',
          '-i', 'pipe:0',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-f', 'flv',
          rtmpsUrl,
        ];

        try {
          ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          ffmpegProcess.stderr?.on('data', (data: Buffer) => {
            const msg = data.toString();
            if (msg.toLowerCase().includes('error')) {
              console.warn(`⚠️ [AZAD LIVE FFmpeg Warning] ${msg}`);
            }
          });

          ffmpegProcess.on('exit', (code: number, signal: string) => {
            console.log(`📡 [AZAD LIVE] FFmpeg stream session ${sessionId} exited (code: ${code}, signal: ${signal})`);
            const s = activeServerStreamSessions.get(sessionId);
            if (s && s.status === 'live') {
              s.status = 'ended';
            }
          });

          ffmpegProcess.on('error', (err: any) => {
            console.error(`❌ [AZAD LIVE FFmpeg Process Error]:`, err);
            const s = activeServerStreamSessions.get(sessionId);
            if (s) {
              s.status = 'error';
              s.error = err.message;
            }
          });
        } catch (spawnErr: any) {
          console.error('Failed to spawn FFmpeg process:', spawnErr);
          return res.status(500).json({ error: `FFmpeg launch failed: ${spawnErr.message}` });
        }
      } else {
        console.log(`📡 [AZAD LIVE] Ingest test / rehearsal mode started (Session: ${sessionId}).`);
      }

      const sessionObj: ServerStreamSession = {
        sessionId,
        matchId,
        ownerUserId: authUser.id,
        streamKey: trimmedKey || undefined,
        quality: quality || '720p',
        startedAt: Date.now(),
        ffmpegProcess,
        bytesReceived: 0,
        chunksReceived: 0,
        lastChunkTimestamp: Date.now(),
        status: 'live',
        isTestMode,
      };

      activeServerStreamSessions.set(sessionId, sessionObj);

      const watchUrl = youtubeBroadcastId
        ? `https://www.youtube.com/watch?v=${youtubeBroadcastId}`
        : `https://www.youtube.com/live`;

      res.json({
        success: true,
        sessionId,
        isTestMode,
        watchUrl,
        status: 'live',
        message: isTestMode
          ? 'AZAD LIVE Preview Mode Active: Canvas composite engine and server ingest running. Enter YouTube Stream Key to broadcast live to YouTube channel.'
          : 'AZAD LIVE YouTube Broadcast Active: Relaying composite video and audio to YouTube RTMPS ingest.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Binary Chunk Ingest
  app.post('/api/stream/chunk/:sessionId', async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    const session = activeServerStreamSessions.get(sessionId);
    if (!session || session.status !== 'live') {
      return res.status(404).json({ error: 'Stream session not found or already ended' });
    }
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Authentication required.' });
    if (!isAdmin(authUser) && authUser.id !== session.ownerUserId) {
      return res.status(403).json({ error: 'You are not allowed to send data to this stream session.' });
    }

    const chunkBuffer = req.body;
    if (!chunkBuffer || !Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
      return res.status(400).json({ error: 'Empty or invalid chunk buffer' });
    }

    session.bytesReceived += chunkBuffer.length;
    session.chunksReceived += 1;
    session.lastChunkTimestamp = Date.now();

    if (session.ffmpegProcess && session.ffmpegProcess.stdin && session.ffmpegProcess.stdin.writable) {
      try {
        session.ffmpegProcess.stdin.write(chunkBuffer);
      } catch (writeErr: any) {
        console.warn('Error piping chunk to FFmpeg stdin:', writeErr.message);
      }
    }

    res.json({
      success: true,
      bytesReceived: session.bytesReceived,
      chunksReceived: session.chunksReceived,
    });
  });

  // 3. End Stream Session
  app.post('/api/stream/end/:sessionId', async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    const session = activeServerStreamSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Stream session not found' });
    }
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Authentication required.' });
    if (!isAdmin(authUser) && authUser.id !== session.ownerUserId) {
      return res.status(403).json({ error: 'You are not allowed to end this stream session.' });
    }

    session.status = 'ended';
    if (session.ffmpegProcess) {
      try {
        if (session.ffmpegProcess.stdin && session.ffmpegProcess.stdin.writable) {
          session.ffmpegProcess.stdin.end();
        }
      } catch (e) {}

      setTimeout(() => {
        try {
          session.ffmpegProcess.kill('SIGINT');
        } catch (e) {}
      }, 1000);
    }

    res.json({
      success: true,
      sessionId,
      bytesReceived: session.bytesReceived,
      chunksReceived: session.chunksReceived,
      durationMs: Date.now() - session.startedAt,
      message: 'AZAD LIVE stream ended cleanly',
    });
  });

  // 4. Get Stream Status for Match
  app.get('/api/stream/status/:matchId', (req: Request, res: Response) => {
    const matchId = req.params.matchId;
    const activeSession = Array.from(activeServerStreamSessions.values()).find(
      (s) => s.matchId === matchId && s.status === 'live'
    );

    if (!activeSession) {
      return res.json({ isLive: false });
    }

    res.json({
      isLive: true,
      sessionId: activeSession.sessionId,
      quality: activeSession.quality,
      startedAt: activeSession.startedAt,
      bytesReceived: activeSession.bytesReceived,
      chunksReceived: activeSession.chunksReceived,
      isTestMode: activeSession.isTestMode,
    });
  });

  // 5. Persist Custom Gallery Logos for Match (KPL Tournament, Team 1, Team 2, Sponsors)
  app.post('/api/stream/save-logos', async (req: Request, res: Response) => {
    try {
      const { matchId, logos } = req.body;
      if (!matchId || typeof matchId !== 'string' || !dbState.matches[matchId]) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Organizer Authorization Check
      const authUser = await getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: 'Authentication required. Please sign in with Google first.' });
      }

      if (!isAdmin(authUser)) {
        return res.status(403).json({
          error: 'Permission denied: Only the authorized Tournament Organizer can configure logos.',
        });
      }

      if (!logos || typeof logos !== 'object') {
        return res.status(400).json({ error: 'Invalid logos payload: Object expected.' });
      }

      const match = dbState.matches[matchId];
      const sanitizedLogos: any = { ...(match.customLogos || {}) };

      // Validate and sanitize individual image fields
      const imageFields = ['tournamentLogo', 'team1Logo', 'team2Logo', 'sponsorLogo'] as const;
      for (const field of imageFields) {
        if (field in logos) {
          const val = logos[field];
          if (val === undefined || val === null || val === '') {
            delete sanitizedLogos[field];
          } else if (typeof val === 'string') {
            // Validate size (max 7MB base64) and prefix
            if (val.length > 7 * 1024 * 1024) {
              return res.status(400).json({ error: `${field} exceeds maximum allowed size (5MB).` });
            }
            if (val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://')) {
              sanitizedLogos[field] = val;
            } else {
              return res.status(400).json({ error: `Invalid image format for ${field}.` });
            }
          }
        }
      }

      if ('sponsorTagline' in logos) {
        sanitizedLogos.sponsorTagline = String(logos.sponsorTagline || '').substring(0, 120);
      }
      if ('logoScale' in logos && typeof logos.logoScale === 'number') {
        sanitizedLogos.logoScale = Math.max(0.6, Math.min(2.0, logos.logoScale));
      }
      if ('scoreboardPosition' in logos) {
        sanitizedLogos.scoreboardPosition = logos.scoreboardPosition === 'top' ? 'top' : 'bottom';
      }

      match.customLogos = sanitizedLogos;
      match.updatedAt = Date.now();
      broadcastStateUpdate();

      res.json({ success: true, customLogos: match.customLogos });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  /**
   * Serverless replacement for the auction listener below: applies auction results the
   * HTML auction tool wrote to kpl_auction_players since the last check. Runs at most
   * every 15s per instance, on API requests. applyAuctionSync is idempotent.
   */
  async function catchUpAuctionFromFirestore() {
    const cursor = dbState.auctionSyncCursor || 0;
    const snapshot = await adminDb
      .collection('kpl_auction_players')
      .where('updatedAt', '>', cursor)
      .orderBy('updatedAt')
      .limit(200)
      .get();
    if (snapshot.empty) return;

    let newCursor = cursor;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (data && (data.soldStatus === 'SOLD' || data.soldStatus === 'UNSOLD')) {
        applyAuctionSync(
          {
            id: docSnap.id,
            name: data.name,
            category: data.category,
            teamId: data.teamId,
            teamName: data.teamName,
            soldPrice: data.soldPrice,
            basePrice: data.basePrice,
            status: data.soldStatus,
            updatedAt: data.updatedAt || Date.now(),
          },
          'firestore_listener'
        );
      }
      newCursor = Math.max(newCursor, Number(data?.updatedAt) || 0);
    });
    dbState.auctionSyncCursor = newCursor;
    saveDatabase(dbState);
    try {
      await flushState();
    } catch (err) {
      // Another instance saved first; it (or the next check) will apply these results
      console.warn('[AZAD LIVE] Auction catch-up not saved:', (err as Error).message);
    }
  }

  async function initServerFirestoreAuctionListener() {
    try {
      const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) {
        console.warn('⚠️ [AZAD LIVE] firebase-applet-config.json not found, server Firestore listener disabled.');
        return;
      }
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, collection, onSnapshot } = await import('firebase/firestore');

      const fbApp = initializeApp(config, 'azad-live-server-auction-sync');
      const fbDb = getFirestore(fbApp, config.firestoreDatabaseId);

      let isInitialSnapshot = true;
      console.log('⚡ [AZAD LIVE] Starting Server-Side Firestore Auction Listener on kpl_auction_players...');

      onSnapshot(
        collection(fbDb, 'kpl_auction_players'),
        (snapshot) => {
          if (isInitialSnapshot) {
            // Index existing baseline documents into auctionSyncMap without redundant processing
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as any;
              const pid = docSnap.id;
              if (!dbState.auctionSyncMap) dbState.auctionSyncMap = {};
              if (!dbState.auctionSyncMap[pid]) {
                dbState.auctionSyncMap[pid] = {
                  status: data.soldStatus,
                  teamId: data.teamId,
                  soldPrice: data.soldPrice,
                  updatedAt: data.updatedAt || Date.now(),
                };
              }
            });
            isInitialSnapshot = false;
            console.log(`⚡ [AZAD LIVE] Baseline auction players indexed (${snapshot.size} records). Auto-sync active.`);
            return;
          }

          // Real-time changes from HTML Auction
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const data = change.doc.data() as any;
              const pid = change.doc.id;
              if (data && (data.soldStatus === 'SOLD' || data.soldStatus === 'UNSOLD')) {
                applyAuctionSync(
                  {
                    id: pid,
                    name: data.name,
                    category: data.category,
                    teamId: data.teamId,
                    teamName: data.teamName,
                    soldPrice: data.soldPrice,
                    basePrice: data.basePrice,
                    status: data.soldStatus,
                    updatedAt: data.updatedAt || Date.now(),
                  },
                  'firestore_listener'
                );
              }
            }
          });
        },
        (error) => {
          console.warn('⚠️ [AZAD LIVE] Server Firestore auction listener notice:', error.message);
        }
      );
    } catch (err: any) {
      console.warn('⚠️ [AZAD LIVE] Could not initialize server-side auction listener:', err.message);
    }
  }

  return { app, initServerFirestoreAuctionListener };
}

/** Long-running server (local dev / containers): adds the website and the auction listener. */
async function startServer() {
  const { app, initServerFirestoreAuctionListener } = await createApp();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (USE_FIRESTORE_STORE) {
    await refreshStateFromFirestore();
    await flushState();
  }

  const publicDir = path.resolve(__dirname, 'public');
  app.use(express.static(publicDir));

  // Mount Vite or static server
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
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
    console.log(`🏏 AZAD LIVE Cricket Platform Server running on http://0.0.0.0:${PORT}`);
    console.log(`💾 [AZAD LIVE] Data store: ${USE_FIRESTORE_STORE ? 'Firestore (app_state/main)' : DB_FILE}`);
    initServerFirestoreAuctionListener();
  });
}

// On Vercel, api/index.ts imports createApp() instead of starting a server
if (!IS_SERVERLESS) {
  startServer().catch((err) => {
    console.error('Failed to start AZAD LIVE Cricket Platform Server:', err);
    process.exit(1);
  });
}
