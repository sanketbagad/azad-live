import React, { useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { ScoreboardHeader } from './ScoreboardHeader';
import { DetailedScorecard } from './DetailedScorecard';
import { Share2, Check, Radio, Copy, MessageSquare, Flame } from 'lucide-react';

export const PublicLiveScoreView: React.FC = () => {
  const { state, activeMatchId, setActiveMatchId } = useCricket();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'commentary'>('scorecard');

  const matches = Object.values(state.matches);
  const targetMatchId = activeMatchId || matches[0]?.id;
  const match = state.matches[targetMatchId] || matches[0];

  if (!match) {
    return (
      <div className="card p-8 text-center text-slate-400">
        No matches available to display.
      </div>
    );
  }

  const shareUrl = `${window.location.origin}?public=true&matchId=${match.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentInn = match.innings[match.currentInningsIndex];
  // Reverse chronological commentary list
  const recentDeliveries = [...currentInn.deliveries].reverse();

  return (
    <div className="space-y-6">
      {/* Top Bar with Match Switcher and Share Button */}
      <div className="card p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-2xl font-display font-semibold tracking-wide leading-none text-white">
              Public Live Match Center
            </h2>
            <p className="text-xs text-slate-400">
              Spectator View • Real-time ball-by-ball broadcast • Read-only
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Match Picker */}
          <select
            value={match.id}
            onChange={(e) => setActiveMatchId(e.target.value)}
            className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.team1.shortName} vs {m.team2.shortName})
              </option>
            ))}
          </select>

          {/* Share Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Share Public Live Score'}</span>
          </button>
        </div>
      </div>

      {/* Main Broadcast Scoreboard */}
      <ScoreboardHeader match={match} />

      {/* Tab Switcher: Full Scorecard vs Ball-by-Ball Live Commentary */}
      <div className="flex space-x-2 border-b border-white/[0.06] pb-2">
        <button
          onClick={() => setActiveTab('scorecard')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'scorecard'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Full Match Scorecard
        </button>
        <button
          onClick={() => setActiveTab('commentary')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all ${
            activeTab === 'commentary'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Ball-by-Ball Commentary ({recentDeliveries.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'scorecard' ? (
        <DetailedScorecard match={match} />
      ) : (
        <div className="card p-4 sm:p-6 shadow-xl space-y-3">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
            Innings Commentary Feed ({match.team1.shortName} vs {match.team2.shortName})
          </h3>

          {recentDeliveries.length === 0 ? (
            <div className="py-8 text-center text-slate-500 italic text-xs">
              Waiting for first ball of the innings...
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {recentDeliveries.map((b) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-xl border flex items-start space-x-3 text-xs ${
                    b.isWicket
                      ? 'bg-rose-950/40 border-rose-700/60'
                      : b.runsBat === 6
                      ? 'bg-purple-950/40 border-purple-700/60'
                      : b.runsBat === 4
                      ? 'bg-blue-950/40 border-blue-700/60'
                      : 'bg-ink-950/60 border-white/[0.06]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                      b.isWicket
                        ? 'bg-rose-600 text-white'
                        : b.runsBat === 6
                        ? 'bg-purple-600 text-white'
                        : b.runsBat === 4
                        ? 'bg-blue-600 text-white'
                        : b.extraType === 'wide'
                        ? 'bg-amber-600 text-white'
                        : b.extraType === 'noBall'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/[0.05] text-slate-200'
                    }`}
                  >
                    {b.isWicket ? 'W' : b.extraType === 'wide' ? 'WD' : b.extraType === 'noBall' ? 'NB' : b.runsBat}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between text-slate-400 font-medium">
                      <span>
                        Over {b.overNumber}.{b.ballInOver} • {b.bowlerName} to {b.strikerName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-100 font-semibold mt-1">
                      {b.commentary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
