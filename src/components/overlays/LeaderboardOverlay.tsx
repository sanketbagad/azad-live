import React from 'react';
import { useCricket } from '../../context/CricketContext';
import { Award, Flame, Target, Trophy } from 'lucide-react';

interface LeaderboardOverlayProps {
  tournamentId?: string;
  matchId?: string;
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({ tournamentId, matchId }) => {
  const { state } = useCricket();

  let targetTournId = tournamentId;
  if (!targetTournId && matchId && state.matches[matchId]) {
    targetTournId = state.matches[matchId].tournamentId;
  }
  if (!targetTournId) {
    targetTournId = Object.keys(state.tournaments)[0];
  }

  const tournament = targetTournId ? state.tournaments[targetTournId] : null;
  const players = Object.values(state.players);
  const matches = Object.values(state.matches).filter((m) =>
    targetTournId ? m.tournamentId === targetTournId : true
  );

  // Compute live tournament stats
  const statsMap = new Map<string, any>();

  players.forEach((p) => {
    statsMap.set(p.id, {
      player: p,
      team: state.teams[p.teamId || ''] || null,
      runs: p.careerStats.runs,
      balls: p.careerStats.balls,
      fours: p.careerStats.fours,
      sixes: p.careerStats.sixes,
      wickets: p.careerStats.wickets,
      oversBowled: p.careerStats.oversBowled,
      runsConceded: p.careerStats.runsConceded,
      maidens: p.careerStats.maidens,
      mvpPoints: p.careerStats.mvpPoints,
      battingPoints: 0,
      bowlingPoints: 0,
      fieldingPoints: 0,
    });
  });

  // Tally live match deliveries into stats
  matches.forEach((m) => {
    m.innings.forEach((inn) => {
      // Batting
      inn.batters.forEach((b) => {
        const item = statsMap.get(b.playerId);
        if (item) {
          const runPts = b.runs * 1;
          const boundaryPts = b.fours * 1 + b.sixes * 2;
          let bonus = 0;
          if (b.runs >= 100) bonus += 50;
          else if (b.runs >= 50) bonus += 25;
          else if (b.runs >= 30) bonus += 10;
          if (b.runs >= 20 && b.strikeRate >= 180) bonus += 15;

          item.battingPoints += runPts + boundaryPts;
          item.mvpPoints += runPts + boundaryPts + bonus;
        }
      });

      // Bowling
      inn.bowlers.forEach((bw) => {
        const item = statsMap.get(bw.playerId);
        if (item) {
          const wktPts = bw.wickets * 25;
          const maidenPts = bw.maidens * 20;
          const dotPts = bw.dots * 1;
          let bonus = 0;
          if (bw.wickets >= 5) bonus += 50;
          else if (bw.wickets >= 3) bonus += 25;

          item.bowlingPoints += wktPts + maidenPts + dotPts;
          item.mvpPoints += wktPts + maidenPts + dotPts + bonus;
        }
      });

      // Fielding
      inn.deliveries.forEach((d) => {
        if (d.dismissal?.assistedById) {
          const item = statsMap.get(d.dismissal.assistedById);
          if (item) {
            const fieldPts = d.dismissal.type === 'stumped' ? 15 : d.dismissal.type === 'run_out' ? 15 : 10;
            item.fieldingPoints += fieldPts;
            item.mvpPoints += fieldPts;
          }
        }
      });
    });
  });

  const allStats = Array.from(statsMap.values());

  // Top Batters
  const topBatters = [...allStats]
    .filter((a) => a.runs > 0)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 5);

  // Top Bowlers
  const topBowlers = [...allStats]
    .filter((a) => a.wickets > 0 || a.oversBowled > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)
    .slice(0, 5);

  // Top MVP Leaders
  const topMvp = [...allStats]
    .filter((a) => a.mvpPoints > 0)
    .sort((a, b) => b.mvpPoints - a.mvpPoints)
    .slice(0, 5);

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
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] tracking-widest border border-red-500/80 shadow-sm shadow-red-500/40">
                  AZAD LIVE
                </span>
                <span className="font-black text-lg text-white uppercase tracking-tight">
                  {tournament ? tournament.name : 'TOURNAMENT'} - LEADERBOARDS
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  LIVE STATS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Top Run Scorers, Leading Wicket Takers & MVP Rankings
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>REAL-TIME ENGINE</span>
          </div>
        </div>

        {/* 3 Column Grid for Batters, Bowlers, MVP */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* COLUMN 1: TOP BATTERS */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-orange-500/30 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-orange-400">
                  Top Run Scorers (Orange Cap)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Runs (SR)</span>
            </div>

            <div className="mt-3 space-y-2">
              {topBatters.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-xs italic">No batting stats yet</div>
              ) : (
                topBatters.map((item, idx) => {
                  const sr = item.balls > 0 ? ((item.runs / item.balls) * 100).toFixed(0) : '0';
                  return (
                    <div
                      key={item.player.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80"
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-black'
                              : idx === 1
                              ? 'bg-slate-300 text-black'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-white truncate block">
                            {item.player.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.team?.shortName || 'KPL'} • {item.fours}×4 {item.sixes}×6
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <div className="text-sm font-black text-orange-400">{item.runs}</div>
                        <div className="text-[10px] text-slate-400">SR {sr}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: TOP BOWLERS */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-purple-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-purple-400">
                  Top Wicket Takers (Purple Cap)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Wkts (Econ)</span>
            </div>

            <div className="mt-3 space-y-2">
              {topBowlers.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-xs italic">No bowling stats yet</div>
              ) : (
                topBowlers.map((item, idx) => {
                  const econ = item.oversBowled > 0 ? (item.runsConceded / item.oversBowled).toFixed(1) : '0.0';
                  return (
                    <div
                      key={item.player.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80"
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-black'
                              : idx === 1
                              ? 'bg-slate-300 text-black'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-white truncate block">
                            {item.player.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.team?.shortName || 'KPL'} • {item.oversBowled} ov
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <div className="text-sm font-black text-purple-400">{item.wickets} <span className="text-xs font-normal text-slate-400">w</span></div>
                        <div className="text-[10px] text-slate-400">Econ {econ}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 3: MVP RANKINGS */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-cyan-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-cyan-400">
                  Most Valuable Player (MVP)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">MVP Pts</span>
            </div>

            <div className="mt-3 space-y-2">
              {topMvp.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-xs italic">No MVP points yet</div>
              ) : (
                topMvp.map((item, idx) => (
                  <div
                    key={item.player.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80"
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-black'
                            : idx === 1
                            ? 'bg-slate-300 text-black'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="text-xs font-bold text-white truncate block">
                          {item.player.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.team?.shortName || 'KPL'} • {item.player.role}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="text-sm font-black text-cyan-400">
                        {item.mvpPoints} <span className="text-[10px] font-normal text-slate-400">pts</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">Rank #{idx + 1}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Points award: Runs (1 pt), Wickets (25 pts), Maidens (20 pts), Boundaries (4s=1, 6s=2), Catches (10 pts)
          </div>
          <div className="font-mono text-cyan-400 font-semibold">
            PRISM Broadcast Overlay
          </div>
        </div>
      </div>
    </div>
  );
};
