import React from 'react';
import { useCricket } from '../../context/CricketContext';
import { Calendar, Play, CheckCircle } from 'lucide-react';

interface FixturesOverlayProps {
  tournamentId?: string;
  matchId?: string;
}

export const FixturesOverlay: React.FC<FixturesOverlayProps> = ({ tournamentId, matchId }) => {
  const { state } = useCricket();

  let targetTournId = tournamentId;
  if (!targetTournId && matchId && state.matches[matchId]) {
    targetTournId = state.matches[matchId].tournamentId;
  }
  if (!targetTournId) {
    targetTournId = Object.keys(state.tournaments)[0];
  }

  const tournament = targetTournId ? state.tournaments[targetTournId] : null;
  const allMatches = Object.values(state.matches);

  const tournMatches = targetTournId
    ? allMatches.filter((m) => m.tournamentId === targetTournId)
    : allMatches;

  const liveMatches = tournMatches.filter((m) => m.status === 'live' || m.status === 'innings_break');
  const upcomingMatches = tournMatches
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 4);
  const completedMatches = tournMatches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);

  return (
    <div
      className="w-full max-w-6xl mx-auto font-sans select-none text-white my-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-md overflow-hidden">
        {/* Broadcast Header */}
        <div className="bg-gradient-to-r from-red-950/80 via-slate-950 to-slate-950 px-6 py-4 border-b border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] tracking-widest border border-red-500/80 shadow-sm shadow-red-500/40">
                  AZAD LIVE
                </span>
                <span className="font-black text-lg text-white uppercase tracking-tight">
                  {tournament ? tournament.name : 'TOURNAMENT'} - FIXTURES
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  {tournMatches.length} MATCHES
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Live Broadcast Matches, Upcoming Fixtures & Recent Results
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>PRISM LIVE FEED</span>
          </div>
        </div>

        {/* 3 Sections Grid: Live Now, Upcoming, Recent Results */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* SECTION 1: LIVE NOW */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/40 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4 text-rose-500" />
                <h4 className="font-black text-xs uppercase tracking-wider text-rose-400">
                  Live in Progress ({liveMatches.length})
                </h4>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            </div>

            <div className="mt-3 space-y-2.5">
              {liveMatches.length === 0 ? (
                <div className="text-slate-500 text-center py-6 text-xs italic">
                  No live matches right now
                </div>
              ) : (
                liveMatches.slice(0, 3).map((m) => {
                  const currInn = m.innings[m.currentInningsIndex];
                  const battingTeam = m.currentInningsIndex === 0 ? m.team1 : m.team2;
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-rose-900/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>{m.team1.shortName} vs {m.team2.shortName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                          LIVE
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-cyan-400 font-bold">
                          {battingTeam.shortName}: {currInn.totalRuns}/{currInn.wickets}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {currInn.oversFormatted} ov
                        </span>
                      </div>

                      {m.target && (
                        <div className="text-[10px] text-amber-300 font-sans">
                          Target: {m.target} (Need {Math.max(0, m.target - currInn.totalRuns)} runs)
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION 2: UPCOMING FIXTURES */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/30 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-cyan-400">
                  Upcoming Matches ({upcomingMatches.length})
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Schedule</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {upcomingMatches.length === 0 ? (
                <div className="text-slate-500 text-center py-6 text-xs italic">
                  All scheduled matches underway or completed
                </div>
              ) : (
                upcomingMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{m.team1.name} vs {m.team2.name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{m.overs} ov</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{m.ballType.replace('_', ' ')} ball</span>
                      <span>Scheduled</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 3: RECENT RESULTS */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-emerald-400">
                  Recent Results ({completedMatches.length})
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Official</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {completedMatches.length === 0 ? (
                <div className="text-slate-500 text-center py-6 text-xs italic">
                  No matches completed yet
                </div>
              ) : (
                completedMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{m.team1.shortName} vs {m.team2.shortName}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold font-mono">Final</span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-300 flex justify-between">
                      <span>{m.team1.shortName}: {m.innings[0].totalRuns}/{m.innings[0].wickets}</span>
                      <span>{m.team2.shortName}: {m.innings[1].totalRuns}/{m.innings[1].wickets}</span>
                    </div>

                    {m.result?.summaryText && (
                      <div className="text-[10px] text-emerald-300 font-medium truncate">
                        {m.result.summaryText}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Official Fixture Schedule • Live Updates Synchronized with Scorer Console
          </div>
          <div className="font-mono text-cyan-400 font-semibold">
            PRISM Broadcast Overlay
          </div>
        </div>
      </div>
    </div>
  );
};
