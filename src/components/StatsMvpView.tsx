import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { Award, Trophy, Flame, Target, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { calculatePlayerOfTheMatch } from '../utils/cricketEngine';

export const StatsMvpView: React.FC = () => {
  const { state } = useCricket();
  const [selectedTab, setSelectedTab] = useState<'mvp' | 'batting' | 'bowling' | 'potm_history'>('mvp');
  const [expandedMvpPlayerId, setExpandedMvpPlayerId] = useState<string | null>(null);

  const players = Object.values(state.players);
  const matches = Object.values(state.matches);

  // Compute live tournament/career stats across matches
  const playerStatsMap = new Map<string, any>();

  players.forEach((p) => {
    playerStatsMap.set(p.id, {
      player: p,
      team: state.teams[p.teamId || ''] || null,
      runs: p.careerStats.runs,
      balls: p.careerStats.balls,
      fours: p.careerStats.fours,
      sixes: p.careerStats.sixes,
      highestScore: p.careerStats.highestScore,
      wickets: p.careerStats.wickets,
      oversBowled: p.careerStats.oversBowled,
      runsConceded: p.careerStats.runsConceded,
      maidens: p.careerStats.maidens,
      catches: p.careerStats.catches,
      stumpings: p.careerStats.stumpings,
      runOuts: p.careerStats.runOuts,
      mvpPoints: p.careerStats.mvpPoints,
      battingPoints: 0,
      bowlingPoints: 0,
      fieldingPoints: 0,
      bonusPoints: 0,
    });
  });

  // Tally live match deliveries into stats
  matches.forEach((m) => {
    m.innings.forEach((inn) => {
      // Batting
      inn.batters.forEach((b) => {
        const item = playerStatsMap.get(b.playerId);
        if (item) {
          const runPts = b.runs * 1;
          const boundaryPts = b.fours * 1 + b.sixes * 2;
          let bonus = 0;
          if (b.runs >= 100) bonus += 50;
          else if (b.runs >= 50) bonus += 25;
          else if (b.runs >= 30) bonus += 10;
          if (b.runs >= 20 && b.strikeRate >= 180) bonus += 15;

          item.battingPoints += runPts + boundaryPts;
          item.bonusPoints += bonus;
          item.mvpPoints += runPts + boundaryPts + bonus;
        }
      });

      // Bowling
      inn.bowlers.forEach((bw) => {
        const item = playerStatsMap.get(bw.playerId);
        if (item) {
          const wktPts = bw.wickets * 25;
          const maidenPts = bw.maidens * 20;
          const dotPts = bw.dots * 1;
          let bonus = 0;
          if (bw.wickets >= 5) bonus += 50;
          else if (bw.wickets >= 3) bonus += 25;

          item.bowlingPoints += wktPts + maidenPts + dotPts;
          item.bonusPoints += bonus;
          item.mvpPoints += wktPts + maidenPts + dotPts + bonus;
        }
      });

      // Fielding
      inn.deliveries.forEach((d) => {
        if (d.dismissal?.assistedById) {
          const item = playerStatsMap.get(d.dismissal.assistedById);
          if (item) {
            const fieldPts = d.dismissal.type === 'stumped' ? 15 : d.dismissal.type === 'run_out' ? 15 : 10;
            item.fieldingPoints += fieldPts;
            item.mvpPoints += fieldPts;
          }
        }
      });
    });
  });

  const allStats = Array.from(playerStatsMap.values());

  // MVP Rankings (sorted by total mvpPoints)
  const mvpRankings = [...allStats].sort((a, b) => b.mvpPoints - a.mvpPoints);

  // Top Batters (Orange Cap)
  const topBatters = [...allStats]
    .filter((a) => a.runs > 0)
    .sort((a, b) => b.runs - a.runs);

  // Top Bowlers (Purple Cap)
  const topBowlers = [...allStats]
    .filter((a) => a.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets);

  // Completed matches with Player of the Match
  const potmMatches = matches.filter((m) => m.result?.playerOfTheMatch);

  return (
    <div className="space-y-6">
      {/* Title & Tabs */}
      <div className="card p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent points formula for Player of the Match and Tournament Most Valuable Player
          </p>
        </div>

        <div className="flex space-x-1.5 p-1 bg-ink-950/60 rounded-xl border border-white/[0.06] text-xs font-semibold">
          <button
            onClick={() => setSelectedTab('mvp')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedTab === 'mvp' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            MVP Leaderboard
          </button>
          <button
            onClick={() => setSelectedTab('batting')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedTab === 'batting' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Orange Cap (Runs)
          </button>
          <button
            onClick={() => setSelectedTab('bowling')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedTab === 'bowling' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Purple Cap (Wickets)
          </button>
          <button
            onClick={() => setSelectedTab('potm_history')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedTab === 'potm_history' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            POTM Awards
          </button>
        </div>
      </div>

      {/* Transparent Formula Guide */}
      <div className="p-4 card text-xs space-y-2">
        <div className="flex items-center space-x-2 text-amber-300 font-bold">
          <Award className="w-4 h-4" />
          <span>Transparent MVP Points System</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
          <div className="p-2.5 rounded-xl bg-ink-950/70 border border-white/[0.06]">
            <strong className="text-orange-400 block mb-1">Batting Points:</strong>
            1 run = +1 pt, 4s = +1 pt, 6s = +2 pts. Milestones: 30+ runs = +10, 50+ runs = +25, 100+ = +50.
          </div>
          <div className="p-2.5 rounded-xl bg-ink-950/70 border border-white/[0.06]">
            <strong className="text-purple-400 block mb-1">Bowling Points:</strong>
            Wicket = +25 pts, Maiden over = +20 pts, Dot ball = +1 pt. 3-wkt haul = +25, 5-wkt haul = +50.
          </div>
          <div className="p-2.5 rounded-xl bg-ink-950/70 border border-white/[0.06]">
            <strong className="text-cyan-400 block mb-1">Fielding Points:</strong>
            Catch = +10 pts, Stumping = +15 pts, Direct Run Out = +15 pts.
          </div>
          <div className="p-2.5 rounded-xl bg-ink-950/70 border border-white/[0.06]">
            <strong className="text-emerald-400 block mb-1">Strike & Economy:</strong>
            Batting SR &gt; 180 = +15 pts. Bowling Econ &lt; 6.00 (min 2 ov) = +15 pts.
          </div>
        </div>
      </div>

      {/* TAB CONTENT: MVP LEADERBOARD */}
      {selectedTab === 'mvp' && (
        <div className="card shadow-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Tournament MVP Standings</span>
            </h3>
            <span className="text-xs text-slate-400">Click player to inspect breakdown</span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {mvpRankings.slice(0, 15).map((item, index) => {
              const isExpanded = expandedMvpPlayerId === item.player.id;
              return (
                <div key={item.player.id} className="p-4 hover:bg-white/[0.05] transition-colors">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedMvpPlayerId(isExpanded ? null : item.player.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          index === 0
                            ? 'bg-amber-500 text-black ring-2 ring-amber-300'
                            : index === 1
                            ? 'bg-slate-300 text-black'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/[0.05] text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </span>

                      <div>
                        <div className="font-bold text-white text-sm flex items-center space-x-2">
                          <span>{item.player.name}</span>
                          {index === 0 && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              #1 MVP
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {item.team?.name || 'Free Agent'} • {item.player.role.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-amber-400 font-mono">
                          {item.mvpPoints} <span className="text-xs text-slate-400">pts</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.runs} runs • {item.wickets} wkts
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">Batting Points</span>
                        <span className="font-mono font-bold text-orange-400">
                          {item.battingPoints} pts
                        </span>
                      </div>
                      <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">Bowling Points</span>
                        <span className="font-mono font-bold text-purple-400">
                          {item.bowlingPoints} pts
                        </span>
                      </div>
                      <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">Fielding Points</span>
                        <span className="font-mono font-bold text-cyan-400">
                          {item.fieldingPoints} pts
                        </span>
                      </div>
                      <div className="p-2 rounded bg-ink-950/60 border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">Bonus Multipliers</span>
                        <span className="font-mono font-bold text-emerald-400">
                          +{item.bonusPoints} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ORANGE CAP (RUNS) */}
      {selectedTab === 'batting' && (
        <div className="card shadow-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-bold text-sm text-orange-400 flex items-center space-x-2">
              <Flame className="w-4 h-4" />
              <span>Orange Cap • Top Run Scorers</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 font-semibold text-[11px] uppercase">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-3">Player</th>
                  <th className="py-3 px-2 text-right">Runs</th>
                  <th className="py-3 px-2 text-right">Balls</th>
                  <th className="py-3 px-2 text-right">4s</th>
                  <th className="py-3 px-2 text-right">6s</th>
                  <th className="py-3 px-2 text-right">HS</th>
                  <th className="py-3 px-4 text-right">Strike Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-medium">
                {topBatters.map((item, idx) => (
                  <tr key={item.player.id} className="hover:bg-white/[0.05]">
                    <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{item.player.name}</div>
                      <div className="text-[10px] text-slate-400">{item.team?.shortName}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-orange-400 font-mono text-base">
                      {item.runs}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300 font-mono">{item.balls}</td>
                    <td className="py-3 px-2 text-right text-slate-400 font-mono">{item.fours}</td>
                    <td className="py-3 px-2 text-right text-purple-300 font-mono">{item.sixes}</td>
                    <td className="py-3 px-2 text-right text-slate-200 font-mono">{item.highestScore}</td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-mono font-bold">
                      {item.balls > 0 ? ((item.runs / item.balls) * 100).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PURPLE CAP (WICKETS) */}
      {selectedTab === 'bowling' && (
        <div className="card shadow-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-bold text-sm text-purple-400 flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Purple Cap • Top Wicket Takers</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 font-semibold text-[11px] uppercase">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-3">Bowler</th>
                  <th className="py-3 px-2 text-right">Wickets</th>
                  <th className="py-3 px-2 text-right">Overs</th>
                  <th className="py-3 px-2 text-right">Runs</th>
                  <th className="py-3 px-2 text-right">Maidens</th>
                  <th className="py-3 px-4 text-right">Economy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-medium">
                {topBowlers.map((item, idx) => (
                  <tr key={item.player.id} className="hover:bg-white/[0.05]">
                    <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{item.player.name}</div>
                      <div className="text-[10px] text-slate-400">{item.team?.shortName}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-purple-400 font-mono text-base">
                      {item.wickets}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300 font-mono">{item.oversBowled}</td>
                    <td className="py-3 px-2 text-right text-slate-300 font-mono">{item.runsConceded}</td>
                    <td className="py-3 px-2 text-right text-slate-400 font-mono">{item.maidens}</td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-mono font-bold">
                      {item.oversBowled > 0 ? (item.runsConceded / item.oversBowled).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: POTM AWARDS */}
      {selectedTab === 'potm_history' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {potmMatches.length === 0 ? (
            <div className="col-span-2 card p-8 text-center text-slate-400">
              No completed matches with POTM recorded yet.
            </div>
          ) : (
            potmMatches.map((m) => {
              const potm = m.result?.playerOfTheMatch;
              if (!potm) return null;
              return (
                <div
                  key={m.id}
                  data-aos="fade-up"
                  className="card p-5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/[0.06] pb-2">
                    <span className="font-semibold text-slate-200">{m.name}</span>
                    <span className="text-[11px]">{m.date}</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-base font-black text-white">{potm.name}</div>
                      <div className="text-xs text-cyan-400 font-semibold">{potm.teamName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{potm.summary}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
                    <span className="text-slate-400">Match MVP Score</span>
                    <span className="font-mono font-bold text-amber-400">{potm.points} pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
