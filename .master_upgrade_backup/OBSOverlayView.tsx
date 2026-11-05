import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { getBallTypeBadge } from './ScoreboardHeader';
import { calculateRunRate, calculateRequiredRunRate } from '../utils/cricketEngine';
import { Copy, Check, Tv, ExternalLink, Monitor, HelpCircle, Trophy, TableProperties, Award, Calendar, Users, Sliders, Flame, Sparkles, AlertOctagon } from 'lucide-react';
import { ScorecardOverlay } from './overlays/ScorecardOverlay';
import { PointsTableOverlay } from './overlays/PointsTableOverlay';
import { LeaderboardOverlay } from './overlays/LeaderboardOverlay';
import { PlayerStatusOverlay } from './overlays/PlayerStatusOverlay';
import { FixturesOverlay } from './overlays/FixturesOverlay';
import { EndOfOverOverlay } from './overlays/EndOfOverOverlay';
import { MatchResultOverlay } from './overlays/MatchResultOverlay';
import { ManOfTheMatchOverlay } from './overlays/ManOfTheMatchOverlay';
import { EventAnimationOverlay } from './overlays/EventAnimationOverlay';
import { SponsorOverlayBug, defaultBroadcastSponsors } from './overlays/SponsorOverlayBug';
import { SponsorControlModal } from './overlays/SponsorControlModal';
import { PRISMOverlayUrlList } from './overlays/PRISMOverlayUrlList';
import { BroadcastEventType, BroadcastSponsor } from '../types/cricket';

export type OverlayTheme =
  | 'lower_third'
  | 'top_ticker'
  | 'scorecard'
  | 'points_table'
  | 'leaderboard'
  | 'player_status'
  | 'fixtures'
  | 'end_of_over'
  | 'match_result'
  | 'mom'
  | 'event_animation';

interface OBSOverlayViewProps {
  matchId?: string;
  theme?: string;
  isStandalone?: boolean; // When rendered directly inside OBS or PRISM Browser Source
}

