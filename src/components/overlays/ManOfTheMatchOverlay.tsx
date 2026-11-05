import React from 'react';
import { Match, PlayerOfTheMatch } from '../../types/cricket';
import { calculatePlayerOfTheMatch } from '../../utils/cricketEngine';
import { Trophy, Award, Flame, Star, Sparkles } from 'lucide-react';
import { SponsorOverlayBug } from './SponsorOverlayBug';

interface ManOfTheMatchOverlayProps {
  match: Match;
  isStandalone?: boolean;
}

export const ManOfTheMatchOverlay: React.FC<ManOfTheMatchOverlayProps> = ({
  match,
  isStandalone = false,
}) => {
  // Use existing result or calculate MVP
  const momData: PlayerOfTheMatch | undefined =
    match.result?.playerOfTheMatch || calculatePlayerOfTheMatch(match);

  // Find player batting & bowling figures in the match
  let battingStats = null;
  let bowlingStats = null;

  if (momData) {
    for (const inn of match.innings) {
      const b = inn.batters.find((bt) => bt.playerId === momData.playerId);
      if (b && b.runs > 0) battingStats = b;
      const bw = inn.bowlers.find((bo) => bo.playerId === momData.playerId);
      if (bw && bw.ballsBowled > 0) bowlingStats = bw;
    }
  }

  return (
    <div
      className={`w-full max-w-4xl mx-auto font-sans select-none ${
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
              <span>Player of the Match</span>
            </span>
          </div>

          <SponsorOverlayBug placement="top_right" />
        </div>

        {/* Hero Section */}
        <div className="p-8 bg-gradient-to-b from-amber-950/30 via-slate-950 to-slate-950 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Man of the Match Award</span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wide">
              {momData ? momData.name : 'Outstanding Performer'}
            </h1>
            <div className="text-sm font-bold text-amber-400 mt-1 uppercase tracking-wider">
              {momData ? momData.teamName : match.team1.name}
            </div>
          </div>

          {/* Performance Summary Pill */}
          {momData && (
            <div className="inline-block bg-slate-900 border border-amber-500/40 rounded-xl px-5 py-2 shadow-lg">
              <span className="font-mono text-sm sm:text-base font-black text-amber-300">
                {momData.summary}
              </span>
            </div>
          )}

          {/* Batting & Bowling Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2 text-left">
            {/* Batting Figures */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                <span>Batting Impact</span>
              </div>
              {battingStats ? (
                <div className="space-y-1">
                  <div className="font-mono text-2xl font-black text-white">
                    {battingStats.runs}{' '}
                    <span className="text-sm text-slate-400 font-normal">({battingStats.balls} balls)</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    {battingStats.fours} Fours • {battingStats.sixes} Sixes • SR {battingStats.strikeRate.toFixed(1)}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Key contributions with the bat / team effort</div>
              )}
            </div>

            {/* Bowling Figures */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Bowling Impact</span>
              </div>
              {bowlingStats ? (
                <div className="space-y-1">
                  <div className="font-mono text-2xl font-black text-amber-300">
                    {bowlingStats.wickets}/{bowlingStats.runsConceded}{' '}
                    <span className="text-sm text-slate-400 font-normal">({bowlingStats.overs} ov)</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    {bowlingStats.maidens} Maidens • Econ {bowlingStats.economy.toFixed(1)}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Discipline in the field / leadership presence</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{match.tournamentName || 'Universal Championship 2026'} • {match.venue}</span>
          <span className="text-amber-400 font-mono font-bold">AZAD LIVE Official Broadcast</span>
        </div>
      </div>
    </div>
  );
};
