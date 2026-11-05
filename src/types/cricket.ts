export type BallType = 'leather' | 'tennis' | 'light_tennis';

export type MatchFormat = 'T20' | 'ODI' | 'T10' | 'TheHundred' | 'BoxCricket' | 'Custom';

export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'caught_behind'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'retired'
  | 'obstructing'
  | 'handled_ball'
  | 'timed_out';

export type ExtraType = 'none' | 'wide' | 'noBall' | 'bye' | 'legBye' | 'penalty';

export interface Dismissal {
  type: DismissalType;
  playerOutId: string;
  playerOutName: string;
  assistedById?: string; // Fielder for catch, runout, stumping
  assistedByName?: string;
  newBatterId?: string;
  newBatterName?: string;
}

export interface BallDelivery {
  id: string;
  inningsIndex: number; // 0 or 1
  overNumber: number; // 0-based index
  ballInOver: number; // 1 to 6 legal ball count
  bowlerId: string;
  bowlerName: string;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runsBat: number; // 0, 1, 2, 3, 4, 6
  runsExtra: number; // 1 for wide/noball, or byes
  extraType: ExtraType;
  isLegal: boolean; // false for wide, no-ball
  isWicket: boolean;
  dismissal?: Dismissal;
  isBoundaryFour: boolean;
  isBoundarySix: boolean;
  strikeRotated: boolean;
  commentary: string;
  timestamp: number;
}

export interface BatterInningsStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dots: number;
  strikeRate: number;
  isOut: boolean;
  dismissalText: string;
  battingOrder: number;
}

export interface BowlerInningsStats {
  playerId: string;
  name: string;
  ballsBowled: number;
  overs: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  dots: number;
  wides: number;
  noBalls: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  over: string;
  playerOutName: string;
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
  total: number;
}

export interface Innings {
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  wickets: number;
  legalDeliveries: number;
  oversFormatted: string; // e.g. "18.3"
  maxOvers: number;
  maxWickets: number; // e.g. 10
  extras: ExtrasBreakdown;
  deliveries: BallDelivery[];
  batters: BatterInningsStats[];
  bowlers: BowlerInningsStats[];
  currentStrikerId: string;
  currentNonStrikerId: string;
  currentBowlerId: string;
  previousBowlerId?: string;
  fallOfWickets: FallOfWicket[];
  isCompleted: boolean;
  completionReason?: string;
}

export interface Player {
  id: string;
  name: string;
  teamId?: string;
  role: 'batter' | 'bowler' | 'all_rounder' | 'wicket_keeper';
  battingStyle: 'right_hand' | 'left_hand';
  bowlingStyle: 'right_arm_fast' | 'right_arm_medium' | 'right_arm_spin' | 'left_arm_fast' | 'left_arm_spin' | 'none';
  avatarUrl?: string;
  // Auction sync fields
  auctionStatus?: 'UPCOMING' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD';
  soldPrice?: number;
  soldToTeamId?: string;
  soldToTeamName?: string;
  basePrice?: number;
  careerStats: {
    matches: number;
    innings: number;
    runs: number;
    balls: number;
    highestScore: number;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    wickets: number;
    oversBowled: number;
    runsConceded: number;
    maidens: number;
    bestBowling: string;
    catches: number;
    runOuts: number;
    stumpings: number;
    mvpPoints: number;
  };
}

export interface AuctionPlayerRecord {
  id: string;
  name: string;
  category?: string;
  basePrice?: number;
  soldStatus: 'UPCOMING' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD';
  teamId?: string;
  teamName?: string;
  soldPrice?: number;
  updatedAt: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  secondaryColor?: string;
  city?: string;
  logoUrl?: string;
  squad: Player[];
}

export interface TossInfo {
  wonById: string;
  wonByName: string;
  decision: 'bat' | 'bowl';
}

export interface PlayerOfTheMatch {
  playerId: string;
  name: string;
  teamName: string;
  points: number;
  breakdown: {
    batting: number;
    bowling: number;
    fielding: number;
    bonuses: number;
  };
  summary: string;
}

