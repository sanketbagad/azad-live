import React, { useState } from 'react';
import { Match } from '../types/cricket';

interface DetailedScorecardProps {
  match: Match;
}

export const DetailedScorecard: React.FC<DetailedScorecardProps> = ({ match }) => {
  const [selectedInningsIdx, setSelectedInningsIdx] = useState<number>(
    match.currentInningsIndex
  );

  const inn = match.innings[selectedInningsIdx];
  const battingTeam = selectedInningsIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = selectedInningsIdx === 0 ? match.team2 : match.team1;

  // Did not bat players
  const battedPlayerIds = inn.batters.map((b) => b.playerId);
  const didNotBat = battingTeam.squad.filter((p) => !battedPlayerIds.includes(p.id));

  return (
    <div className="card shadow-xl overflow-hidden">
      {/* Innings Selector Tabs */}
      <div className="flex border-b border-white/[0.06] bg-ink-950/60">
        <button
          onClick={() => setSelectedInningsIdx(0)}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
            selectedInningsIdx === 0
              ? 'border-cyan-400 text-cyan-300 bg-ink-850/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>1st Innings: {match.team1.shortName}</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/[0.05] text-slate-200">
            {match.innings[0].totalRuns}/{match.innings[0].wickets} ({match.innings[0].oversFormatted})
          </span>
        </button>

        <button
          onClick={() => setSelectedInningsIdx(1)}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
            selectedInningsIdx === 1
              ? 'border-cyan-400 text-cyan-300 bg-ink-850/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>2nd Innings: {match.team2.shortName}</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/[0.05] text-slate-200">
            {match.innings[1].totalRuns}/{match.innings[1].wickets} ({match.innings[1].oversFormatted})
          </span>
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Batting Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">
              {battingTeam.name} Batting
            </h4>
            <span className="text-xs font-mono font-bold text-cyan-400">
              CRR: {(inn.legalDeliveries > 0 ? (inn.totalRuns / (inn.legalDeliveries / 6)).toFixed(2) : '0.00')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 font-semibold text-[11px] uppercase">
                  <th className="py-2.5 px-3">Batter</th>
                  <th className="py-2.5 px-2">Dismissal</th>
                  <th className="py-2.5 px-2 text-right">R</th>
                  <th className="py-2.5 px-2 text-right">B</th>
                  <th className="py-2.5 px-2 text-right">4s</th>
                  <th className="py-2.5 px-2 text-right">6s</th>
                  <th className="py-2.5 px-3 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-medium">
                {inn.batters.map((b) => (
                  <tr key={b.playerId} className="hover:bg-white/[0.05]">
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center space-x-1.5">
                      <span>{b.name}</span>
                      {!b.isOut && <span className="text-cyan-400 font-bold">*</span>}
                    </td>
                    <td className="py-2.5 px-2 text-slate-400 text-xs">
                      {b.isOut ? b.dismissalText : <span className="text-emerald-400 font-semibold">not out</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-white font-mono">{b.runs}</td>
                    <td className="py-2.5 px-2 text-right text-slate-300 font-mono">{b.balls}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 font-mono">{b.fours}</td>
                    <td className="py-2.5 px-2 text-right text-purple-300 font-mono">{b.sixes}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{b.strikeRate.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Extras and Total row */}
          <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Extras</span>
              <span className="font-mono font-semibold text-slate-200">
                {inn.extras.total}{' '}
                <span className="text-slate-500">
                  (b {inn.extras.byes}, lb {inn.extras.legByes}, wd {inn.extras.wides}, nb {inn.extras.noBalls}, pen {inn.extras.penalty})
                </span>
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white border-t border-white/[0.06] pt-1.5">
              <span>TOTAL</span>
              <span className="font-mono text-cyan-400 text-base">
                {inn.totalRuns}/{inn.wickets}{' '}
                <span className="text-xs font-normal text-slate-400">({inn.oversFormatted} ov)</span>
              </span>
            </div>
          </div>

          {/* Did Not Bat */}
          {didNotBat.length > 0 && (
            <div className="mt-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Did not bat: </span>
              <span>{didNotBat.map((p) => p.name).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Fall of Wickets */}
        {inn.fallOfWickets.length > 0 && (
          <div>
            <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 mb-2">
              Fall of Wickets
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {inn.fallOfWickets.map((fow) => (
                <div
                  key={fow.wicketNumber}
                  className="px-2.5 py-1 rounded bg-ink-950/60 border border-white/[0.06] font-mono text-slate-300"
                >
                  <strong className="text-rose-400">{fow.score}-{fow.wicketNumber}</strong>{' '}
                  <span className="text-slate-500 font-sans">({fow.playerOutName}, {fow.over} ov)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bowling Table */}
        <div>
          <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 mb-2">
            {bowlingTeam.name} Bowling
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 font-semibold text-[11px] uppercase">
                  <th className="py-2.5 px-3">Bowler</th>
                  <th className="py-2.5 px-2 text-right">O</th>
                  <th className="py-2.5 px-2 text-right">M</th>
                  <th className="py-2.5 px-2 text-right">R</th>
                  <th className="py-2.5 px-2 text-right">W</th>
                  <th className="py-2.5 px-2 text-right">ECON</th>
                  <th className="py-2.5 px-2 text-right">0s</th>
                  <th className="py-2.5 px-2 text-right">WD</th>
                  <th className="py-2.5 px-3 text-right">NB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-medium">
                {inn.bowlers.map((bw) => (
                  <tr key={bw.playerId} className="hover:bg-white/[0.05]">
                    <td className="py-2.5 px-3 font-semibold text-white">{bw.name}</td>
                    <td className="py-2.5 px-2 text-right text-slate-200 font-mono">{bw.overs}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 font-mono">{bw.maidens}</td>
                    <td className="py-2.5 px-2 text-right text-slate-200 font-mono">{bw.runsConceded}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-amber-300 font-mono">{bw.wickets}</td>
                    <td className="py-2.5 px-2 text-right text-slate-300 font-mono">{bw.economy.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 font-mono">{bw.dots}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 font-mono">{bw.wides}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-mono">{bw.noBalls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
