import React from 'react';
import { Match } from '../../types/cricket';
import { calculateRunRate, calculateRequiredRunRate } from '../../utils/cricketEngine';
import { SponsorOverlayBug } from './SponsorOverlayBug';

interface EndOfOverOverlayProps {
  match: Match;
  isStandalone?: boolean;
}

export const EndOfOverOverlay: React.FC<EndOfOverOverlayProps> = ({ match, isStandalone = false }) => {
  const currentIdx = match.currentInningsIndex;
  const currentInn = match.innings[currentIdx];
  const battingTeam = currentIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = currentIdx === 0 ? match.team2 : match.team1;

  const striker = currentInn.batters.find((b) => b.playerId === currentInn.currentStrikerId);
  const nonStriker = currentInn.batters.find((b) => b.playerId === currentInn.currentNonStrikerId);
  const bowler = currentInn.bowlers.find((b) => b.playerId === currentInn.currentBowlerId);

  const crr = calculateRunRate(currentInn.totalRuns, currentInn.legalDeliveries);
  const runsNeeded = match.target ? Math.max(0, match.target - currentInn.totalRuns) : null;
  const ballsRemaining = match.target ? Math.max(0, match.overs * 6 - currentInn.legalDeliveries) : null;
  const rrr = runsNeeded !== null && ballsRemaining !== null ? calculateRequiredRunRate(runsNeeded, ballsRemaining) : null;

  // Deliveries in the latest over (up to 6-8 balls)
  const currentOverIndex = Math.floor((currentInn.legalDeliveries > 0 ? currentInn.legalDeliveries - 1 : 0) / 6);
  const thisOverDeliveries = currentInn.deliveries.filter((d) => d.overNumber === currentOverIndex);
  const runsInThisOver = thisOverDeliveries.reduce((sum, d) => sum + d.runsBat + d.runsExtra, 0);

  return (
    <div
      className={`w-full max-w-4xl mx-auto font-sans select-none ${
        isStandalone ? 'p-4' : 'p-2'
      }`}
    >
      <div className="bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-md text-white">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-red-950 via-slate-950 to-amber-950 px-6 py-3 border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-sm border border-red-500/60">
              AZAD LIVE
            </span>
            <span className="text-base font-black tracking-wider text-amber-400 uppercase">
              End of Over {currentOverIndex + 1}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-700/50">
              {runsInThisOver} Runs in this over
            </span>
            <SponsorOverlayBug placement="top_right" />
          </div>
        </div>

        {/* Match State Banner */}
        <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className="w-4 h-12 rounded-full"
              style={{ backgroundColor: battingTeam.color || '#E11D48' }}
            />
            <div>
              <div className="text-lg font-black tracking-wide text-white">
                {battingTeam.name}
              </div>
              <div className="text-xs text-slate-400">
                vs {bowlingTeam.name} • {match.tournamentName || 'T20 Match'}
              </div>
            </div>
          </div>

          <div className="text-right font-mono">
            <div className="text-4xl font-black text-amber-400">
              {currentInn.totalRuns}
              <span className="text-white text-3xl font-bold">/{currentInn.wickets}</span>
            </div>
            <div className="text-xs font-semibold text-slate-300">
              {currentInn.oversFormatted} / {match.overs} Overs • CRR: {crr.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Batters & Bowler Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950/60">
          {/* Batters */}
          <div className="p-5 space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Batters in the Middle
            </div>

            {striker && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-bold text-sm text-white">{striker.name} *</span>
                </div>
                <div className="font-mono text-sm font-black text-cyan-300">
                  {striker.runs}{' '}
                  <span className="text-slate-400 text-xs font-medium">({striker.balls}b, {striker.fours}x4, {striker.sixes}x6)</span>
                </div>
              </div>
            )}

            {nonStriker && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="font-semibold text-sm text-slate-300">{nonStriker.name}</span>
                <div className="font-mono text-sm font-bold text-slate-300">
                  {nonStriker.runs}{' '}
                  <span className="text-slate-500 text-xs font-medium">({nonStriker.balls}b, {nonStriker.fours}x4, {nonStriker.sixes}x6)</span>
                </div>
              </div>
            )}
          </div>

          {/* Bowler & Over Breakdown */}
          <div className="p-5 space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Bowling Figures
            </div>

            {bowler && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="font-bold text-sm text-white">{bowler.name}</span>
                <div className="font-mono text-sm font-black text-amber-300">
                  {bowler.wickets}/{bowler.runsConceded}{' '}
                  <span className="text-slate-400 text-xs font-medium">({bowler.overs} ov, Econ {bowler.economy.toFixed(1)})</span>
                </div>
              </div>
            )}

            {/* Ball by Ball Delivery Pills */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                This Over Balls:
              </span>
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                {thisOverDeliveries.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No balls recorded in this over yet</span>
                ) : (
                  thisOverDeliveries.map((b) => {
                    let badge = 'bg-slate-800 text-slate-200 border-slate-700';
                    let txt = String(b.runsBat);
                    if (b.isWicket) {
                      badge = 'bg-rose-600 text-white font-black border-rose-500 shadow-md shadow-rose-900/50';
                      txt = 'W';
                    } else if (b.runsBat === 6) {
                      badge = 'bg-purple-600 text-white font-black border-purple-400 shadow-md shadow-purple-900/50';
                    } else if (b.runsBat === 4) {
                      badge = 'bg-blue-600 text-white font-black border-blue-400 shadow-md shadow-blue-900/50';
                    } else if (b.extraType === 'wide') {
                      badge = 'bg-amber-600 text-white font-bold border-amber-500';
                      txt = 'Wd';
                    } else if (b.extraType === 'noBall') {
                      badge = 'bg-amber-500 text-black font-black border-amber-400';
                      txt = 'Nb';
                    }
                    return (
                      <span
                        key={b.id}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs border font-mono ${badge}`}
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

        {/* Footer Target / Equations */}
        {match.target && currentIdx === 1 ? (
          <div className="bg-slate-950 px-6 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>
              Target: <strong className="text-white font-mono">{match.target}</strong>
            </span>
            <span className="text-amber-400 font-mono font-black">
              Need {runsNeeded} runs from {ballsRemaining} balls
            </span>
            <span>
              Required Rate: <strong className="text-white font-mono">{rrr ? rrr.toFixed(1) : '-'}</strong>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