export interface MatchResult {
  winnerId?: string;
  winnerName?: string;
  winMargin: string;
  summaryText: string;
  playerOfTheMatch?: PlayerOfTheMatch;
}

export type MatchStatus = 'upcoming' | 'live' | 'innings_break' | 'completed' | 'abandoned';

export interface Match {
  id: string;
  name: string;
  tournamentId?: string;
  tournamentName?: string;
  stage?: string;
  ballType: BallType;
  overs: number;
  oversPerBowler: number;
  venue: string;
  date: string;
  team1: Team;
  team2: Team;
  toss?: TossInfo;
  innings: [Innings, Innings];
  currentInningsIndex: number; // 0 or 1
  status: MatchStatus;
  target?: number;
  result?: MatchResult;
  isDemo?: boolean;
  customLogos?: CustomStreamLogos;
  createdAt: number;
  updatedAt: number;
}

export interface CustomStreamLogos {
  tournamentLogo?: string; // Data URL or URL for KPL / Tournament logo
  team1Logo?: string;
  team2Logo?: string;
  sponsorLogo?: string;
  sponsorTagline?: string;
  scoreboardPosition?: 'bottom' | 'top';
  logoScale?: number; // 0.8 to 1.5
}

export interface TournamentGroup {
  id: string;
  name: string;
  teamIds: string[];
}

export interface PointsTableEntry {
  teamId: string;
  teamName: string;
  shortName: string;
  color: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsScored: number;
  oversFacedTotal: number; // e.g. 19.4 represented in fractional overs
  runsConceded: number;
  oversBowledTotal: number;
  nrr: number; // Net Run Rate
}

export interface Tournament {
  id: string;
  name: string;
  format: 'league' | 'group_knockout' | 'knockout' | 'custom';
  season: string;
  ballType: BallType;
  overs: number;
  groups: TournamentGroup[];
  teamIds: string[];
  fixtures: string[]; // Match IDs
  status: 'draft' | 'ongoing' | 'completed';
  rules: {
    ptsWin: number;
    ptsTie: number;
    ptsLoss: number;
    ptsNR: number;
  };
  createdAt: number;
  updatedAt: number;
}

export type UserRole = 'admin' | 'scorer' | 'viewer';

export interface BroadcastSponsor {
  id: string;
  name: string;
  logoUrl?: string;
  tagline?: string;
  placement: 'top_right' | 'bottom_ticker' | 'scorecard_header' | 'corner_bug';
  enabled: boolean;
}

export type BroadcastEventType =
  | 'boundary_four'
  | 'boundary_six'
  | 'wicket'
  | 'milestone_50'
  | 'milestone_100';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isPending?: boolean; // Added by an admin but hasn't signed in with Google yet (server-computed)
  firebaseUid?: string; // Google (Firebase Auth) account linked to this user
  photoURL?: string;
  createdAt: number;
  lastLoginAt?: number;
  assignedMatchIds?: string[]; // Allowed match IDs for scorer
}

export interface AppDatabase {
  matches: Record<string, Match>;
  tournaments: Record<string, Tournament>;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  users: Record<string, AppUser>;
  /** Firestore auction catch-up cursor (serverless mode): highest updatedAt already applied */
  auctionSyncCursor?: number;
  auctionSyncMap?: Record<string, { status: string; teamId?: string; soldPrice?: number; updatedAt: number }>;
  lastUpdated: number;
}

export type StreamQualityPreset = '480p' | '720p' | '1080p';
export type StreamHealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'reconnecting';

export interface LiveStreamSession {
  sessionId: string;
  matchId: string;
  startedAt: number;
  status: 'live' | 'ended' | 'error';
  quality: StreamQualityPreset;
  youtubeBroadcastId?: string;
  youtubeWatchUrl?: string;
  fps: number;
  bitrateKbps: number;
  bytesReceived: number;
  chunksReceived: number;
  lastChunkTimestamp: number;
  health: StreamHealthStatus;
}

