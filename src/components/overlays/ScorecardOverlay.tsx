import React from 'react';
import { Match } from '../../types/cricket';
import { getBallTypeBadge } from '../ScoreboardHeader';
import { calculateRunRate, calculateRequiredRunRate } from '../../utils/cricketEngine';

interface ScorecardOverlayProps {
  match: Match;
  isStandalone?: boolean;
}

export const ScorecardOverlay: React.FC<ScorecardOverlayProps> = ({ match, isStandalone = true }) => {
  const inn0 = match.innings[0];
  const inn1 = match.innings[1];
  const activeIdx = match.currentInningsIndex;
  const activeInn = match.innings[activeIdx];
  const ballBadge = getBallTypeBadge(match.ballType);

  const crr = calculateRunRate(activeInn.totalRuns, activeInn.legalDeliveries);
  const runsNeeded = match.target ? Math.max(0, match.target - inn1.totalRuns) : null;
  const ballsRemaining = match.target ? Math.max(0, match.overs * 6 - inn1.legalDeliveries) : null;
  const rrr = runsNeeded !== null && ballsRemaining !== null ? calculateRequiredRunRate(runsNeeded, ballsRemaining) : null;
  const recentBalls = activeInn.deliveries.slice(-6);

  return (
    <div
      className="w-full max-w-6xl mx-auto font-sans select-none text-white my-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-md overflow-hidden">
        {/* Top Broadcast Banner */}
        <div className="bg-gradient-to-r from-red-950/80 via-slate-950 to-slate-950 px-5 py-3 border-b border-amber-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] tracking-widest border border-red-500/80 shadow-sm shadow-red-500/40">
              AZAD LIVE
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-950/80 text-amber-300 font-black text-xs uppercase tracking-wider border border-amber-700/60">
              {match.tournamentName || 'KPL 5'}
            </span>
            <span className="text-sm font-black text-white uppercase tracking-tight">
              {match.name}
            </span>
            <span className="text-xs text-slate-400">
              • {match.overs} Overs Match
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {ballBadge.icon} {ballBadge.label}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {match.status === 'completed' && match.result ? (
              <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-xs">
                {match.result.summaryText}
              </span>
            ) : match.status === 'live' ? (
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-600 text-rose-300 font-black text-xs uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>LIVE SCORECARD</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs capitalize">
                {match.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Innings Side-by-Side Comparison */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Innings 1 Card */}
          <div className={`p-4 rounded-xl border ${activeIdx === 0 ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg' : 'bg-slate-950/70 border-slate-800'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-3 h-7 rounded-full"
                  style={{ backgroundColor: match.team1.color || '#3B82F6' }}
                />
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-tight">
                    {match.team1.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">1st Innings</span>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-2xl font-black text-cyan-400">
                  {inn0.totalRuns}/{inn0.wickets}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  ({inn0.oversFormatted} ov)
                </span>
              </div>
            </div>

            {/* Innings 1 Batters */}
            <div className="mt-3">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 flex justify-between">
                <span>Batter</span>
                <span className="font-mono">R (B) 4s 6s SR</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {inn0.batters.length === 0 ? (
                  <div className="text-slate-500 text-center py-2 text-xs italic">Yet to bat</div>
                ) : (
                  inn0.batters.map((b) => (
                    <div key={b.playerId} className="flex items-center justify-between font-medium">
                      <div className="truncate pr-2">
                        <span className={`truncate ${!b.isOut ? 'text-cyan-300 font-bold' : 'text-slate-300'}`}>
                          {b.name} {!b.isOut && activeIdx === 0 && '*'}
                        </span>
                        {b.dismissalText && (
                          <span className="text-[10px] text-slate-500 block truncate font-normal">
                            {b.dismissalText}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-right whitespace-nowrap text-slate-300 text-[11px]">
                        <span className="font-bold text-white mr-1.5">{b.runs}</span>
                        <span className="text-slate-400 mr-1.5">({b.balls})</span>
                        <span className="text-slate-400 mr-1.5">{b.fours}×4</span>
                        <span className="text-slate-400 mr-1.5">{b.sixes}×6</span>
                        <span className="text-cyan-300">{b.strikeRate.toFixed(0)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Innings 1 Bowlers */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 flex justify-between">
                <span>Bowling ({match.team2.shortName})</span>
                <span className="font-mono">O M R W Econ</span>
              </div>
              <div className="space-y-1 text-xs">
                {inn0.bowlers.length === 0 ? (
                  <div className="text-slate-500 text-center py-1 text-xs italic">No overs bowled</div>
                ) : (
                  inn0.bowlers.map((bw) => (
                    <div key={bw.playerId} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span className="text-slate-200 font-sans truncate">{bw.name}</span>
                      <div className="space-x-2 text-right">
                        <span>{bw.overs}</span>
                        <span>{bw.maidens}</span>
                        <span>{bw.runsConceded}</span>
                        <strong className="text-amber-400">{bw.wickets}</strong>
                        <span className="text-slate-400">{bw.economy.toFixed(1)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Innings 2 Card */}
          <div className={`p-4 rounded-xl border ${activeIdx === 1 ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg' : 'bg-slate-950/70 border-slate-800'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-3 h-7 rounded-full"
                  style={{ backgroundColor: match.team2.color || '#F59E0B' }}
                />
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-tight">
                    {match.team2.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">2nd Innings</span>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-2xl font-black text-cyan-400">
                  {inn1.totalRuns}/{inn1.wickets}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  ({inn1.oversFormatted} ov)
                </span>
              </div>
            </div>

            {/* Innings 2 Batters */}
            <div className="mt-3">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 flex justify-between">
                <span>Batter</span>
                <span className="font-mono">R (B) 4s 6s SR</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {inn1.batters.length === 0 ? (
                  <div className="text-slate-500 text-center py-2 text-xs italic">
                    {activeIdx === 0 ? 'Innings yet to begin' : 'Yet to bat'}
                  </div>
                ) : (
                  inn1.batters.map((b) => (
                    <div key={b.playerId} className="flex items-center justify-between font-medium">
                      <div className="truncate pr-2">
                        <span className={`truncate ${!b.isOut ? 'text-cyan-300 font-bold' : 'text-slate-300'}`}>
                          {b.name} {!b.isOut && activeIdx === 1 && '*'}
                        </span>
                        {b.dismissalText && (
                          <span className="text-[10px] text-slate-500 block truncate font-normal">
                            {b.dismissalText}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-right whitespace-nowrap text-slate-300 text-[11px]">
                        <span className="font-bold text-white mr-1.5">{b.runs}</span>
                        <span className="text-slate-400 mr-1.5">({b.balls})</span>
                        <span className="text-slate-400 mr-1.5">{b.fours}×4</span>
                        <span className="text-slate-400 mr-1.5">{b.sixes}×6</span>
                        <span className="text-cyan-300">{b.strikeRate.toFixed(0)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Innings 2 Bowlers */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 flex justify-between">
                <span>Bowling ({match.team1.shortName})</span>
                <span className="font-mono">O M R W Econ</span>
              </div>
              <div className="space-y-1 text-xs">
                {inn1.bowlers.length === 0 ? (
                  <div className="text-slate-500 text-center py-1 text-xs italic">
                    {activeIdx === 0 ? 'Will bowl in 2nd innings' : 'No overs bowled'}
                  </div>
                ) : (
                  inn1.bowlers.map((bw) => (
                    <div key={bw.playerId} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span className="text-slate-200 font-sans truncate">{bw.name}</span>
                      <div className="space-x-2 text-right">
                        <span>{bw.overs}</span>
                        <span>{bw.maidens}</span>
                        <span>{bw.runsConceded}</span>
                        <strong className="text-amber-400">{bw.wickets}</strong>
                        <span className="text-slate-400">{bw.economy.toFixed(1)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Broadcast Equation Footer Strip */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            {match.target ? (
              <div className="font-semibold text-slate-200 flex items-center space-x-2">
                <span className="text-slate-400">Target: <strong className="text-white">{match.target}</strong></span>
                <span>•</span>
                <span className="text-cyan-300">
                  Need <strong className="text-white">{runsNeeded}</strong> runs from <strong className="text-white">{ballsRemaining}</strong> balls
                </span>
                {rrr !== null && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">RRR: {rrr.toFixed(2)}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-slate-300">
                Current Run Rate (CRR): <strong className="text-cyan-400 font-mono">{crr.toFixed(2)}</strong>
              </div>
            )}
          </div>

          {/* Recent balls indicator */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">This Over:</span>
            {recentBalls.length === 0 ? (
              <span className="text-[10px] text-slate-500 italic">No balls bowled</span>
            ) : (
              recentBalls.map((b) => {
                let badge = 'bg-slate-800 text-slate-200';
                let txt = String(b.runsBat);
                if (b.isWicket) {
                  badge = 'bg-rose-600 text-white font-bold';
                  txt = 'W';
                } else if (b.runsBat === 6) {
                  badge = 'bg-purple-600 text-white font-bold';
                } else if (b.runsBat === 4) {
                  badge = 'bg-blue-600 text-white font-bold';
                } else if (b.extraType === 'wide') {
                  badge = 'bg-amber-600 text-white';
                  txt = 'Wd';
                } else if (b.extraType === 'noBall') {
                  badge = 'bg-amber-500 text-black font-bold';
                  txt = 'Nb';
                }
                return (
                  <span
                    key={b.id}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${badge}`}
                  >
                    {txt}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
