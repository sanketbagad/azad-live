import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { usePermissions } from '../auth/permissions';
import { Tournament } from '../types/cricket';
import { getBallTypeBadge } from './ScoreboardHeader';
import {
  Trophy,
  Calendar,
  Users,
  Plus,
  Play,
  Trash2,
  TableProperties,
  Award,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface TournamentsViewProps {
  onOpenCreateTournament: () => void;
  onSelectMatchToScore: (matchId: string) => void;
  onOpenPointsTable: () => void;
  onOpenMvp: () => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  onOpenCreateTournament,
  onSelectMatchToScore,
  onOpenPointsTable,
  onOpenMvp,
}) => {
  const { state, deleteTournament } = useCricket();
  const { can, canScoreMatch } = usePermissions();
  const tournaments = Object.values(state.tournaments);
  const [selectedTournId, setSelectedTournId] = useState<string>(
    tournaments[0]?.id || ''
  );

  const selectedTourn = state.tournaments[selectedTournId] || tournaments[0];
  const tournamentMatches = Object.values(state.matches).filter(
    (m) => m.tournamentId === selectedTourn?.id
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="card p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mt-0.5">
            Round-robin leagues, group stage tournaments, knockout brackets & fixtures
          </p>
        </div>

        {can('tournament.manage') && (
          <button
            onClick={onOpenCreateTournament}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Tournament</span>
          </button>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-bold text-white">No tournaments created yet</h3>
          <p className="text-xs mt-1">Create a new tournament to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Tournaments List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Tournaments ({tournaments.length})
            </h3>
            <div className="space-y-2">
              {tournaments.map((t) => {
                const isSelected = selectedTourn?.id === t.id;
                const ballBadge = getBallTypeBadge(t.ballType);
                return (
                  <div
                    key={t.id}
                    data-aos="fade-up"
                    onClick={() => setSelectedTournId(t.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-ink-850 border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-white truncate">{t.name}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300">
                        {t.season}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mt-2 text-xs text-slate-400">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.2 rounded-full border text-[10px] font-bold ${ballBadge.className}`}
                      >
                        <span>{ballBadge.icon}</span>
                        <span>{ballBadge.label}</span>
                      </span>
                      <span>{t.overs} Overs</span>
                      <span>•</span>
                      <span>{t.format.replace('_', ' ')}</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                      <span>{t.teamIds?.length || 0} Teams</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 2 Columns: Selected Tournament Details, Groups & Fixtures */}
          {selectedTourn && (
            <div className="lg:col-span-2 space-y-5">
              {/* Tournament Summary Card */}
              <div className="card p-5 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="text-xl font-black text-white">{selectedTourn.name}</h3>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                      <span>Season: {selectedTourn.season}</span>
                      <span>•</span>
                      <span className="capitalize">{selectedTourn.format.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <span>{selectedTourn.overs} Overs per match</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={onOpenPointsTable}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-cyan-300 font-semibold text-xs flex items-center space-x-1.5"
                    >
                      <TableProperties className="w-3.5 h-3.5" />
                      <span>Points Table</span>
                    </button>
                    <button
                      onClick={onOpenMvp}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-amber-300 font-semibold text-xs flex items-center space-x-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>MVP</span>
                    </button>
                    {can('tournament.manage') && (
                      <button
                        onClick={async () => {
                          if (confirm(`Delete tournament "${selectedTourn.name}"?`)) {
                            await deleteTournament(selectedTourn.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-rose-400"
                        title="Delete Tournament (Admin)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Groups & Assigned Teams */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Tournament Groups & Squads
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTourn.groups.map((grp) => (
                      <div
                        key={grp.id}
                        className="p-3.5 bg-ink-950/70 border border-white/[0.06] rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                          <span>{grp.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {grp.teamIds.length} Teams
                          </span>
                        </div>
                        <div className="space-y-1">
                          {grp.teamIds.map((tId) => {
                            const team = state.teams[tId];
                            if (!team) return null;
                            return (
                              <div
                                key={team.id}
                                className="flex items-center space-x-2 text-xs text-slate-200"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: team.color }}
                                />
                                <span className="font-medium">{team.name}</span>
                                <span className="text-[10px] text-slate-400">({team.shortName})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fixtures Schedule for this tournament */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Match Fixtures Schedule ({tournamentMatches.length})
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {tournamentMatches.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 italic text-xs bg-ink-950/50 rounded-xl border border-white/[0.06]">
                        No matches scheduled yet for this tournament.
                      </div>
                    ) : (
                      tournamentMatches.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-ink-950/70 border border-white/[0.06] flex items-center justify-between text-xs hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                m.status === 'live'
                                  ? 'bg-rose-500 animate-pulse'
                                  : m.status === 'completed'
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-600'
                              }`}
                            />
                            <div>
                              <div className="font-bold text-white">
                                {m.team1.shortName} vs {m.team2.shortName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {m.stage || 'Fixture'} • {m.date}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="font-mono text-right">
                              {m.status === 'completed' ? (
                                <span className="text-emerald-400 font-semibold">
                                  {m.result?.winMargin || 'Completed'}
                                </span>
                              ) : m.status === 'live' ? (
                                <span className="text-rose-400 font-bold">
                                  {m.innings[m.currentInningsIndex].totalRuns}/
                                  {m.innings[m.currentInningsIndex].wickets} (
                                  {m.innings[m.currentInningsIndex].oversFormatted} ov)
                                </span>
                              ) : (
                                <span className="text-slate-400">Upcoming</span>
                              )}
                            </div>

                            {canScoreMatch(m.id) && (
                            <button
                              onClick={() => onSelectMatchToScore(m.id)}
                              className="px-2.5 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 font-semibold text-xs flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3 fill-cyan-200" />
                              <span>Score</span>
                            </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
