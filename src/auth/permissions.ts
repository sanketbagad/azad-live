import {
  Home,
  Radio,
  Activity,
  Video,
  Trophy,
  Calendar,
  TableProperties,
  BarChart3,
  Award,
  Users,
  Gavel,
  MonitorPlay,
  Tv,
  History,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '../types/cricket';
import { useCricket } from '../context/CricketContext';

// ==========================================
// PERMISSIONS (mirror the server's route guards in server.ts)
// ==========================================

export type Permission =
  | 'match.create'
  | 'match.delete'
  | 'match.score' // still subject to per-match assignment for scorers
  | 'match.stream'
  | 'tournament.manage'
  | 'team.manage'
  | 'broadcast.overlays'
  | 'auction.sync'
  | 'users.manage'
  | 'data.backup';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'match.create',
    'match.delete',
    'match.score',
    'match.stream',
    'tournament.manage',
    'team.manage',
    'broadcast.overlays',
    'auction.sync',
    'users.manage',
    'data.backup',
  ],
  scorer: ['match.score', 'match.stream', 'broadcast.overlays'],
  viewer: [],
};

export function roleCan(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ==========================================
// SCREENS (tabs), their URLs and who can open them
// ==========================================

export type TabKey =
  | 'home'
  | 'live_matches'
  | 'scoring'
  | 'live_streaming'
  | 'tournaments'
  | 'fixtures'
  | 'points_table'
  | 'player_stats'
  | 'mvp'
  | 'teams_players'
  | 'auction_sync'
  | 'public_score'
  | 'obs_overlay'
  | 'history'
  | 'admin';

export type TabGroup = 'main' | 'competition' | 'broadcast' | 'manage';

export interface TabDefinition {
  key: TabKey;
  label: string;
  shortLabel: string;
  path: string;
  icon: LucideIcon;
  group: TabGroup;
  roles: UserRole[];
  /** Hidden from navigation; reached through actions (e.g. "Score" on a match) */
  hiddenInNav?: boolean;
}

const ALL_ROLES: UserRole[] = ['admin', 'scorer', 'viewer'];
const STAFF: UserRole[] = ['admin', 'scorer'];

export const TABS: TabDefinition[] = [
  { key: 'home', label: 'Home', shortLabel: 'Home', path: '/', icon: Home, group: 'main', roles: ALL_ROLES },
  { key: 'live_matches', label: 'Live Matches', shortLabel: 'Live', path: '/live', icon: Radio, group: 'main', roles: ALL_ROLES },
  { key: 'scoring', label: 'Live Scorer', shortLabel: 'Score', path: '/score', icon: Activity, group: 'main', roles: STAFF, hiddenInNav: true },
  { key: 'fixtures', label: 'Fixtures', shortLabel: 'Fixtures', path: '/fixtures', icon: Calendar, group: 'competition', roles: ALL_ROLES },
  { key: 'tournaments', label: 'Tournaments', shortLabel: 'Cups', path: '/tournaments', icon: Trophy, group: 'competition', roles: ALL_ROLES },
  { key: 'points_table', label: 'Points Table', shortLabel: 'Table', path: '/points-table', icon: TableProperties, group: 'competition', roles: ALL_ROLES },
  { key: 'player_stats', label: 'Player Stats', shortLabel: 'Stats', path: '/stats', icon: BarChart3, group: 'competition', roles: ALL_ROLES },
  { key: 'mvp', label: 'MVP Awards', shortLabel: 'MVP', path: '/mvp', icon: Award, group: 'competition', roles: ALL_ROLES },
  { key: 'history', label: 'Results', shortLabel: 'Results', path: '/results', icon: History, group: 'competition', roles: ALL_ROLES },
  { key: 'teams_players', label: 'Teams & Players', shortLabel: 'Teams', path: '/teams', icon: Users, group: 'competition', roles: ALL_ROLES },
  { key: 'auction_sync', label: 'Auction Hub', shortLabel: 'Auction', path: '/auction', icon: Gavel, group: 'competition', roles: ALL_ROLES },
  { key: 'public_score', label: 'Match Centre', shortLabel: 'Match', path: '/match', icon: MonitorPlay, group: 'main', roles: ALL_ROLES },
  { key: 'live_streaming', label: 'Live Streaming', shortLabel: 'Stream', path: '/stream', icon: Video, group: 'broadcast', roles: STAFF },
  { key: 'obs_overlay', label: 'OBS Overlay', shortLabel: 'OBS', path: '/obs', icon: Tv, group: 'broadcast', roles: STAFF },
  { key: 'admin', label: 'Admin Dashboard', shortLabel: 'Admin', path: '/admin', icon: ShieldCheck, group: 'manage', roles: ['admin'] },
];

export const TAB_GROUP_LABELS: Record<TabGroup, string> = {
  main: 'Matchday',
  competition: 'Competition',
  broadcast: 'Broadcast',
  manage: 'Manage',
};

export function getTab(key: TabKey): TabDefinition {
  return TABS.find((t) => t.key === key)!;
}

export function tabFromPath(pathname: string): TabKey {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return TABS.find((t) => t.path === clean)?.key ?? 'home';
}

export function canAccessTab(role: UserRole, key: TabKey): boolean {
  return getTab(key).roles.includes(role);
}

/** Bottom-bar tabs on mobile (max 4; the 5th slot is "More") */
export function getMobilePrimaryTabs(role: UserRole): TabKey[] {
  if (role === 'admin') return ['home', 'live_matches', 'fixtures', 'admin'];
  if (role === 'scorer') return ['home', 'live_matches', 'fixtures', 'live_streaming'];
  return ['home', 'live_matches', 'fixtures', 'points_table'];
}

// ==========================================
// HOOK
// ==========================================

export function usePermissions() {
  const { userRole, canScoreMatch } = useCricket();
  return {
    role: userRole,
    can: (permission: Permission) => roleCan(userRole, permission),
    canAccessTab: (key: TabKey) => canAccessTab(userRole, key),
    /** Admins: any match. Scorers: only matches assigned to them. */
    canScoreMatch,
  };
}
