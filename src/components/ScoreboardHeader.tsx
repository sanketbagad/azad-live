import { motion } from 'motion/react';
import React from 'react';
import { Match, BallType } from '../types/cricket';
import { calculateRequiredRunRate, calculateRunRate } from '../utils/cricketEngine';
import { Trophy, CircleDot, Flame, Clock, Target, Maximize2, Video } from 'lucide-react';

interface ScoreboardHeaderProps {
  match: Match;
  onToggleFullscreen?: () => void;
  onGoLive?: () => void;
}

export const getBallTypeBadge = (ballType: BallType) => {
  switch (ballType) {
    case 'leather':
      return {
        label: 'Leather Ball',
        icon: '🔴',
        className: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
      };
    case 'tennis':
      return {
        label: 'Tennis Ball',
        icon: '🎾',
        className: 'bg-lime-950/80 text-lime-300 border-lime-700/60',
      };
    case 'light_tennis':
      return {
        label: 'Light Tennis Ball',
        icon: '🟡',
        className: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
      };
  }
};

export const ScoreboardHeader: React.FC<ScoreboardHeaderProps> = ({
  match,
  onToggleFullscreen,
  onGoLive,
}) => {
  const currentIdx = match.currentInningsIndex;
  const currentInn = match.innings[currentIdx];
  const prevInn = match.innings[0];

  const battingTeam = currentIdx === 0 ? match.team1 : match.team2;
  const bowlingTeam = currentIdx === 0 ? match.team2 : match.team1;

  const striker = currentInn.batters.find((b) => b.playerId === currentInn.currentStrikerId);
  const nonStriker = currentInn.batters.find((b) => b.playerId === currentInn.currentNonStrikerId);
  const bowler = currentInn.bowlers.find((b) => b.playerId === currentInn.currentBowlerId);

  const crr = calculateRunRate(currentInn.totalRuns, currentInn.legalDeliveries);
  const runsNeeded = match.target ? Math.max(0, match.target - currentInn.totalRuns) : null;
  const ballsRemaining = match.target ? Math.max(0, match.overs * 6 - currentInn.legalDeliveries) : null;
  const rrr = runsNeeded !== null && ballsRemaining !== null ? calculateRequiredRunRate(runsNeeded, ballsRemaining) : null;

  // Recent 6 to 12 deliveries
  const recentBalls = currentInn.deliveries.slice(-8);

  const ballBadge = getBallTypeBadge(match.ballType);

  return (
    <div className="card overflow-hidden mb-6 relative">
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${battingTeam.color || '#22d3ee'}, ${bowlingTeam.color || '#8b5cf6'})` }}
      />
      {/* Top Banner: Tournament name, ball type, match format & stage */}
      <div className="bg-ink-950/50 px-4 py-2.5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          {match.tournamentName ? (
            <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              {match.tournamentName}
            </span>
          ) : (
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Quick Match
            </span>
          )}
          {match.stage && (
            <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 text-[11px]">
              {match.stage}
            </span>
          )}
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-medium">{match.overs} Overs Match</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Ball Type Badge */}
          <span
            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${ballBadge.className}`}
          >
            <span>{ballBadge.icon}</span>
            <span>{ballBadge.label}</span>
          </span>

          {/* Match Status Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
              match.status === 'live'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                : match.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : match.status === 'innings_break'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/[0.05] text-slate-400'
            }`}
          >
            {match.status === 'live' ? '● LIVE' : match.status.replace('_', ' ')}
          </span>

          {onGoLive && (
            <button
              onClick={onGoLive}
              className="px-3 min-h-8 rounded-full bg-live-600 hover:bg-live-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-live-600/30 border border-live-400/40 transition-all active:scale-95"
              title="Launch AZAD LIVE Direct Mobile Streaming Studio"
            >
              <Video className="w-3 h-3 text-white" />
              <span>Go Live</span>
            </button>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 rounded hover:bg-white/[0.05] text-slate-400 hover:text-white"
              title="Projector / TV Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scoreboard Display */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Batting Team & Big Score Numbers */}
          <div className="lg:col-span-5">
            <div className="flex items-center space-x-3 mb-2">
              <div
                className="w-4 h-4 rounded-full ring-2 ring-white/20"
                style={{ backgroundColor: battingTeam.color || '#3B82F6' }}
              />
              <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-wide leading-none text-white">
                {battingTeam.name}
              </h2>
              <span className="text-xs font-bold text-slate-400 px-2 py-0.5 rounded bg-white/[0.05]">
                {battingTeam.shortName}
              </span>
            </div>

            {/* Score & Overs */}
            <div className="flex items-baseline space-x-4">
              <motion.div
                key={`${currentInn.totalRuns}-${currentInn.wickets}`}
                initial={{ scale: 1.12, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="font-display text-7xl sm:text-8xl font-semibold leading-none text-gradient origin-left"
              >
                {currentInn.totalRuns}
                <span className="text-white text-5xl sm:text-6xl">/{currentInn.wickets}</span>
              </motion.div>
              <div className="text-slate-400">
                <span className="font-display text-3xl sm:text-4xl font-semibold text-slate-200">
                  {currentInn.oversFormatted}
                </span>
                <span className="text-xs sm:text-sm text-slate-400"> / {currentInn.maxOvers} ov</span>
              </div>
            </div>

            {/* CRR & 1st Innings Score (if 2nd innings) */}
            <div className="flex items-center space-x-4 mt-2 text-xs sm:text-sm font-medium text-slate-400">
              <div className="flex items-center space-x-1">
                <span>CRR:</span>
                <span className="text-white font-bold">{crr.toFixed(2)}</span>
              </div>

              {currentIdx === 1 && (
                <div className="flex items-center space-x-1 text-slate-400">
                  <span>{match.team1.shortName}:</span>
                  <span className="text-slate-200 font-semibold">
                    {prevInn.totalRuns}/{prevInn.wickets} ({prevInn.oversFormatted})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center Column: Chase Equation / Target Banner */}
          <div className="lg:col-span-7 bg-ink-950/60 p-4 rounded-xl border border-white/[0.06]">
            {match.status === 'completed' && match.result ? (
              <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-xl text-center">
                <div className="flex items-center justify-center space-x-2 text-emerald-400 font-extrabold text-base sm:text-lg">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>{match.result.summaryText}</span>
                </div>
                {match.result.playerOfTheMatch && (
                  <div className="text-xs text-emerald-300/80 mt-1">
                    Player of the Match:{' '}
                    <span className="font-bold text-amber-300">
                      {match.result.playerOfTheMatch.name}
                    </span>{' '}
                    ({match.result.playerOfTheMatch.teamName})
                  </div>
                )}
              </div>
            ) : currentIdx === 1 && match.target ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs uppercase font-bold text-slate-400">Target</span>
                    <span className="text-base font-extrabold text-white">{match.target}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-semibold">
                    <span className="text-slate-400">
                      Need <span className="text-cyan-400 font-bold">{runsNeeded}</span> runs in{' '}
                      <span className="text-white font-bold">{ballsRemaining}</span> balls
                    </span>
                    {rrr !== null && (
                      <span className="text-slate-400">
                        RRR: <span className="text-amber-400 font-bold">{rrr.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar of Chase */}
                <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-brand-400 to-pulse-500 h-full"
                    initial={false}
                    animate={{ width: `${Math.min(100, (currentInn.totalRuns / match.target) * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div>
                  1st Innings in progress • {match.team2.name} to bat next
                </div>
                <div>Overs limit: {match.overs} ov</div>
              </div>
            )}

            {/* Current Batters & Bowler Mini Live Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/[0.06] text-xs">
              {/* Batters */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Batting
                </div>
                {striker ? (
                  <div className="flex items-center justify-between font-semibold text-slate-200 bg-ink-850/60 px-2 py-1 rounded">
                    <span className="flex items-center space-x-1 truncate">
                      <span className="text-cyan-400 font-black">*</span>
                      <span className="truncate">{striker.name}</span>
                    </span>
                    <span className="font-mono text-cyan-300 whitespace-nowrap ml-2">
                      {striker.runs}{' '}
                      <span className="text-slate-500 font-normal">
                        ({striker.balls}b, {striker.fours}x4, {striker.sixes}x6)
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-500 italic">No striker selected</div>
                )}

                {nonStriker && (
                  <div className="flex items-center justify-between font-medium text-slate-300 px-2 py-0.5">
                    <span className="truncate">{nonStriker.name}</span>
                    <span className="font-mono text-slate-400 whitespace-nowrap ml-2">
                      {nonStriker.runs}{' '}
                      <span className="text-slate-500 font-normal">({nonStriker.balls}b)</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Bowler */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Bowling
                </div>
                {bowler ? (
                  <div className="bg-ink-850/60 px-2 py-1 rounded">
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span className="truncate">{bowler.name}</span>
                      <span className="font-mono text-amber-300 whitespace-nowrap ml-2">
                        {bowler.wickets}-{bowler.runsConceded}{' '}
                        <span className="text-slate-500 font-normal">({bowler.overs} ov)</span>
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Econ: {bowler.economy.toFixed(2)} • Dots: {bowler.dots}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic">No bowler selected</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip: Recent Balls Chips */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              This Over:
            </span>
            <div className="flex items-center space-x-1.5">
              {recentBalls.length === 0 ? (
                <span className="text-slate-500 text-xs italic">Over starting...</span>
              ) : (
                recentBalls.map((b) => {
                  let chipBg = 'bg-white/[0.05] text-slate-200 border-white/10';
                  let label = String(b.runsBat);

                  if (b.isWicket) {
                    chipBg = 'bg-rose-600 text-white border-rose-500 font-bold';
                    label = 'W';
                  } else if (b.runsBat === 6) {
                    chipBg = 'bg-purple-600 text-white border-purple-500 font-bold';
                    label = '6';
                  } else if (b.runsBat === 4) {
                    chipBg = 'bg-blue-600 text-white border-blue-500 font-bold';
                    label = '4';
                  } else if (b.extraType === 'wide') {
                    chipBg = 'bg-amber-600/90 text-white border-amber-500 font-semibold';
                    label = b.runsExtra > 1 ? `${b.runsExtra}Wd` : 'Wd';
                  } else if (b.extraType === 'noBall') {
                    chipBg = 'bg-amber-500 text-black border-amber-400 font-bold';
                    label = b.runsBat > 0 ? `${b.runsBat}Nb` : 'Nb';
                  } else if (b.runsBat === 0) {
                    chipBg = 'bg-white/[0.05] text-slate-400 border-white/10';
                    label = '•';
                  }

                  return (
                    <span
                      key={b.id}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs border shadow-sm ${chipBg}`}
                      title={b.commentary}
                    >
                      {label}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <span>Extras: <strong className="text-slate-200">{currentInn.extras.total}</strong></span>
            <span>(wd {currentInn.extras.wides}, nb {currentInn.extras.noBalls}, b {currentInn.extras.byes}, lb {currentInn.extras.legByes})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