export const OBSOverlayView: React.FC<OBSOverlayViewProps> = ({
  matchId,
  theme,
  isStandalone = false,
}) => {
  const { state, activeMatchId } = useCricket();
  const [copied, setCopied] = useState(false);
  const [sponsors, setSponsors] = useState<BroadcastSponsor[]>(() => {
    try {
      const saved = localStorage.getItem('azad_broadcast_sponsors');
      return saved ? JSON.parse(saved) : defaultBroadcastSponsors;
    } catch {
      return defaultBroadcastSponsors;
    }
  });
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [testEventType, setTestEventType] = useState<BroadcastEventType>('boundary_six');

  const handleUpdateSponsors = (updated: BroadcastSponsor[]) => {
    setSponsors(updated);
    try {
      localStorage.setItem('azad_broadcast_sponsors', JSON.stringify(updated));
    } catch {
      // storage fallback
    }
  };

  // Check URL param or prop for theme
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTheme = (theme || urlParams?.get('theme') || 'lower_third') as OverlayTheme;
  const [overlayStyle, setOverlayStyle] = useState<OverlayTheme>(initialTheme);

  const targetMatchId = matchId || activeMatchId || (state.matches['match_1792015766770_0e50'] ? 'match_1792015766770_0e50' : Object.keys(state.matches)[0]);
  const match = state.matches[targetMatchId];

  // Enforce transparent background and no scrollbars in standalone overlay mode
  React.useEffect(() => {
    if (isStandalone) {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  }, [isStandalone]);

  if (!match) {
    return (
      <div className="p-8 text-center text-slate-400">
        No active match selected for broadcast overlay.
      </div>
    );
  }

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

  const recentBalls = currentInn.deliveries.slice(-6);
  const ballBadge = getBallTypeBadge(match.ballType);

  // Exact OBS Browser Source URL for the active theme
  const obsUrl = `${window.location.origin}?obs=true&matchId=${match.id}&theme=${overlayStyle}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Pure OBS Lower-Third / Ticker Component (Transparent Background) - 100% PRESERVED
  const OverlayGraphic = (
    <div
      className={`w-full max-w-6xl mx-auto font-sans select-none ${
        overlayStyle === 'lower_third' ? 'my-auto' : 'mt-2'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Primary Broadcast Ticker Bar */}
      <div className="bg-slate-950/95 border-y-2 border-amber-500 shadow-[0_10px_35px_rgba(0,0,0,0.95)] backdrop-blur-md text-white rounded-xl overflow-hidden flex flex-col md:flex-row items-stretch">
        {/* Left Team & Live Score Box */}
        <div className="bg-gradient-to-r from-red-950/90 via-slate-950 to-slate-900 px-5 py-3 flex items-center space-x-3 sm:space-x-4 border-b md:border-b-0 md:border-r border-slate-800 relative">
          <div className="flex flex-col items-center justify-center mr-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-sm shadow-red-500/40 border border-red-500/60 leading-none">
              AZAD LIVE
            </span>
          </div>

          <div
            className="w-3.5 h-10 rounded-full"
            style={{ backgroundColor: battingTeam.color || '#E11D48' }}
          />

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-tight text-white uppercase">
                {battingTeam.shortName}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-bold border border-amber-700/60">
                {ballBadge.icon} {ballBadge.label}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              vs {bowlingTeam.shortName} • {match.overs} ov
            </div>
          </div>

          <div className="pl-3 border-l border-slate-800 text-right font-mono">
            <div className="text-3xl font-black text-amber-400 tracking-tight leading-none">
              {currentInn.totalRuns}
              <span className="text-white text-2xl font-bold">/{currentInn.wickets}</span>
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">
              {currentInn.oversFormatted} ov
            </div>
          </div>
        </div>

        {/* Center: Batters & Bowler Figures */}
        <div className="flex-1 px-4 py-2.5 grid grid-cols-2 gap-3 items-center text-xs border-b md:border-b-0 md:border-r border-slate-800">
          {/* Batters */}
          <div className="space-y-1">
            {striker && (
              <div className="flex items-center justify-between font-semibold text-white">
                <span className="truncate flex items-center">
                  <span className="text-cyan-400 mr-1">*</span>
                  <span className="truncate">{striker.name}</span>
                </span>
                <span className="font-mono text-cyan-300 ml-2">
                  {striker.runs} <span className="text-slate-400 font-normal">({striker.balls})</span>
                </span>
              </div>
            )}
            {nonStriker && (
              <div className="flex items-center justify-between text-slate-300 font-normal">
                <span className="truncate">{nonStriker.name}</span>
                <span className="font-mono text-slate-400 ml-2">
                  {nonStriker.runs} <span className="text-slate-500 font-normal">({nonStriker.balls})</span>
                </span>
              </div>
            )}
          </div>

          {/* Bowler */}
          <div className="space-y-1 pl-3 border-l border-slate-800/80">
            {bowler && (
              <>
                <div className="flex items-center justify-between font-semibold text-white">
                  <span className="truncate">{bowler.name}</span>
                  <span className="font-mono text-amber-300 ml-2">
                    {bowler.wickets}-{bowler.runsConceded}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{bowler.overs} ov</span>
                  <span>Econ {bowler.economy.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Target Equation & This Over Balls */}
        <div className="bg-slate-950 px-4 py-2.5 flex flex-col justify-center min-w-[220px]">
          {match.status === 'completed' && match.result ? (
            <div className="text-center font-bold text-xs text-emerald-400">
              {match.result.summaryText}
            </div>
          ) : currentIdx === 1 && match.target ? (
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-400">Target {match.target}</span>
                <span className="text-cyan-300 font-mono font-bold">
                  Need {runsNeeded} ({ballsRemaining}b)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>CRR: {crr.toFixed(1)}</span>
                {rrr !== null && <span>RRR: <strong className="text-amber-400">{rrr.toFixed(1)}</strong></span>}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>CRR: <strong className="text-white">{crr.toFixed(2)}</strong></span>
              <span>1st Innings</span>
            </div>
          )}

          {/* Recent balls strip */}
          <div className="flex items-center space-x-1 mt-1.5 pt-1.5 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Over:</span>
            {recentBalls.length === 0 ? (
              <span className="text-[10px] text-slate-500 italic">...</span>
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

  // Render overlay based on the requested theme
  const renderBroadcastContent = () => {
    switch (overlayStyle) {
      case 'scorecard':
        return <ScorecardOverlay match={match} isStandalone={isStandalone} />;
      case 'end_of_over':
        return <EndOfOverOverlay match={match} isStandalone={isStandalone} />;
      case 'match_result':
        return <MatchResultOverlay match={match} isStandalone={isStandalone} />;
      case 'mom':
        return <ManOfTheMatchOverlay match={match} isStandalone={isStandalone} />;
      case 'event_animation':
        return <EventAnimationOverlay match={match} isStandalone={isStandalone} eventType={testEventType} />;
      case 'points_table':
        return <PointsTableOverlay matchId={match.id} tournamentId={match.tournamentId} />;
      case 'leaderboard':
        return <LeaderboardOverlay matchId={match.id} tournamentId={match.tournamentId} />;
      case 'player_status':
        return <PlayerStatusOverlay match={match} isStandalone={isStandalone} />;
      case 'fixtures':
        return <FixturesOverlay matchId={match.id} tournamentId={match.tournamentId} />;
      case 'top_ticker':
      case 'lower_third':
      default:
        return OverlayGraphic;
    }
  };

  // If running in standalone OBS / PRISM Browser Source mode, return ONLY the graphic on transparent background!
  if (isStandalone) {
    const isFullScreen16x9 =
      overlayStyle === 'scorecard' ||
      overlayStyle === 'end_of_over' ||
      overlayStyle === 'match_result' ||
      overlayStyle === 'mom' ||
      overlayStyle === 'event_animation' ||
      overlayStyle === 'points_table' ||
      overlayStyle === 'leaderboard' ||
      overlayStyle === 'player_status' ||
      overlayStyle === 'fixtures';

    return (
      <div
        className={`w-screen h-screen flex flex-col p-4 sm:p-6 bg-transparent select-none overflow-hidden relative ${
          isFullScreen16x9
            ? 'justify-center items-center'
            : overlayStyle === 'top_ticker'
            ? 'justify-start'
            : 'justify-end pb-8'
        }`}
      >
        {/* Floating Top-Right Corner Bug for Standalone Stream */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <SponsorOverlayBug placement="corner_bug" sponsors={sponsors} />
        </div>

        {renderBroadcastContent()}
      </div>
    );
  }

  // Dashboard Preview & Setup Mode inside main application
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-black tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-sm shadow-red-500/30 border border-red-500/60 leading-none">
              AZAD LIVE
            </span>
            <Tv className="w-5 h-5 text-amber-400" />
            <span>PRISM & OBS Broadcast Pack</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Professional broadcast-grade transparent overlays for PRISM Live Studio, OBS Studio, and vMix with real-time scoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sponsor Manager Button */}
          <button
            onClick={() => setIsSponsorModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-600/40 shadow-md transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Sponsors & Bugs ({sponsors.filter((s) => s.enabled).length})</span>
          </button>

          <button
            onClick={handleCopyUrl}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Active Overlay URL!' : 'Copy Active Overlay URL'}</span>
          </button>
        </div>
      </div>

      {/* Theme Selector Tab Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Select Broadcast Overlay to Preview ({overlayStyle.replace('_', ' ').toUpperCase()}):
          </span>
          <span className="text-[11px] font-mono text-cyan-400">11 Broadcast Overlays Available</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'lower_third', label: '1. Lower Third (Live Score)', icon: Tv },
            { id: 'top_ticker', label: '2. Top Ticker Bar', icon: Tv },
            { id: 'scorecard', label: '3. Full Scorecard (16:9)', icon: TableProperties },
            { id: 'end_of_over', label: '4. End-of-Over Scorecard', icon: Award },
            { id: 'match_result', label: '5. Match Result & Summary', icon: Trophy },
            { id: 'mom', label: '6. Man of the Match Card', icon: Sparkles },
            { id: 'event_animation', label: '7. Boundary & Wicket Alert', icon: Flame },
            { id: 'points_table', label: '8. Points Table (16:9)', icon: Trophy },
            { id: 'leaderboard', label: '9. Player Leaderboard (16:9)', icon: Award },
            { id: 'player_status', label: '10. Player Status & Squads', icon: Users },
            { id: 'fixtures', label: '11. Fixtures Schedule', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = overlayStyle === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setOverlayStyle(tab.id as OverlayTheme)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-950 font-black'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Event Animation Quick Triggers (when previewing event animation) */}
        {overlayStyle === 'event_animation' && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-semibold">Test Event Banner:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTestEventType('boundary_four')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  testEventType === 'boundary_four'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Test FOUR
              </button>
              <button
                onClick={() => setTestEventType('boundary_six')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  testEventType === 'boundary_six'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Test SIX
              </button>
              <button
                onClick={() => setTestEventType('wicket')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  testEventType === 'wicket'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Test WICKET
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview Container (Simulating live cricket video feed behind overlay) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span>Live Stream Preview ({overlayStyle.replace('_', ' ').toUpperCase()})</span>
          </span>
          <span className="text-xs text-emerald-400 font-mono font-semibold flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync Active</span>
          </span>
        </div>

        {/* Video Simulation Box */}
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-center items-center p-4 sm:p-8"
          style={{
            minHeight: '440px',
            backgroundImage:
              'linear-gradient(to bottom, rgba(11, 19, 43, 0.5), rgba(11, 19, 43, 0.9)), url("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Preview Corner Bug */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none hidden sm:block">
            <SponsorOverlayBug placement="top_right" sponsors={sponsors} />
          </div>

          {renderBroadcastContent()}
        </div>
      </div>

      {/* PRISM Overlay URLs List with Copy Buttons */}
      <PRISMOverlayUrlList initialMatchId={match.id} />

      {/* Sponsor Manager Modal */}
      <SponsorControlModal
        isOpen={isSponsorModalOpen}
        onClose={() => setIsSponsorModalOpen(false)}
        onUpdateSponsors={handleUpdateSponsors}
        currentSponsors={sponsors}
      />
    </div>
  );
};
