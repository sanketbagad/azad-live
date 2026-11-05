import React from 'react';
import { useCricket } from '../../context/CricketContext';
import { calculatePointsTable } from '../../utils/cricketEngine';
import { Trophy } from 'lucide-react';

interface PointsTableOverlayProps {
  tournamentId?: string;
  matchId?: string;
}

export const PointsTableOverlay: React.FC<PointsTableOverlayProps> = ({ tournamentId, matchId }) => {
  const { state } = useCricket();

  // Find target tournament based on match or explicit tournamentId
  let targetTournId = tournamentId;
  if (!targetTournId && matchId && state.matches[matchId]) {
    targetTournId = state.matches[matchId].tournamentId;
  }
  if (!targetTournId) {
    // Default to KPL 5 or first tournament
    targetTournId = Object.keys(state.tournaments)[0];
  }

  const tournament = targetTournId ? state.tournaments[targetTournId] : null;

  if (!tournament) {
    return (
      <div className="w-full max-w-4xl mx-auto my-auto p-8 rounded-2xl bg-slate-950/90 border border-slate-800 text-center text-slate-400">
        <Trophy className="w-12 h-12 mx-auto mb-2 text-slate-600" />
        <h3 className="text-lg font-bold text-white">No Tournament Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select an active tournament to view the live points table.</p>
      </div>
    );
  }

  const matches = Object.values(state.matches);
  const teams = Object.values(state.teams);
  const table = calculatePointsTable(tournament, matches, teams);

  return (
    <div
      className="w-full max-w-5xl mx-auto font-sans select-none text-white my-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950/80 via-slate-950 to-slate-950 px-6 py-4 border-b border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] tracking-widest border border-red-500/80 shadow-sm shadow-red-500/40">
                  AZAD LIVE
                </span>
                <span className="font-black text-lg text-white uppercase tracking-tight">
                  {tournament.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  {tournament.season || '2026'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Official Tournament Standings & Net Run Rate (NRR)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>LIVE STANDINGS</span>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold text-[11px] uppercase tracking-wider bg-slate-900/60">
                <th className="py-3 px-3 w-12 text-center">Pos</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-3 text-center">P</th>
                <th className="py-3 px-3 text-center">W</th>
                <th className="py-3 px-3 text-center">L</th>
                <th className="py-3 px-3 text-center">T/NR</th>
                <th className="py-3 px-3 text-right">NRR</th>
                <th className="py-3 px-4 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {table.map((row, idx) => {
                const isQualifiedZone = idx < 4;
                const nrrFormatted = (row.nrr >= 0 ? '+' : '') + row.nrr.toFixed(3);

                return (
                  <tr
                    key={row.teamId}
                    className={`transition-colors ${
                      isQualifiedZone ? 'bg-slate-900/30 hover:bg-slate-900/60' : 'hover:bg-slate-900/20'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-black">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          idx === 0
                            ? 'bg-amber-500 text-black font-black'
                            : idx === 1
                            ? 'bg-slate-300 text-black font-bold'
                            : idx === 2
                            ? 'bg-amber-700 text-white font-bold'
                            : isQualifiedZone
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-2.5 h-6 rounded-full shrink-0"
                          style={{ backgroundColor: row.color || '#3B82F6' }}
                        />
                        <div className="font-bold text-white flex items-center space-x-2">
                          <span className="text-cyan-400 uppercase font-mono font-black">{row.shortName}</span>
                          <span className="text-slate-300 hidden sm:inline font-sans">{row.teamName}</span>
                          {idx === 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                              #1
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-300">{row.played}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">{row.won}</td>
                    <td className="py-3 px-3 text-center font-mono text-rose-400">{row.lost}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{row.tied + row.noResult}</td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-semibold ${
                        row.nrr >= 0 ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {nrrFormatted}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base font-black text-cyan-300">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Top 4 Teams Qualify for Championship Knockouts</span>
          </div>
          <div className="font-mono text-amber-400 font-bold">
            AZAD LIVE Official Tournament Engine
          </div>
        </div>
      </div>
    </div>
  );
};
