import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { usePermissions } from '../auth/permissions';
import { getBallTypeBadge } from './ScoreboardHeader';
import { Calendar, History, Trophy, MapPin, Play, Share2, Search } from 'lucide-react';

interface FixturesHistoryViewProps {
  mode: 'fixtures' | 'history';
  onSelectMatchToScore: (matchId: string) => void;
  onOpenPublicScore: (matchId: string) => void;
}

export const FixturesHistoryView: React.FC<FixturesHistoryViewProps> = ({
  mode,
  onSelectMatchToScore,
  onOpenPublicScore,
}) => {
  const { state } = useCricket();
  const { canScoreMatch } = usePermissions();
  const [search, setSearch] = useState('');

  const matches = Object.values(state.matches);

  const filteredMatches = matches
    .filter((m) => {
      if (mode === 'fixtures') {
        return m.status === 'upcoming' || m.status === 'live' || m.status === 'innings_break';
      } else {
        return m.status === 'completed' || m.status === 'abandoned';
      }
    })
    .filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.team1.name.toLowerCase().includes(search.toLowerCase()) ||
        m.team2.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.tournamentName && m.tournamentName.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (mode === 'fixtures' ? a.createdAt - b.createdAt : b.updatedAt - a.updatedAt));

  return (
    <div className="space-y-6">
      <div className="card p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === 'fixtures'
              ? 'Complete fixture schedule for all tournaments and quick matches'
              : 'Official past match scorecards, victory margins, and awards'}
          </p>
        </div>

        <div className="w-full sm:w-64 bg-ink-950/60 border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-slate-300 flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search teams or tournament..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 text-xs italic">
          No matches found for {mode === 'fixtures' ? 'upcoming fixtures' : 'past match history'}.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((m) => {
            const ballBadge = getBallTypeBadge(m.ballType);
            const inn1 = m.innings[0];
            const inn2 = m.innings[1];

            return (
              <div
                key={m.id}
                data-aos="fade-up"
                className="card hover:border-brand-500/30 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
              >
                {/* Left: Tournament & Teams */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-cyan-400 truncate">
                      {m.tournamentName || 'Quick Match'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{m.stage || 'Regular Match'}</span>
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.2 rounded-full border text-[10px] font-bold ${ballBadge.className}`}
                    >
                      <span>{ballBadge.icon}</span>
                      <span>{ballBadge.label}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold text-white">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.team1.color || '#3B82F6' }}
                      />
                      <span className="truncate">{m.team1.name}</span>
                      <span className="font-mono text-cyan-400 font-normal">
                        {inn1.totalRuns}/{inn1.wickets} ({inn1.oversFormatted} ov)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.team2.color || '#EF4444' }}
                      />
                      <span className="truncate">{m.team2.name}</span>
                      {inn2.deliveries.length > 0 ? (
                        <span className="font-mono text-cyan-400 font-normal">
                          {inn2.totalRuns}/{inn2.wickets} ({inn2.oversFormatted} ov)
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic font-normal">Yet to bat</span>
                      )}
                    </div>
                  </div>

                  {m.result ? (
                    <div className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{m.result.summaryText}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{m.venue || 'Ground'} • {m.date}</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 self-end md:self-center">
                  {canScoreMatch(m.id) && (
                  <button
                    onClick={() => onSelectMatchToScore(m.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>{m.status === 'completed' ? 'Inspect' : 'Score'}</span>
                  </button>
                  )}
                  <button
                    onClick={() => onOpenPublicScore(m.id)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 font-medium text-xs flex items-center space-x-1"
                  >
                    <Share2 className="w-3 h-3 text-cyan-400" />
                    <span>Scorecard</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
