import React, { useState } from 'react';
import { useCricket } from '../../context/CricketContext';
import { Copy, Check, ExternalLink, Tv, Trophy, Award, Users, Calendar, TableProperties, Flame, Sparkles } from 'lucide-react';

interface PRISMOverlayUrlListProps {
  initialMatchId?: string;
  showMatchSelector?: boolean;
}

export const PRISMOverlayUrlList: React.FC<PRISMOverlayUrlListProps> = ({
  initialMatchId,
  showMatchSelector = true,
}) => {
  const { state, activeMatchId, setActiveMatchId } = useCricket();

  const matches = Object.values(state.matches);
  const defaultMatchId =
    initialMatchId ||
    activeMatchId ||
    (state.matches['match_1792015766770_0e50'] ? 'match_1792015766770_0e50' : matches[0]?.id || '');

  const [selectedMatchId, setSelectedMatchId] = useState<string>(defaultMatchId);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedMatch = state.matches[selectedMatchId] || state.matches[defaultMatchId] || matches[0];
  const origin = window.location.origin;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  if (!selectedMatch) {
    return (
      <div className="p-6 text-center text-slate-400 card">
        No matches available to generate broadcast URLs.
      </div>
    );
  }

  const overlays = [
    {
      key: 'lower_third',
      name: '1. Live Score (Lower Third)',
      tag: 'CURRENT WORKING OVERLAY',
      tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
      description: 'Transparent scoreboard lower-third showing live score, overs, striker (*), non-striker, bowler, and recent balls.',
      icon: Tv,
      iconColor: 'text-purple-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=lower_third`,
      recommendedRes: '1920×1080 (or 1920×220 bottom crop)',
      usage: 'Keep active on screen during normal live match gameplay.',
    },
    {
      key: 'top_ticker',
      name: '2. Top Ticker Score Bar',
      tag: 'COMPACT 1920×80',
      tagColor: 'bg-white/[0.05] text-amber-300 border-amber-600/50',
      description: 'Compact horizontal ticker placed at top of stream displaying live score, overs, batsmen, bowler, and run rate.',
      icon: Tv,
      iconColor: 'text-amber-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=top_ticker`,
      recommendedRes: '1920×80 (Top Banner Crop)',
      usage: 'Show at the top edge when lower stream graphics are reserved for chat or webcam.',
    },
    {
      key: 'scorecard',
      name: '3. Live Scorecard (Full Innings)',
      tag: 'FULL SCREEN 16:9',
      tagColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      description: 'Comprehensive 2-innings batting & bowling figures, target equation, CRR/RRR, and dismissal breakdown.',
      icon: TableProperties,
      iconColor: 'text-cyan-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=scorecard`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show during innings break, drinks break, or fall of wickets.',
    },
    {
      key: 'end_of_over',
      name: '4. End-of-Over Full Scorecard',
      tag: 'OVER SUMMARY',
      tagColor: 'bg-amber-950 text-amber-300 border-amber-800',
      description: 'Displays end-of-over breakdown: runs in this over, bowler figures, active batsmen scores, and ball-by-ball delivery pills.',
      icon: Award,
      iconColor: 'text-amber-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=end_of_over`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show for 8-15 seconds at the end of each over.',
    },
    {
      key: 'match_result',
      name: '5. Match Result & Official Summary',
      tag: 'FINAL RESULT',
      tagColor: 'bg-red-950 text-rose-300 border-red-700',
      description: 'Official winner celebration banner, margin of victory, full 1st & 2nd innings totals, and top performers.',
      icon: Trophy,
      iconColor: 'text-amber-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=match_result`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show immediately after match finishes and during post-match commentary.',
    },
    {
      key: 'mom',
      name: '6. Man of the Match Award Display',
      tag: 'PLAYER OF THE MATCH',
      tagColor: 'bg-purple-950 text-purple-300 border-purple-800',
      description: 'Highlights the Player of the Match with award points, batting runs/balls/boundaries, and bowling wickets/economy.',
      icon: Sparkles,
      iconColor: 'text-amber-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=mom`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show during post-match awards presentation ceremony.',
    },
    {
      key: 'event_animation',
      name: '7. Four, Six & Wicket Event Alert',
      tag: 'BROADCAST CELEBRATION',
      tagColor: 'bg-rose-950 text-rose-300 border-rose-800',
      description: 'Energetic celebration overlay banner with animations triggered on boundaries (4 & 6) and wickets.',
      icon: Flame,
      iconColor: 'text-rose-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=event_animation`,
      recommendedRes: '1920×1080 (Transparent Alert)',
      usage: 'Keep as a browser source layer above the stream to flash boundary & dismissal alerts.',
    },
    {
      key: 'points_table',
      name: '8. Points Table (Standings & NRR)',
      tag: 'TOURNAMENT STANDINGS',
      tagColor: 'bg-blue-950 text-blue-300 border-blue-800',
      description: 'Official tournament points table with matches played, won, lost, Net Run Rate (NRR), points, and top-4 playoff cutoffs.',
      icon: Trophy,
      iconColor: 'text-amber-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=points_table`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show pre-match, post-match, or during tournament analysis.',
    },
    {
      key: 'leaderboard',
      name: '9. Player Leaderboard (Orange/Purple Cap & MVP)',
      tag: 'STATS & LEADERS',
      tagColor: 'bg-amber-950 text-amber-300 border-amber-800',
      description: 'Top tournament run scorers (Orange Cap), leading wicket takers (Purple Cap), and MVP point rankings computed from actual deliveries.',
      icon: Award,
      iconColor: 'text-orange-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=leaderboard`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show when highlighting top players or during post-match awards.',
    },
    {
      key: 'player_status',
      name: '10. Player Status & Squads',
      tag: 'PLAYING XI STATUS',
      tagColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
      description: 'Both teams playing squads with real-time roles: active striker (*), non-striker, current bowler, dismissed batters, and yet-to-bat squad.',
      icon: Users,
      iconColor: 'text-indigo-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=player_status`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show at the toss, team lineup introductions, or during strategic intervals.',
    },
    {
      key: 'fixtures',
      name: '11. Fixtures & Tournament Schedule',
      tag: 'SCHEDULE & RESULTS',
      tagColor: 'bg-teal-950 text-teal-300 border-teal-800',
      description: 'Live in-progress matches, upcoming tournament fixtures schedule, and official recent match results with victory margins.',
      icon: Calendar,
      iconColor: 'text-emerald-400',
      url: `${origin}?obs=true&matchId=${selectedMatch.id}&theme=fixtures`,
      recommendedRes: '1920×1080 (16:9 Landscape)',
      usage: 'Show to inform viewers about upcoming matches and tournament calendar.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Match Selector & Tournament Context */}
      {showMatchSelector && (
        <div className="card p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded tracking-widest shadow-sm">
                AZAD LIVE
              </span>
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <Tv className="w-5 h-5 text-amber-400" />
                <span>PRISM & OBS Broadcast Overlays</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time transparent graphics URLs for PRISM Live Studio, OBS Studio, and vMix widgets
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium">Active Match:</span>
            <select
              value={selectedMatchId}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                setActiveMatchId(e.target.value);
              }}
              className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-brand-400"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.tournamentName ? `(${m.tournamentName})` : ''} - [{m.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Overlays Card Grid */}
      <div className="grid grid-cols-1 gap-4">
        {overlays.map((item) => {
          const Icon = item.icon;
          const isCopied = copiedKey === item.key;

          return (
            <div
              key={item.key}
              className="bg-ink-850 border border-white/[0.06] hover:border-white/10 rounded-2xl p-5 shadow-xl transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center ${item.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-white">{item.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black border ${item.tagColor}`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
                  >
                    <span>Test Overlay</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleCopy(item.url, item.key)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-cyan-950 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Copied URL!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>

              {/* URL Box */}
              <div className="flex items-center space-x-2 bg-ink-950/60 border border-white/[0.06] rounded-xl px-3 py-2">
                <span className="text-[11px] font-mono text-cyan-300 truncate select-all flex-1">
                  {item.url}
                </span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 hidden sm:inline">
                  {item.recommendedRes}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>{item.usage}</span>
                <span className="text-emerald-400 font-medium">Automatic 100% transparent background</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* PRISM Setup Guide Callout */}
      <div className="card p-6 shadow-xl space-y-3">
        <h4 className="text-sm font-black text-white flex items-center space-x-2">
          <Tv className="w-4 h-4 text-cyan-400" />
          <span>How to Add These Overlays to PRISM Live Studio on Phone 1</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-ink-950/70 border border-white/[0.06] space-y-1">
            <div className="text-cyan-400 font-bold mb-1">Step 1: Copy Desired Overlay URL</div>
            <p className="text-slate-400 text-[11px]">
              Click the &quot;Copy URL&quot; button for the overlay you want (e.g. Live Score Lower Third or Full Scorecard).
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-ink-950/70 border border-white/[0.06] space-y-1">
            <div className="text-cyan-400 font-bold mb-1">Step 2: Add PRISM Web Widget</div>
            <p className="text-slate-400 text-[11px]">
              In PRISM Live Studio, tap the <strong>Widget (+)</strong> icon &rarr; select <strong>Web Widget (Browser Source)</strong> &rarr; paste the URL.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-ink-950/70 border border-white/[0.06] space-y-1">
            <div className="text-cyan-400 font-bold mb-1">Step 3: Broadcast & Score Live</div>
            <p className="text-slate-400 text-[11px]">
              The background is already 100% transparent! Phone 1 streams the match while Phone 2 updates scores in real time without refreshing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
