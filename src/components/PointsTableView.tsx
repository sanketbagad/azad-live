import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { calculatePointsTable } from '../utils/cricketEngine';
import { TableProperties, HelpCircle, Trophy, Shield } from 'lucide-react';

export const PointsTableView: React.FC = () => {
  const { state } = useCricket();
  const tournaments = Object.values(state.tournaments);
  const [selectedTournId, setSelectedTournId] = useState<string>(
    tournaments[0]?.id || ''
  );

  const selectedTourn = state.tournaments[selectedTournId] || tournaments[0];
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  if (!selectedTourn) {
    return (
      <div className="card p-8 text-center text-slate-400">
        <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h3 className="text-base font-bold text-white">No Tournaments Found</h3>
        <p className="text-xs mt-1">Create a tournament to view live points tables.</p>
      </div>
    );
  }

  const matches = Object.values(state.matches);
  const teams = Object.values(state.teams);

  const pointsTable = calculatePointsTable(
    selectedTourn,
    matches,
    teams,
    selectedGroupId || undefined
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="card p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time standings with standard cricket Net Run Rate (NRR) computation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Tournament selector */}
          <select
            value={selectedTournId}
            onChange={(e) => {
              setSelectedTournId(e.target.value);
              setSelectedGroupId('');
            }}
            className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.season})
              </option>
            ))}
          </select>

          {/* Group selector if tournament has multiple groups */}
          {selectedTourn.groups && selectedTourn.groups.length > 1 && (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-cyan-300 font-medium"
            >
              <option value="">All Groups (Combined)</option>
              {selectedTourn.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs flex items-center space-x-1"
            title="How is NRR calculated?"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">NRR Rule</span>
          </button>
        </div>
      </div>

      {/* NRR Formula Explanation Card */}
      {showFormulaInfo && (
        <div className="p-4 bg-cyan-950/40 border border-cyan-700/50 rounded-2xl text-xs text-cyan-200 space-y-2">
          <div className="font-bold text-sm text-cyan-300 flex items-center space-x-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>Cricket Net Run Rate (NRR) Formula Explained</span>
          </div>
          <p>
            <strong>NRR = (Total Runs Scored / Total Overs Faced) – (Total Runs Conceded / Total Overs Bowled)</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
            <li>
              <strong>All-Out Rule:</strong> If a team is bowled out (all out), the overs faced are counted as the full quota of overs (e.g. 20.0 overs), not just the balls they lasted.
            </li>
            <li>
              <strong>Win Points:</strong> Win = {selectedTourn.rules.ptsWin} pts, Tie/No Result = {selectedTourn.rules.ptsTie} pt, Loss = {selectedTourn.rules.ptsLoss} pts.
            </li>
            <li>
              Tiebreakers: 1. Points, 2. NRR, 3. Wins.
            </li>
          </ul>
        </div>
      )}

      {/* Main Points Table */}
      <div className="card shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-ink-950/70 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-3">Team</th>
                <th className="py-3 px-2 text-center" title="Matches Played">P</th>
                <th className="py-3 px-2 text-center text-emerald-400" title="Won">W</th>
                <th className="py-3 px-2 text-center text-rose-400" title="Lost">L</th>
                <th className="py-3 px-2 text-center text-amber-400" title="Tied">T</th>
                <th className="py-3 px-2 text-center text-slate-500" title="No Result">NR</th>
                <th className="py-3 px-3 text-center font-bold text-white" title="Points">PTS</th>
                <th className="py-3 px-4 text-right font-mono" title="Net Run Rate">NRR</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell text-slate-400">For / Against</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-medium">
              {pointsTable.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 italic">
                    No teams in this group yet.
                  </td>
                </tr>
              ) : (
                pointsTable.map((entry, index) => (
                  <tr
                    key={entry.teamId}
                    className={`hover:bg-white/[0.05] transition-colors ${
                      index < 2 ? 'bg-cyan-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-400">{index + 1}</td>
                    <td className="py-3 px-3 font-semibold text-white flex items-center space-x-2.5">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color || '#3B82F6' }}
                      />
                      <span className="font-bold text-slate-100">{entry.teamName}</span>
                      <span className="text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-white/[0.05]">
                        {entry.shortName}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-300">{entry.played}</td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">{entry.won}</td>
                    <td className="py-3 px-2 text-center font-mono text-rose-400">{entry.lost}</td>
                    <td className="py-3 px-2 text-center font-mono text-amber-400">{entry.tied}</td>
                    <td className="py-3 px-2 text-center font-mono text-slate-500">{entry.noResult}</td>
                    <td className="py-3 px-3 text-center font-mono text-base font-extrabold text-cyan-300">
                      {entry.points}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        entry.nrr > 0
                          ? 'text-emerald-400'
                          : entry.nrr < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {entry.nrr > 0 ? `+${entry.nrr.toFixed(3)}` : entry.nrr.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right hidden sm:table-cell text-xs font-mono text-slate-400">
                      {entry.runsScored}/{entry.oversFacedTotal.toFixed(1)} vs {entry.runsConceded}/{entry.oversBowledTotal.toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-ink-950/80 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Top 2 advance to Knockouts / Semi-Finals</span>
          </div>
          <span>Updated after every completed match</span>
        </div>
      </div>
    </div>
  );
};
