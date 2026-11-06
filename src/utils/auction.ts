import type {
  AuctionPlayer,
  AuctionPlayerType,
  AuctionRecord,
  AuctionRole,
  AuctionRules,
  AuctionState,
} from '../types/cricket.js';

// Pure auction rules shared by the server (authoritative) and the app (display / validation).

export const DEFAULT_AUCTION_RULES: AuctionRules = {
  purse: 100000,
  balanceMode: 'none',
  fixedDeduction: 8000,
  fixedPlayersPerTeam: 4,
  minPlayers: 15,
  maxPlayers: 18,
  minBasePrice: 1000,
  bonusTrigger: 5000,
  bonusAmount: 1000,
  incrementMode: 'auto',
  manualIncrement: 1000,
};

export function createEmptyAuction(name = 'Player Auction'): AuctionState {
  return {
    name,
    teamIds: [],
    players: {},
    records: {},
    rules: { ...DEFAULT_AUCTION_RULES },
    topups: {},
    reAuctionStarted: false,
    live: { bid: 0, presentation: 'idle', history: [], updatedAt: Date.now() },
    updatedAt: Date.now(),
  };
}

export const formatMoney = (n: number | undefined) => '₹' + Number(n || 0).toLocaleString('en-IN');

/** KPL increments: ₹200 below ₹2,000, ₹500 below ₹7,000, then ₹1,000 (or a fixed manual step). */
export function bidIncrement(bid: number, rules: AuctionRules): number {
  if (rules.incrementMode === 'manual') return Math.max(1, rules.manualIncrement || 1000);
  if (bid < 2000) return 200;
  if (bid < 7000) return 500;
  return 1000;
}

/** The bid a team would place next: the base price for the opening bid, otherwise bid + increment. */
export function nextBidAmount(auction: AuctionState): number {
  const { live, rules } = auction;
  if (!live.leadingTeamId) return live.bid;
  return live.bid + bidIncrement(live.bid, rules);
}

export interface TeamAuctionStats {
  teamId: string;
  sold: AuctionRecord[];
  spent: number;
  deduction: number;
  bonus: number;
  topup: number;
  remaining: number;
  maxBid: number;
  /** Fixed (owner + icons) + bought */
  playerCount: number;
  fixedCount: number;
}

export function teamStats(auction: AuctionState, teamId: string): TeamAuctionStats {
  const { rules } = auction;
  const records = Object.values(auction.records);
  const sold = records.filter((r) => r.status === 'SOLD' && r.teamId === teamId);
  const spent = sold.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const registeredFixed = Object.values(auction.players).filter(
    (p) => p.playerType !== 'auction' && p.teamId === teamId
  ).length;
  const fixedCount = registeredFixed || rules.fixedPlayersPerTeam;
  const deduction = Math.min(rules.purse, rules.fixedDeduction || 0);
  const bonus =
    rules.balanceMode === 'auto'
      ? records.filter((r) => r.status === 'SOLD' && r.price >= rules.bonusTrigger && r.teamId !== teamId).length *
        rules.bonusAmount
      : 0;
  const topup = rules.balanceMode === 'topup' ? auction.topups[teamId] || 0 : 0;
  const remaining = rules.purse - deduction + bonus + topup - spent;
  const playerCount = fixedCount + sold.length;
  // Keep enough money to fill the squad to the minimum at the minimum base price
  const stillNeeded = Math.max(0, rules.minPlayers - playerCount - 1);
  const maxBid = playerCount >= rules.maxPlayers ? 0 : Math.max(0, remaining - stillNeeded * (rules.minBasePrice || 0));
  return { teamId, sold, spent, deduction, bonus, topup, remaining, maxBid, playerCount, fixedCount };
}

/** Players that can be called next (first round: never auctioned; re-auction: unsold in round 1). */
export function eligiblePlayers(auction: AuctionState): AuctionPlayer[] {
  return Object.values(auction.players)
    .filter((p) => {
      if (p.playerType !== 'auction') return false;
      const r = auction.records[p.id];
      if (auction.reAuctionStarted) return Boolean(r) && r.status === 'UNSOLD' && r.round === 1;
      return !r;
    })
    .sort((a, b) => compareNumbers(a.number, b.number));
}

export function auctionCounts(auction: AuctionState) {
  const auctionPlayers = Object.values(auction.players).filter((p) => p.playerType === 'auction');
  let sold = 0;
  let unsold = 0;
  for (const p of auctionPlayers) {
    const r = auction.records[p.id];
    if (r?.status === 'SOLD') sold++;
    else if (r?.status === 'UNSOLD') unsold++;
  }
  return { total: auctionPlayers.length, sold, unsold, pending: auctionPlayers.length - sold - unsold };
}

export function compareNumbers(a: string, b: string): number {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b));
}

export function normalizeRole(value: unknown): AuctionRole {
  const v = String(value ?? '').toLowerCase();
  if (v.includes('keep') || v.includes('wk') || v.includes('विकेट')) return 'Wicketkeeper';
  if (v.includes('all') || v.includes('ऑल')) return 'All-rounder';
  if (v.includes('bowl') || v.includes('गेंद')) return 'Bowler';
  if (v.includes('bat') || v.includes('बल्ले')) return 'Batsman';
  return 'All-rounder';
}

export function normalizePlayerType(value: unknown): AuctionPlayerType {
  const v = String(value ?? '').toLowerCase();
  if (v.includes('owner') || v.includes('मालिक')) return 'owner';
  if (v.includes('icon') || v.includes('आइकन')) return 'icon';
  return 'auction';
}

/** "Royal Warriors" -> "RW", "Azad Strikers XI" -> "ASX" */
export function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TEAM';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const TEAM_COLORS = [
  '#0ea5e9', '#f97316', '#22c55e', '#e11d48', '#8b5cf6', '#eab308', '#14b8a6', '#ec4899',
  '#6366f1', '#84cc16', '#f43f5e', '#06b6d4', '#a855f7', '#f59e0b', '#10b981', '#3b82f6',
];
export const teamColorFor = (index: number) => TEAM_COLORS[index % TEAM_COLORS.length];

/** URL for a player's photo (uploaded photo first, then external URL). */
export function auctionPhotoUrl(p: Pick<AuctionPlayer, 'id' | 'photoVersion' | 'photoUrl'>): string | undefined {
  if (p.photoVersion) return `/api/auction/photos/${encodeURIComponent(p.id)}?v=${p.photoVersion}`;
  return p.photoUrl || undefined;
}
