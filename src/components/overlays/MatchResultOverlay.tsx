import React from 'react';
import { Match } from '../../types/cricket';
import { Trophy, Award, Flame } from 'lucide-react';
import { SponsorOverlayBug } from './SponsorOverlayBug';

interface MatchResultOverlayProps {
  match: Match;
  isStandalone?: boolean;
}

export const MatchResultOverlay: React.FC<MatchResultOverlayProps> = ({ match, isStandalone = false }) => {
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];

  const team1 = match.team1;
  const team2 = match.team2;

  // Innings 1 top performer
  const inn1TopBat = [...inn1.batters].sort((a, b) => b.runs - a.runs)[0];
  const inn1TopBowl = [...inn1.bowlers].sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];

  // Innings 2 top performer
  const inn2TopBat = [...inn2.batters].sort((a, b) => b.runs - a.runs)[0];
  const inn2TopBowl = [...inn2.bowlers].sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];

  const isCompleted = match.status === 'completed';
  const resultText = match.result?.summaryText || (isCompleted ? 'Match Completed' : 'Match In Progress');

  return (
    <div
      className={`w-full max-w-5xl mx-auto font-sans select-none ${
        isStandalone ? 'p-6' : 'p-2'
      }`}
    >
      <div className="bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-md text-white">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-red-950 via-slate-950 to-amber-950 px-6 py-3.5 border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-sm border border-red-500/60">
              AZAD LIVE
            </span>
            <span className="text-base font-black tracking-wider text-amber-400 uppercase flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Match Result & Summary</span>
            </span>
          </div>

          <SponsorOverlayBug placement="top_right" />
        </div>

        {/* Winner Banner */}
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-950 to-red-950/90 px-6 py-5 text-center border-b border-slate-800">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Official Result</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
            {resultText}
          </h2>

          <div className="mt-1 text-xs text-slate-400 font-medium">
            {match.tournamentName || 'Universal Cricket Championship'} • {match.venue}
          </div>
        </div>

        {/* Both Innings Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950/80">
          {/* Innings 1 */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3.5 h-10 rounded-full"
                  style={{ backgroundColor: team1.color || '#3B82F6' }}
                />
                <div>
                  <div className="text-base font-black text-white">{team1.name}</div>
                  <div className="text-xs text-slate-400">1st Innings</div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-2xl font-black text-amber-400">
                  {inn1.totalRuns}/{inn1.wickets}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {inn1.oversFormatted} ov (CRR {((inn1.totalRuns / (inn1.legalDeliveries || 1)) * 6).toFixed(2)})
                </div>
              </div>
            </div>

            {/* Top Innings 1 Bat & Bowl */}
            <div className="space-y-2 text-xs">
              {inn1TopBat && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300 font-medium">{inn1TopBat.name}</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {inn1TopBat.runs} ({inn1TopBat.balls}b)
                  </span>
                </div>
              )}
              {inn1TopBowl && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300 font-medium">{inn1TopBowl.name}</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {inn1TopBowl.wickets}/{inn1TopBowl.runsConceded} ({inn1TopBowl.overs} ov)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Innings 2 */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3.5 h-10 rounded-full"
                  style={{ backgroundColor: team2.color || '#10B981' }}
                />
                <div>
                  <div className="text-base font-black text-white">{team2.name}</div>
                  <div className="text-xs text-slate-400">2nd Innings</div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-2xl font-black text-amber-400">
                  {inn2.totalRuns}/{inn2.wickets}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {inn2.oversFormatted} ov {match.target ? `(Target ${match.target})` : ''}
                </div>
              </div>
            </div>

            {/* Top Innings 2 Bat & Bowl */}
            <div className="space-y-2 text-xs">
              {inn2TopBat && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300 font-medium">{inn2TopBat.name}</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {inn2TopBat.runs} ({inn2TopBat.balls}b)
                  </span>
                </div>
              )}
              {inn2TopBowl && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300 font-medium">{inn2TopBowl.name}</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {inn2TopBowl.wickets}/{inn2TopBowl.runsConceded} ({inn2TopBowl.overs} ov)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Man of the Match Mention Footer */}
        {match.result?.playerOfTheMatch && (
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold uppercase tracking-wider">
                Player of the Match:
              </span>
              <span className="text-white font-extrabold text-sm">
                {match.result.playerOfTheMatch.name}
              </span>
              <span className="text-slate-400">({match.result.playerOfTheMatch.teamName})</span>
            </div>

            <div className="font-mono text-amber-300 text-xs">
              {match.result.playerOfTheMatch.summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
