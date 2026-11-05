import React from 'react';
import {
  Radio,
  Trophy,
  Users,
  Calendar,
  TableProperties,
  Award,
  Tv,
  History,
  Activity,
  Share2,
  Gavel,
} from 'lucide-react';

export type TabKey =
  | 'live_matches'
  | 'scoring'
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

interface NavigationProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  activeMatchName?: string;
  hasActiveMatch: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  activeMatchName,
  hasActiveMatch,
}) => {
  const tabs = [
    { key: 'live_matches' as TabKey, label: 'Live Matches', icon: Radio, count: null },
    ...(hasActiveMatch
      ? [{ key: 'scoring' as TabKey, label: 'Live Scorer', icon: Activity, highlight: true }]
      : []),
    { key: 'tournaments' as TabKey, label: 'Tournaments', icon: Trophy },
    { key: 'fixtures' as TabKey, label: 'Fixtures', icon: Calendar },
    { key: 'points_table' as TabKey, label: 'Points Table', icon: TableProperties },
    { key: 'player_stats' as TabKey, label: 'Player Stats', icon: Users },
    { key: 'mvp' as TabKey, label: 'MVP Awards', icon: Award },
    { key: 'teams_players' as TabKey, label: 'Teams & Players', icon: Users },
    { key: 'auction_sync' as TabKey, label: 'Auction Hub', icon: Gavel, badge: 'Portal' },
    { key: 'public_score' as TabKey, label: 'Public Live Score', icon: Share2 },
    { key: 'obs_overlay' as TabKey, label: 'OBS Live Overlay', icon: Tv, badge: 'Stream' },
    { key: 'history' as TabKey, label: 'Results & History', icon: History },
    { key: 'admin' as TabKey, label: 'Admin Dashboard', icon: Trophy, badge: 'Admin' },
  ];

  return (
    <nav className="bg-slate-950/90 border-b border-slate-800 backdrop-blur-md sticky top-16 z-30 overflow-x-auto scrollbar-none touch-pan-x">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 py-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onSelectTab(tab.key)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                } ${tab.highlight ? 'ring-1 ring-emerald-500/50 bg-emerald-950/30 text-emerald-300' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
