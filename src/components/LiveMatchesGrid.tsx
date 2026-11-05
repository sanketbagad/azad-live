import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useCricket } from '../context/CricketContext';
import { usePermissions } from '../auth/permissions';
import { Activity, Eye, Tv, Trash2, Zap, Video, Radio } from 'lucide-react';
import { LiveMatchCard } from './home/LiveMatchCard';

interface LiveMatchesGridProps {
  onSelectMatchToScore: (matchId: string) => void;
  onOpenPublicScore: (matchId: string) => void;
  onOpenOBS: (matchId: string) => void;
  onOpenQuickMatch: () => void;
  onOpenLiveStream?: (matchId: string) => void;
}

type Filter = 'all' | 'live' | 'upcoming' | 'completed';

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

  const matches = Object.values(state.matches).sort((a, b) => b.updatedAt - a.updatedAt);
  const isLive = (status: string) => status === 'live' || status === 'innings_break';

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: matches.length },
    { id: 'live', label: 'Live', count: matches.filter((m) => isLive(m.status)).length },
    { id: 'upcoming', label: 'Upcoming', count: matches.filter((m) => m.status === 'upcoming').length },
    { id: 'completed', label: 'Results', count: matches.filter((m) => m.status === 'completed').length },
  ];

  const filteredMatches = matches.filter((m) => {
    if (filter === 'live') return isLive(m.status);
    if (filter === 'all') return true;
    return m.status === filter;
  });

  return (
    <div className="space-y-5">
      {/* Header row: filters + create */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
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
          <button onClick={onOpenQuickMatch} className="btn-primary shrink-0">
            <Zap className="w-4 h-4" /> Quick Match
          </button>
        )}
      </div>

      {/* Matches */}
      {filteredMatches.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Radio className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="font-display text-3xl font-semibold">No matches here yet</h3>
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
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMatches.map((m, i) => {
              const canScore = canScoreMatch(m.id);
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.04 }}
                >
                  <LiveMatchCard match={m} onClick={() => onOpenPublicScore(m.id)}>
                    <div className="flex items-center gap-2">
                      {canScore && m.status !== 'completed' ? (
                        <button onClick={() => onSelectMatchToScore(m.id)} className="btn-primary flex-1 !min-h-10 !py-2 text-xs">
                          <Activity className="w-4 h-4" /> Score
                        </button>
                      ) : (
                        <button onClick={() => onOpenPublicScore(m.id)} className="btn-ghost flex-1 !min-h-10 !py-2 text-xs">
                          <Eye className="w-4 h-4" /> {m.status === 'completed' ? 'Scorecard' : 'Watch live'}
                        </button>
                      )}
                      {canScore && onOpenLiveStream && m.status !== 'completed' && (
                        <button
                          onClick={() => onOpenLiveStream(m.id)}
                          className="btn-ghost !min-h-10 !px-3 !py-2"
                          title="Go live on YouTube"
                        >
                          <Video className="w-4 h-4 text-live-400" />
                        </button>
                      )}
                      {can('broadcast.overlays') && (
                        <button onClick={() => onOpenOBS(m.id)} className="btn-ghost !min-h-10 !px-3 !py-2" title="OBS overlay">
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
                        >
                          <Trash2 className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </LiveMatchCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
