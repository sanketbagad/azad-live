import React, { useEffect, useState } from 'react';
import { Match, BroadcastEventType } from '../../types/cricket';
import { Flame, Sparkles, AlertOctagon, Award, ShieldAlert } from 'lucide-react';

interface EventAnimationOverlayProps {
  match?: Match;
  eventType?: BroadcastEventType;
  forcedPlayerName?: string;
  forcedDetail?: string;
  isStandalone?: boolean;
}

export const EventAnimationOverlay: React.FC<EventAnimationOverlayProps> = ({
  match,
  eventType: propEventType,
  forcedPlayerName,
  forcedDetail,
  isStandalone = false,
}) => {
  // Determine active event from match latest delivery or prop
  const currentInn = match ? match.innings[match.currentInningsIndex] : null;
  const lastBall = currentInn && currentInn.deliveries.length > 0
    ? currentInn.deliveries[currentInn.deliveries.length - 1]
    : null;

  let activeType: BroadcastEventType = propEventType || 'boundary_six';
  let playerName = forcedPlayerName || '';
  let detail = forcedDetail || '';

  if (!propEventType && lastBall) {
    if (lastBall.isWicket) {
      activeType = 'wicket';
      playerName = lastBall.dismissal?.playerOutName || lastBall.strikerName;
      detail = lastBall.dismissal
        ? `${lastBall.dismissal.type.replace('_', ' ').toUpperCase()} • b ${lastBall.bowlerName}`
        : `Bowled by ${lastBall.bowlerName}`;
    } else if (lastBall.runsBat === 6 || lastBall.isBoundarySix) {
      activeType = 'boundary_six';
      playerName = lastBall.strikerName;
      detail = 'MAXIMUM • OVER THE ROPES';
    } else if (lastBall.runsBat === 4 || lastBall.isBoundaryFour) {
      activeType = 'boundary_four';
      playerName = lastBall.strikerName;
      detail = 'CRACKING BOUNDARY • FOUR RUNS';
    }
  }

  // Fallbacks for preview
  if (!playerName) {
    if (activeType === 'wicket') playerName = 'BATSMAN OUT';
    else if (activeType === 'boundary_six') playerName = 'POWER HITTER';
    else playerName = 'STRIKER';
  }

  const [visible, setVisible] = useState(true);

  // Pulse animation effect
  useEffect(() => {
    setVisible(true);
  }, [activeType, playerName]);

  return (
    <div
      className={`w-full max-w-4xl mx-auto flex flex-col items-center justify-center font-sans select-none animate-in fade-in zoom-in-95 duration-300 ${
        isStandalone ? 'p-6' : 'p-2'
      }`}
    >
      {/* 4 BOUNDARY */}
      {activeType === 'boundary_four' && (
        <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-950 to-amber-950 border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.5)] p-6 text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-amber-400 to-red-500" />
          
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-md">
              AZAD LIVE
            </span>
            <span className="text-xs uppercase tracking-widest font-black text-amber-400">
              BROADCAST MOMENT
            </span>
          </div>

          <div className="text-6xl sm:text-7xl font-black text-amber-400 tracking-tighter drop-shadow-[0_4px_12px_rgba(245,158,11,0.7)] flex items-center justify-center gap-3">
            <Flame className="w-12 h-12 text-amber-400 animate-bounce" />
            <span>FOUR!</span>
            <Flame className="w-12 h-12 text-amber-400 animate-bounce" />
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
            {playerName}
          </div>

          <div className="mt-1 text-xs sm:text-sm font-semibold text-blue-300 tracking-wider font-mono">
            {detail || 'SUPERB BOUNDARY ALONG THE GROUND'}
          </div>
        </div>
      )}

      {/* 6 MAXIMUM */}
      {activeType === 'boundary_six' && (
        <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-slate-950 to-rose-950 border-2 border-purple-500 shadow-[0_0_60px_rgba(168,85,247,0.6)] p-6 text-center">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400" />

          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md">
              AZAD LIVE
            </span>
            <span className="text-xs uppercase tracking-widest font-black text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              SUPER STRIKE
            </span>
          </div>

          <div className="text-6xl sm:text-8xl font-black text-purple-300 tracking-tighter drop-shadow-[0_6px_20px_rgba(168,85,247,0.9)] flex items-center justify-center gap-3">
            <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">
              SIX!
            </span>
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
            {playerName}
          </div>

          <div className="mt-1 text-xs sm:text-sm font-bold text-amber-300 tracking-wider">
            {detail || 'MONUMENTAL HIT OUT OF THE PARK • MAXIMUM'}
          </div>
        </div>
      )}

      {/* WICKET */}
      {activeType === 'wicket' && (
        <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950 via-slate-950 to-red-950 border-2 border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.7)] p-6 text-center">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md">
              AZAD LIVE
            </span>
            <span className="text-xs uppercase tracking-widest font-black text-rose-300 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              BREAKTHROUGH
            </span>
          </div>

          <div className="text-6xl sm:text-8xl font-black text-rose-500 tracking-tighter drop-shadow-[0_6px_20px_rgba(239,68,68,0.9)] flex items-center justify-center gap-3">
            <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              WICKET!
            </span>
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
            {playerName}
          </div>

          <div className="mt-1 text-xs sm:text-sm font-bold text-rose-300 uppercase tracking-wider font-mono">
            {detail || 'DISMISSED • HUGE BLOW FOR THE BATTING TEAM'}
          </div>
        </div>
      )}
    </div>
  );
};
