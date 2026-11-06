import type { Express, Request, Response, RequestHandler } from 'express';
import type {
  AppDatabase,
  AuctionPlayer,
  AuctionRules,
  AuctionState,
  Player,
  Team,
} from '../types/cricket.js';
import {
  DEFAULT_AUCTION_RULES,
  auctionPhotoUrl,
  bidIncrement,
  createEmptyAuction,
  deriveShortName,
  eligiblePlayers,
  normalizePlayerType,
  normalizeRole,
  teamColorFor,
  teamStats,
} from '../utils/auction.js';

export interface PhotoStore {
  save(id: string, data: Buffer, contentType: string): Promise<void>;
  load(id: string): Promise<{ data: Buffer; contentType: string } | null>;
  remove(id: string): Promise<void>;
}

export interface AuctionRouteContext {
  getDb: () => AppDatabase;
  /** Persist + notify live viewers */
  commit: () => void;
  requireAdmin: RequestHandler;
  photos: PhotoStore;
}

const MAX_PHOTO_BYTES = 700_000;
const str = (v: unknown, max = 120) => String(v ?? '').trim().slice(0, max);
const num = (v: unknown) => {
  const text = String(v ?? '').replace(/[₹,\s]/g, '');
  if (text === '') return undefined; // Number('') is 0: treat a missing value as missing
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * In-app player auction: players & teams (incl. Excel import), live bidding, sold/unsold records,
 * purse rules. Sold, owner and icon players are mirrored into the app's teams and players.
 */
export function registerAuctionRoutes(app: Express, ctx: AuctionRouteContext) {
  const { requireAdmin } = ctx;

  const auctionOf = (): AuctionState => {
    const db = ctx.getDb();
    if (!db.auction) db.auction = createEmptyAuction();
    // Fill rules added in later versions
    db.auction.rules = { ...DEFAULT_AUCTION_RULES, ...db.auction.rules };
    if (!db.auction.live.history) db.auction.live.history = [];
    return db.auction;
  };

  const touch = (a: AuctionState) => {
    a.updatedAt = Date.now();
    a.live.updatedAt = a.updatedAt;
    ctx.commit();
  };

  const fail = (res: Response, status: number, error: string) => res.status(status).json({ error });

  // ---------- Mirror auction players into app players / team squads ----------
  function syncAppPlayer(p: AuctionPlayer) {
    const db = ctx.getDb();
    const a = auctionOf();
    const record = a.records[p.id];
    const teamId = p.playerType !== 'auction' ? p.teamId : record?.status === 'SOLD' ? record.teamId : undefined;
    const team = teamId ? db.teams[teamId] : undefined;
    const existing = db.players[p.id];
    const role: Player['role'] =
      p.role === 'Batsman' ? 'batter' : p.role === 'Bowler' ? 'bowler' : p.role === 'Wicketkeeper' ? 'wicket_keeper' : 'all_rounder';

    const appPlayer: Player = {
      ...(existing || {
        battingStyle: 'right_hand',
        bowlingStyle: 'right_arm_medium',
        careerStats: {
          matches: 0, innings: 0, runs: 0, balls: 0, highestScore: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0,
          wickets: 0, oversBowled: 0, runsConceded: 0, maidens: 0, bestBowling: '0/0', catches: 0, runOuts: 0,
          stumpings: 0, mvpPoints: 0,
        },
      }),
      id: p.id,
      name: p.name,
      role,
      teamId: team?.id,
      avatarUrl: auctionPhotoUrl(p),
      basePrice: p.base,
      auctionStatus: p.playerType !== 'auction' ? 'SOLD' : record?.status || 'UPCOMING',
      soldPrice: record?.status === 'SOLD' ? record.price : 0,
      soldToTeamId: team?.id,
      soldToTeamName: team?.name,
    } as Player;
    db.players[p.id] = appPlayer;

    for (const t of Object.values(db.teams)) {
      const before = t.squad.length;
      t.squad = t.squad.filter((sp) => sp.id !== p.id);
      if (t.id === team?.id) t.squad.push(appPlayer);
      else if (before !== t.squad.length) {
        // removed from a previous team
      }
    }
  }

  function removeAppPlayer(id: string) {
    const db = ctx.getDb();
    delete db.players[id];
    for (const t of Object.values(db.teams)) t.squad = t.squad.filter((sp) => sp.id !== id);
  }

  function findOrCreateTeam(nameRaw: string, extra?: { shortName?: string; color?: string }): { team: Team; created: boolean } {
    const db = ctx.getDb();
    const a = auctionOf();
    const name = str(nameRaw, 60);
    const lower = name.toLowerCase();
    let team = Object.values(db.teams).find(
      (t) => t.name.toLowerCase() === lower || t.shortName.toLowerCase() === lower
    );
    let created = false;
    if (!team) {
      team = {
        id: newId('t'),
        name,
        shortName: str(extra?.shortName, 6).toUpperCase() || deriveShortName(name),
        color: str(extra?.color, 20) || teamColorFor(a.teamIds.length),
        squad: [],
      };
      db.teams[team.id] = team;
      created = true;
    } else {
      if (extra?.shortName) team.shortName = str(extra.shortName, 6).toUpperCase();
      if (extra?.color) team.color = str(extra.color, 20);
    }
    if (!a.teamIds.includes(team.id)) a.teamIds.push(team.id);
    return { team, created };
  }

  function resolveTeamId(value: unknown): string | undefined {
    const v = str(value, 60);
    if (!v) return undefined;
    const db = ctx.getDb();
    if (db.teams[v]) return v;
    return findOrCreateTeam(v).team.id;
  }

  function buildPlayer(input: any, existing?: AuctionPlayer): AuctionPlayer {
    const playerType = input.playerType ? normalizePlayerType(input.playerType) : existing?.playerType || 'auction';
    return {
      id: existing?.id || newId('ap'),
      number: str(input.number ?? existing?.number, 12),
      name: str(input.name ?? existing?.name, 80),
      city: input.city !== undefined ? str(input.city, 60) : existing?.city,
      role: input.role !== undefined ? normalizeRole(input.role) : existing?.role || 'All-rounder',
      base: num(input.base) ?? existing?.base ?? auctionOf().rules.minBasePrice,
      playerType,
      teamId: playerType === 'auction' ? undefined : resolveTeamId(input.teamId ?? input.team) ?? existing?.teamId,
      matches: input.matches !== undefined ? num(input.matches) : existing?.matches,
      runs: input.runs !== undefined ? num(input.runs) : existing?.runs,
      wickets: input.wickets !== undefined ? num(input.wickets) : existing?.wickets,
      photoUrl:
        input.photoUrl !== undefined
          ? /^https?:\/\//i.test(str(input.photoUrl, 600))
            ? str(input.photoUrl, 600)
            : undefined
          : existing?.photoUrl,
      photoVersion: existing?.photoVersion,
      createdAt: existing?.createdAt || Date.now(),
    };
  }

  // ==========================================
  // SETTINGS, TEAMS, RULES
  // ==========================================

  app.put('/api/auction/settings', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    if (req.body?.name !== undefined) a.name = str(req.body.name, 80) || a.name;
    if (req.body?.rules) {
      const r = req.body.rules as Partial<AuctionRules>;
      const n = (v: unknown, fallback: number) => num(v) ?? fallback;
      const minPlayers = Math.max(1, n(r.minPlayers, a.rules.minPlayers));
      a.rules = {
        purse: n(r.purse, a.rules.purse),
        balanceMode: r.balanceMode === 'auto' || r.balanceMode === 'topup' ? r.balanceMode : r.balanceMode === 'none' ? 'none' : a.rules.balanceMode,
        fixedDeduction: n(r.fixedDeduction, a.rules.fixedDeduction),
        fixedPlayersPerTeam: n(r.fixedPlayersPerTeam, a.rules.fixedPlayersPerTeam),
        minPlayers,
        maxPlayers: Math.max(minPlayers, n(r.maxPlayers, a.rules.maxPlayers)),
        minBasePrice: n(r.minBasePrice, a.rules.minBasePrice),
        bonusTrigger: n(r.bonusTrigger, a.rules.bonusTrigger),
        bonusAmount: n(r.bonusAmount, a.rules.bonusAmount),
        incrementMode: r.incrementMode === 'manual' ? 'manual' : r.incrementMode === 'auto' ? 'auto' : a.rules.incrementMode,
        manualIncrement: Math.max(1, n(r.manualIncrement, a.rules.manualIncrement)),
      };
    }
    touch(a);
    res.json(a);
  });

  // Replace the auction's team list (create / rename / recolor)
  app.put('/api/auction/teams', requireAdmin, (req: Request, res: Response) => {
    const db = ctx.getDb();
    const a = auctionOf();
    const list = Array.isArray(req.body?.teams) ? req.body.teams : null;
    if (!list) return fail(res, 400, 'teams must be a list');
    const ids: string[] = [];
    for (const [i, t] of list.entries()) {
      const name = str(t?.name, 60);
      if (!name) continue;
      if (t.id && db.teams[t.id]) {
        const team = db.teams[t.id];
        team.name = name;
        team.shortName = str(t.shortName, 6).toUpperCase() || team.shortName || deriveShortName(name);
        team.color = str(t.color, 20) || team.color || teamColorFor(i);
        ids.push(team.id);
      } else {
        const team: Team = {
          id: newId('t'),
          name,
          shortName: str(t.shortName, 6).toUpperCase() || deriveShortName(name),
          color: str(t.color, 20) || teamColorFor(i),
          squad: [],
        };
        db.teams[team.id] = team;
        ids.push(team.id);
      }
    }
    const removedWithPlayers = a.teamIds.filter(
      (id) =>
        !ids.includes(id) &&
        (Object.values(a.records).some((r) => r.teamId === id) || Object.values(a.players).some((p) => p.teamId === id))
    );
    if (removedWithPlayers.length) {
      return fail(res, 400, `Can't remove ${removedWithPlayers.map((id) => db.teams[id]?.name).join(', ')}: it already has players.`);
    }
    a.teamIds = ids;
    touch(a);
    res.json(a);
  });

  app.post('/api/auction/topup', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const teamId = str(req.body?.teamId, 60);
    const amount = Math.floor(Number(req.body?.amount) || 0);
    if (!a.teamIds.includes(teamId)) return fail(res, 400, 'Pick a team');
    if (a.rules.balanceMode !== 'topup') return fail(res, 400, 'Switch the balance mode to Manual Top-Up first.');
    if (amount === 0 || Math.abs(amount) > 10_000_000) return fail(res, 400, 'Enter an amount');
    a.topups[teamId] = (a.topups[teamId] || 0) + amount;
    touch(a);
    res.json(a);
  });

  // ==========================================
  // PLAYERS (+ photos)
  // ==========================================

  app.post('/api/auction/players', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const existing = req.body?.id ? a.players[req.body.id] : undefined;
    const p = buildPlayer(req.body || {}, existing);
    if (!p.name || !p.number) return fail(res, 400, 'Name and player number are required.');
    if (p.playerType !== 'auction' && !p.teamId) return fail(res, 400, 'Owner and icon players need a team.');
    if (Object.values(a.players).some((x) => x.number === p.number && x.id !== p.id)) {
      return fail(res, 400, `Player number ${p.number} is already used.`);
    }
    if (p.playerType !== 'auction') delete a.records[p.id];
    a.players[p.id] = p;
    syncAppPlayer(p);
    touch(a);
    res.json(p);
  });

  app.delete('/api/auction/players/:id', requireAdmin, async (req: Request, res: Response) => {
    const a = auctionOf();
    const p = a.players[req.params.id];
    if (!p) return fail(res, 404, 'Player not found');
    delete a.players[p.id];
    delete a.records[p.id];
    if (a.live.currentPlayerId === p.id) a.live = { bid: 0, presentation: 'idle', history: [], updatedAt: Date.now() };
    removeAppPlayer(p.id);
    if (p.photoVersion) await ctx.photos.remove(p.id).catch(() => {});
    touch(a);
    res.json({ ok: true });
  });

  app.post('/api/auction/players/:id/photo', requireAdmin, async (req: Request, res: Response) => {
    const a = auctionOf();
    const p = a.players[req.params.id];
    if (!p) return fail(res, 404, 'Player not found');
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
    if (!match) return fail(res, 400, 'Send the photo as a JPEG/PNG/WebP data URL.');
    const data = Buffer.from(match[2], 'base64');
    if (data.length > MAX_PHOTO_BYTES) return fail(res, 413, 'Photo is too large. Use a smaller image.');
    await ctx.photos.save(p.id, data, match[1]);
    p.photoVersion = Date.now();
    syncAppPlayer(p);
    touch(a);
    res.json(p);
  });

  app.get('/api/auction/photos/:id', async (req: Request, res: Response) => {
    const photo = await ctx.photos.load(req.params.id).catch(() => null);
    if (!photo) return res.status(404).end();
    res.setHeader('Content-Type', photo.contentType);
    // Versioned URL (?v=...), so it can be cached for a long time
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(photo.data);
  });

  // Bulk import from Excel / CSV / backup JSON (parsed in the browser)
  app.post('/api/auction/import', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const teamsIn: any[] = Array.isArray(req.body?.teams) ? req.body.teams.slice(0, 64) : [];
    const playersIn: any[] = Array.isArray(req.body?.players) ? req.body.players.slice(0, 2000) : [];
    const replace = Boolean(req.body?.replace);
    const summary = { teamsCreated: 0, teamsUpdated: 0, playersCreated: 0, playersUpdated: 0, skipped: [] as { row: number; reason: string }[], idMap: {} as Record<string, string> };

    if (req.body?.name) a.name = str(req.body.name, 80) || a.name;
    if (req.body?.rules && typeof req.body.rules === 'object') {
      a.rules = { ...a.rules, ...sanitizeRules(req.body.rules, a.rules) };
    }

    if (replace) {
      for (const id of Object.keys(a.players)) removeAppPlayer(id);
      a.players = {};
      a.records = {};
      a.topups = {};
      a.reAuctionStarted = false;
      a.live = { bid: 0, presentation: 'idle', history: [], updatedAt: Date.now() };
    }

    for (const t of teamsIn) {
      const name = str(t?.name, 60);
      if (!name) continue;
      const { created } = findOrCreateTeam(name, { shortName: t.shortName, color: t.color });
      if (created) summary.teamsCreated++;
      else summary.teamsUpdated++;
    }

    const byNumber = new Map(Object.values(a.players).map((p) => [p.number, p]));
    playersIn.forEach((row, i) => {
      const rowNo = Number(row?._row) || i + 2;
      const name = str(row?.name, 80);
      const number = str(row?.number, 12);
      if (!name) return summary.skipped.push({ row: rowNo, reason: 'Missing name' });
      if (!number) return summary.skipped.push({ row: rowNo, reason: `Missing player number for ${name}` });
      const type = normalizePlayerType(row.playerType);
      const teamName = str(row.teamId ?? row.team, 60);
      if (type !== 'auction' && !teamName) {
        return summary.skipped.push({ row: rowNo, reason: `${name} is ${type} but has no team` });
      }
      const existing = byNumber.get(number);
      const before = Object.keys(ctx.getDb().teams).length;
      const p = buildPlayer({ ...row, playerType: type, team: teamName }, existing);
      if (Object.keys(ctx.getDb().teams).length > before) summary.teamsCreated++;
      a.players[p.id] = p;
      byNumber.set(p.number, p);
      if (row?.sourceId) summary.idMap[String(row.sourceId)] = p.id;
      if (existing) summary.playersUpdated++;
      else summary.playersCreated++;

      // Records from a previous tool's backup
      if (row?.record && type === 'auction') {
        const status = row.record.status === 'SOLD' ? 'SOLD' : row.record.status === 'UNSOLD' ? 'UNSOLD' : null;
        if (status) {
          const teamId = status === 'SOLD' ? resolveTeamId(row.record.team) : undefined;
          if (status === 'UNSOLD' || teamId) {
            a.records[p.id] = {
              playerId: p.id,
              status,
              teamId,
              price: status === 'SOLD' ? num(row.record.price) ?? p.base : 0,
              round: row.record.round === 2 ? 2 : 1,
              at: Date.now(),
            };
          }
        }
      }
      syncAppPlayer(p);
    });
    if (typeof req.body?.reAuctionStarted === 'boolean') a.reAuctionStarted = req.body.reAuctionStarted;
    if (req.body?.topups && typeof req.body.topups === 'object') {
      for (const [teamName, amount] of Object.entries(req.body.topups)) {
        const id = resolveTeamId(teamName);
        if (id && num(amount)) a.topups[id] = num(amount)!;
      }
    }

    touch(a);
    res.json({ summary, auction: a });
  });

  function sanitizeRules(r: any, current: AuctionRules): Partial<AuctionRules> {
    const out: Partial<AuctionRules> = {};
    for (const key of ['purse', 'fixedDeduction', 'minPlayers', 'maxPlayers', 'minBasePrice', 'bonusTrigger', 'bonusAmount'] as const) {
      const v = num(r[key]);
      if (v !== undefined) out[key] = v;
    }
    if (['none', 'auto', 'topup'].includes(r.balanceMode)) out.balanceMode = r.balanceMode;
    if ((out.maxPlayers ?? current.maxPlayers) < (out.minPlayers ?? current.minPlayers)) out.maxPlayers = out.minPlayers ?? current.minPlayers;
    return out;
  }

  // ==========================================
  // LIVE AUCTION
  // ==========================================

  app.post('/api/auction/live', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const live = a.live;
    const action = String(req.body?.action || '');
    const current = live.currentPlayerId ? a.players[live.currentPlayerId] : undefined;

    switch (action) {
      case 'shuffle':
        live.presentation = 'shuffling';
        live.currentPlayerId = undefined;
        live.leadingTeamId = undefined;
        live.history = [];
        break;
      case 'select': {
        const p = a.players[String(req.body?.playerId)];
        if (!p) return fail(res, 404, 'Player not found');
        if (p.playerType !== 'auction') return fail(res, 400, `${p.name} is a team ${p.playerType} and isn't auctioned.`);
        live.currentPlayerId = p.id;
        live.bid = p.base;
        live.leadingTeamId = undefined;
        live.history = [];
        const r = a.records[p.id];
        live.presentation = r?.status === 'SOLD' ? 'sold' : 'entry';
        break;
      }
      case 'clear':
        live.currentPlayerId = undefined;
        live.leadingTeamId = undefined;
        live.history = [];
        live.bid = 0;
        live.presentation = 'idle';
        break;
      case 'start_bidding':
        if (!current) return fail(res, 400, 'Pick a player first.');
        live.presentation = 'bidding';
        break;
      case 'bid': {
        // A team raises: the first bid is at the base price, then by the increment
        if (!current) return fail(res, 400, 'Pick a player first.');
        const teamId = str(req.body?.teamId, 60);
        if (!a.teamIds.includes(teamId)) return fail(res, 400, 'Unknown team');
        if (live.leadingTeamId === teamId) return fail(res, 400, 'This team already has the highest bid.');
        const amount = live.leadingTeamId ? live.bid + bidIncrement(live.bid, a.rules) : live.bid;
        const stats = teamStats(a, teamId);
        if (stats.playerCount >= a.rules.maxPlayers) return fail(res, 400, 'This team already has the maximum number of players.');
        if (amount > stats.maxBid && !req.body?.force) {
          return fail(res, 400, `Bid ₹${amount.toLocaleString('en-IN')} is above this team's max bid of ₹${stats.maxBid.toLocaleString('en-IN')}.`);
        }
        live.history = [...live.history, { bid: live.bid, leadingTeamId: live.leadingTeamId }].slice(-30);
        live.bid = amount;
        live.leadingTeamId = teamId;
        live.presentation = 'bidding';
        break;
      }
      case 'set_bid': {
        if (!current) return fail(res, 400, 'Pick a player first.');
        const amount = num(req.body?.bid);
        if (amount === undefined) return fail(res, 400, 'Enter a valid amount');
        live.history = [...live.history, { bid: live.bid, leadingTeamId: live.leadingTeamId }].slice(-30);
        live.bid = amount;
        if (req.body?.teamId !== undefined) {
          const teamId = str(req.body.teamId, 60);
          live.leadingTeamId = a.teamIds.includes(teamId) ? teamId : undefined;
        }
        break;
      }
      case 'undo': {
        const prev = live.history.pop();
        if (!prev) return fail(res, 400, 'Nothing to undo');
        live.bid = prev.bid;
        live.leadingTeamId = prev.leadingTeamId;
        break;
      }
      default:
        return fail(res, 400, 'Unknown action');
    }
    touch(a);
    res.json(a);
  });

  app.post('/api/auction/sell', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const p = a.players[String(req.body?.playerId || a.live.currentPlayerId || '')];
    if (!p) return fail(res, 400, 'Pick a player first.');
    if (p.playerType !== 'auction') return fail(res, 400, 'Owner and icon players are not auctioned.');
    const teamId = str(req.body?.teamId ?? a.live.leadingTeamId, 60);
    if (!a.teamIds.includes(teamId)) return fail(res, 400, 'Pick the winning team.');
    const price = num(req.body?.price) ?? a.live.bid ?? p.base;
    const previous = a.records[p.id];
    if (a.reAuctionStarted && !(previous?.status === 'UNSOLD' && previous.round === 1) && previous?.status !== 'SOLD') {
      return fail(res, 400, 'This player is not part of the re-auction.');
    }
    if (previous?.status !== 'SOLD' || previous.teamId !== teamId) {
      const stats = teamStats(a, teamId);
      if (stats.playerCount >= a.rules.maxPlayers) return fail(res, 400, 'This team already has the maximum number of players.');
    }
    a.records[p.id] = { playerId: p.id, status: 'SOLD', teamId, price, round: a.reAuctionStarted ? 2 : 1, at: Date.now() };
    a.live.currentPlayerId = p.id;
    a.live.bid = price;
    a.live.leadingTeamId = teamId;
    a.live.presentation = 'sold';
    syncAppPlayer(p);
    touch(a);
    res.json(a);
  });

  app.post('/api/auction/unsold', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const p = a.players[String(req.body?.playerId || a.live.currentPlayerId || '')];
    if (!p) return fail(res, 400, 'Pick a player first.');
    if (p.playerType !== 'auction') return fail(res, 400, 'Owner and icon players are not auctioned.');
    const previous = a.records[p.id];
    if (a.reAuctionStarted && !(previous?.status === 'UNSOLD' && previous.round === 1)) {
      return fail(res, 400, 'This player is not part of the re-auction.');
    }
    a.records[p.id] = { playerId: p.id, status: 'UNSOLD', price: 0, round: a.reAuctionStarted ? 2 : 1, at: Date.now() };
    a.live.currentPlayerId = p.id;
    a.live.leadingTeamId = undefined;
    a.live.presentation = 'unsold';
    syncAppPlayer(p);
    touch(a);
    res.json(a);
  });

  // Correct a sold record (team / price)
  app.put('/api/auction/records/:id', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const r = a.records[req.params.id];
    const p = a.players[req.params.id];
    if (!r || !p || r.status !== 'SOLD') return fail(res, 404, 'Sold record not found');
    const teamId = str(req.body?.teamId ?? r.teamId, 60);
    if (!a.teamIds.includes(teamId)) return fail(res, 400, 'Pick a valid team');
    const price = num(req.body?.price) ?? r.price;
    a.records[p.id] = { ...r, teamId, price };
    syncAppPlayer(p);
    touch(a);
    res.json(a);
  });

  // Delete a record: the player goes back to pending
  app.delete('/api/auction/records/:id', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const p = a.players[req.params.id];
    if (!a.records[req.params.id] || !p) return fail(res, 404, 'Record not found');
    delete a.records[p.id];
    if (a.live.currentPlayerId === p.id) a.live.presentation = 'idle';
    syncAppPlayer(p);
    touch(a);
    res.json(a);
  });

  app.post('/api/auction/reauction', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    if (a.reAuctionStarted) return fail(res, 400, 'The one-time re-auction has already been used.');
    const pending = Object.values(a.players).filter((p) => p.playerType === 'auction' && !a.records[p.id]);
    if (pending.length) return fail(res, 400, `Finish the first round first: ${pending.length} player(s) still pending.`);
    a.reAuctionStarted = true;
    if (!eligiblePlayers(a).length) {
      a.reAuctionStarted = false;
      return fail(res, 400, 'There are no unsold players to re-auction.');
    }
    a.live = { bid: 0, presentation: 'idle', history: [], updatedAt: Date.now() };
    touch(a);
    res.json(a);
  });

  // Start over: keep players & teams, clear results (or wipe everything)
  app.post('/api/auction/reset', requireAdmin, (req: Request, res: Response) => {
    const a = auctionOf();
    const wipe = Boolean(req.body?.wipePlayers);
    if (wipe) {
      for (const id of Object.keys(a.players)) removeAppPlayer(id);
      a.players = {};
    }
    a.records = {};
    a.topups = {};
    a.reAuctionStarted = false;
    a.live = { bid: 0, presentation: 'idle', history: [], updatedAt: Date.now() };
    for (const p of Object.values(a.players)) syncAppPlayer(p);
    touch(a);
    res.json(a);
  });
}
