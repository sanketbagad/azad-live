import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useCricket } from '../context/CricketContext';
import { usePermissions } from '../auth/permissions';
import { Activity, Play, Tv, Trash2, Zap, Video, Radio, Calendar, History } from 'lucide-react';
import { LiveMatchCard } from './home/LiveMatchCard';
import type { Match } from '../types/cricket';
import { isVideoLive } from '../utils/liveMatch';

interface LiveMatchesGridProps {
  onSelectMatchToScore: (matchId: string) => void;
  onOpenPublicScore: (matchId: string) => void;
  onOpenOBS: (matchId: string) => void;
  onOpenQuickMatch: () => void;
  onOpenLiveStream?: (matchId: string) => void;
}

type Filter = 'all' | 'live' | 'upcoming' | 'completed';

const isLiveStatus = (status: string) => status === 'live' || status === 'innings_break';

export const LiveMatchesGrid: React.FC<LiveMatchesGridProps> = ({
  onSelectMatchToScore,
  onOpenPublicScore,
  onOpenOBS,
  onOpenQuickMatch,
  onOpenLiveStream,
}) => {
  const { state, deleteMatch } = useCricket();
  const { can, canScoreMatch } = usePermissions();
  const [filter, setFilter] = useState<Filter>('all');

  const all = Object.values(state.matches);
  // Live: video broadcasts first, then most recently updated
  const live = all
    .filter((m) => isLiveStatus(m.status))
    .sort((a, b) => Number(isVideoLive(b)) - Number(isVideoLive(a)) || b.updatedAt - a.updatedAt);
  const upcoming = all
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.createdAt - b.createdAt);
  const results = all
    .filter((m) => m.status === 'completed' || m.status === 'abandoned')
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: all.length },
    { id: 'live', label: 'Live', count: live.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'completed', label: 'Results', count: results.length },
  ];

  /** Staff-only actions under a card; viewers just tap the card to watch. */
  const StaffActions: React.FC<{ m: Match }> = ({ m }) => {
    const canScore = canScoreMatch(m.id);
    const showAny = (canScore && m.status !== 'completed') || can('broadcast.overlays') || can('match.delete');
    if (!showAny) return null;
    return (
      <div className="flex items-center gap-2">
        {canScore && m.status !== 'completed' && (
          <button onClick={() => onSelectMatchToScore(m.id)} className="btn-primary flex-1 !min-h-10 !py-2 text-xs">
            <Activity className="w-4 h-4" /> Score
          </button>
        )}
        {canScore && onOpenLiveStream && m.status !== 'completed' && (
          <button onClick={() => onOpenLiveStream(m.id)} className="btn-ghost !min-h-10 !px-3 !py-2" title="Broadcast this match" aria-label="Broadcast">
            <Video className="w-4 h-4 text-live-400" />
          </button>
        )}
        {can('broadcast.overlays') && (
          <button onClick={() => onOpenOBS(m.id)} className="btn-ghost !min-h-10 !px-3 !py-2" title="OBS overlay" aria-label="OBS overlay">
            <Tv className="w-4 h-4 text-pulse-400" />
          </button>
        )}
        {can('match.delete') && (
          <button
            onClick={async () => {
              if (confirm(`Delete match "${m.name}"? This action cannot be undone.`)) {
                await deleteMatch(m.id);
              }
            }}
            className="btn-ghost !min-h-10 !px-3 !py-2 hover:!bg-live-600/20"
            title="Delete match"
            aria-label="Delete match"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
    );
  };

  const renderGrid = (list: Match[], featured = false) => (
    <motion.div layout className={`grid grid-cols-1 gap-3 sm:gap-4 ${featured ? 'lg:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
      <AnimatePresence mode="popLayout">
        {list.map((m, i) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, delay: Math.min(i, 6) * 0.04 }}
          >
            <LiveMatchCard match={m} featured={featured} onClick={() => onOpenPublicScore(m.id)}>
              {featured && (
                <button onClick={() => onOpenPublicScore(m.id)} className="w-full btn-ghost !min-h-11 text-xs mb-2">
                  {isVideoLive(m) ? <Video className="w-4 h-4 text-live-400" /> : <Play className="w-4 h-4 text-brand-300" />}
                  {isVideoLive(m) ? 'Watch live video' : 'Follow live'}
                </button>
              )}
              <StaffActions m={m} />
            </LiveMatchCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const Section: React.FC<{ icon: React.ReactNode; title: string; count: number; children: React.ReactNode }> = ({
    icon,
    title,
    count,
    children,
  }) => (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-2xl font-semibold text-white leading-none pt-0.5">{title}</h2>
        <span className="text-xs text-slate-500 tabular-nums">{count}</span>
      </div>
      {children}
    </section>
  );

  const empty = (message: string) => (
    <div className="card p-6 text-center text-sm text-slate-400">{message}</div>
  );

  return (
    <div className="space-y-6">
      {/* Filters + create */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 min-w-0">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`relative shrink-0 px-4 min-h-10 rounded-full text-xs font-semibold transition-colors ${
                  active ? 'text-white' : 'text-slate-400 hover:text-white bg-white/[0.03]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="match-filter"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-500/30 to-pulse-500/25 border border-brand-500/40"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {f.id === 'live' && f.count > 0 && <span className="live-dot !w-1.5 !h-1.5" />}
                  {f.label}
                  <span className={`text-[10px] ${active ? 'text-brand-300' : 'text-slate-500'}`}>{f.count}</span>
                </span>
              </button>
            );
          })}
        </div>

        {can('match.create') && (
          <button onClick={onOpenQuickMatch} className="btn-primary shrink-0 !px-3 sm:!px-4" aria-label="Quick match">
            <Zap className="w-4 h-4" /> <span className="hidden sm:inline">Quick Match</span>
          </button>
        )}
      </div>

      {all.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Radio className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="font-display text-3xl font-semibold">No matches yet</h3>
          <p className="text-sm text-slate-400 mt-1">
            {can('match.create')
              ? 'Start a Quick Match or schedule fixtures from a tournament.'
              : 'Matches will appear here as soon as they are scheduled.'}
          </p>
          {can('match.create') && (
            <button onClick={onOpenQuickMatch} className="btn-primary mt-5">
              <Zap className="w-4 h-4" /> Create Quick Match
            </button>
          )}
        </motion.div>
      ) : (
        <>
          {(filter === 'all' || filter === 'live') && (
            <Section icon={<span className="live-dot" />} title="Live now" count={live.length}>
              {live.length > 0 ? renderGrid(live, true) : empty('No match is live right now. Check upcoming fixtures below.')}
            </Section>
          )}
          {(filter === 'all' || filter === 'upcoming') && (upcoming.length > 0 || filter === 'upcoming') && (
            <Section icon={<Calendar className="w-4 h-4 text-brand-300" />} title="Upcoming" count={upcoming.length}>
              {upcoming.length > 0 ? renderGrid(upcoming) : empty('No upcoming matches scheduled.')}
            </Section>
          )}
          {(filter === 'all' || filter === 'completed') && (results.length > 0 || filter === 'completed') && (
            <Section icon={<History className="w-4 h-4 text-trophy-400" />} title="Results" count={results.length}>
              {results.length > 0 ? renderGrid(results) : empty('No completed matches yet.')}
            </Section>
          )}
        </>
      )}
    </div>
  );
};
