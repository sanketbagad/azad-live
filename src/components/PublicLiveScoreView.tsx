import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Share2, RotateCcw, Sparkles, MapPin, Trophy } from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import type { Match } from '../types/cricket';
import { DetailedScorecard } from './DetailedScorecard';
import { BallChip, EmptyBallSlot } from './live/BallChip';
import { EventFlash } from './live/EventFlash';
import { MatchReplay, ReplayMode } from './live/MatchReplay';
import { OversChart } from './live/OversChart';
import { CommentaryFeed } from './live/CommentaryFeed';
import { LiveVideoPlayer } from './live/LiveVideoPlayer';
import { calculateRunRate } from '../utils/cricketEngine';
import {
  chaseInfo,
  currentOverBalls,
  inningsTeams,
  partnership,
  projectedScore,
  situationText,
} from '../utils/liveMatch';

type Tab = 'live' | 'commentary' | 'scorecard' | 'overs';

const STATUS_ORDER: Record<Match['status'], number> = { live: 0, innings_break: 1, upcoming: 2, completed: 3, abandoned: 4 };

const StatusPill: React.FC<{ match: Match }> = ({ match }) => {
  if (match.status === 'live')
    return (
      <span className="chip bg-live-600/20 text-live-400 border border-live-500/40">
        <span className="live-dot" /> Live
      </span>
    );
  if (match.status === 'innings_break') return <span className="chip bg-trophy-500/15 text-trophy-300 border border-trophy-400/40">Innings break</span>;
  if (match.status === 'completed') return <span className="chip bg-pitch-500/15 text-pitch-400 border border-pitch-500/40">Result</span>;
  if (match.status === 'abandoned') return <span className="chip bg-white/5 text-slate-400 border border-white/10">Abandoned</span>;
  return <span className="chip bg-white/5 text-slate-300 border border-white/10">Upcoming</span>;
};

const Stat: React.FC<{ label: string; value: React.ReactNode; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="min-w-0 rounded-xl bg-white/[0.03] border border-white/[0.05] px-2.5 py-2">
    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 truncate">{label}</div>
    <div className={`text-sm font-black tabular-nums truncate ${accent ? 'text-trophy-300' : 'text-white'}`}>{value}</div>
  </div>
);

export const PublicLiveScoreView: React.FC<{ stickyTopClass?: string }> = ({ stickyTopClass = 'top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-16' }) => {
  const { state, activeMatchId, setActiveMatchId } = useCricket();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>('live');
  const [replayMode, setReplayMode] = useState<ReplayMode | null>(null);

  const matches = useMemo(
    () =>
      Object.values(state.matches).sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.updatedAt - a.updatedAt
      ),
    [state.matches]
  );
  const match = (activeMatchId && state.matches[activeMatchId]) || matches[0];
  const [viewInningsIdx, setViewInningsIdx] = useState<number>(match?.currentInningsIndex ?? 0);

  // Follow the live innings when it changes (or when switching matches)
  useEffect(() => {
    if (match) setViewInningsIdx(match.currentInningsIndex);
  }, [match?.id, match?.currentInningsIndex]);

  if (!match) {
    return <div className="card p-8 text-center text-slate-400">No matches available to display yet.</div>;
  }

  const inn = match.innings[match.currentInningsIndex];
  const { batting, bowling } = inningsTeams(match, inn);
  const otherInn = match.currentInningsIndex === 1 ? match.innings[0] : null;
  const striker = inn.batters.find((b) => b.playerId === inn.currentStrikerId);
  const nonStriker = inn.batters.find((b) => b.playerId === inn.currentNonStrikerId);
  const bowler = inn.bowlers.find((b) => b.playerId === inn.currentBowlerId);
  const crr = calculateRunRate(inn.totalRuns, inn.legalDeliveries);
  const chase = chaseInfo(match);
  const projected = projectedScore(match);
  const pship = partnership(inn);
  const overBalls = currentOverBalls(inn);
  const legalInOver = overBalls.filter((b) => b.isLegal).length;
  const overIsComplete = legalInOver >= 6;
  const lastWicket = inn.fallOfWickets[inn.fallOfWickets.length - 1];
  const lastWicketBatter = lastWicket ? inn.batters.find((b) => b.name === lastWicket.playerOutName) : undefined;
  const latestBall = inn.deliveries[inn.deliveries.length - 1];
  const isLive = match.status === 'live';
  const hasBalls = inn.deliveries.length > 0;
  const viewInn = match.innings[viewInningsIdx] || inn;
  const viewTeams = inningsTeams(match, viewInn);

  const shareUrl = `${window.location.origin}?public=true&matchId=${match.id}`;
  const handleShare = async () => {
    const text = `${match.team1.shortName} vs ${match.team2.shortName}: ${situationText(match)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: match.name, text, url: shareUrl });
        return;
      } catch {
        // cancelled: fall back to copying
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const batterRow = (b: typeof striker, onStrike: boolean) =>
    b ? (
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-3 py-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${onStrike ? 'bg-pitch-400' : 'bg-transparent'}`} aria-hidden />
          <span className="text-sm font-semibold text-white truncate">
            {b.name}
            {onStrike && <span className="text-pitch-400">*</span>}
          </span>
        </div>
        <span className="text-sm font-black text-white tabular-nums text-right w-14">
          {b.runs}
          <span className="text-xs font-semibold text-slate-500"> ({b.balls})</span>
        </span>
        <span className="text-xs text-slate-400 tabular-nums w-5 text-right">{b.fours}</span>
        <span className="text-xs text-slate-400 tabular-nums w-5 text-right">{b.sixes}</span>
        <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{b.strikeRate.toFixed(0)}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <EventFlash latestBall={isLive ? latestBall : undefined} />
      {replayMode && <MatchReplay match={match} mode={replayMode} onClose={() => setReplayMode(null)} />}

      {/* Match switcher */}
      {matches.length > 1 && (
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto scrollbar-none snap-x">
          {matches.map((m) => {
            const active = m.id === match.id;
            const mInn = m.innings[m.currentInningsIndex];
            return (
              <button
                key={m.id}
                onClick={() => setActiveMatchId(m.id)}
                className={`snap-start shrink-0 min-w-[150px] text-left rounded-2xl border px-3 py-2 transition-colors ${
                  active ? 'bg-brand-500/15 border-brand-400/50' : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {m.status === 'live' && <span className="live-dot" />}
                  <span className="truncate">{m.status === 'live' ? 'Live' : m.status.replace('_', ' ')}</span>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {m.team1.shortName} v {m.team2.shortName}
                </div>
                {mInn.legalDeliveries > 0 && (
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {mInn.totalRuns}/{mInn.wickets} ({mInn.oversFormatted})
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ===== Live video (when the match is being broadcast in the app) ===== */}
      <LiveVideoPlayer key={match.id} match={match} />

      {/* ===== Hero scoreboard ===== */}
      <section
        className="card overflow-hidden"
        style={{ backgroundImage: `linear-gradient(135deg, ${batting.color || '#06b6d4'}22, transparent 55%)` }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${batting.color || '#06b6d4'}, ${bowling.color || '#8b5cf6'})` }} />
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-[11px] text-slate-400 flex items-center gap-1.5">
              {match.tournamentName && <Trophy className="w-3 h-3 text-trophy-400 shrink-0" />}
              <span className="truncate">
                {[match.tournamentName, match.stage || match.name].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusPill match={match} />
              <button onClick={handleShare} className="w-9 h-9 grid place-items-center rounded-full bg-white/[0.06] border border-white/10" aria-label="Share live score">
                {copied ? <Check className="w-4 h-4 text-pitch-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Batting team score */}
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: batting.color || '#06b6d4' }} />
                <span className="text-sm font-bold text-slate-200 truncate">{batting.name}</span>
              </div>
              <motion.div
                key={`${inn.totalRuns}-${inn.wickets}`}
                initial={{ scale: 1.08, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display text-6xl sm:text-7xl font-bold leading-none text-white tabular-nums mt-1 origin-left"
              >
                {inn.totalRuns}
                <span className="text-slate-400">/{inn.wickets}</span>
              </motion.div>
              <div className="text-sm text-slate-400 tabular-nums mt-1">
                {inn.oversFormatted} <span className="text-slate-600">/ {match.overs} ov</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-semibold text-slate-400 truncate max-w-[120px]">{bowling.shortName}</div>
              <div className="text-lg font-black text-slate-200 tabular-nums">
                {otherInn ? `${otherInn.totalRuns}/${otherInn.wickets}` : '—'}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">{otherInn ? `(${otherInn.oversFormatted} ov)` : 'Yet to bat'}</div>
            </div>
          </div>

          {/* Situation ticker */}
          <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${chase ? 'bg-trophy-500/10 text-trophy-300' : match.status === 'completed' ? 'bg-pitch-500/10 text-pitch-400' : 'bg-white/[0.04] text-slate-200'}`}>
            {situationText(match)}
          </div>

          {/* Key numbers */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Stat label="CRR" value={crr.toFixed(2)} />
            {chase ? (
              <>
                <Stat label="RRR" value={chase.rrr !== null ? chase.rrr.toFixed(2) : '—'} accent />
                <Stat label="Target" value={chase.target} />
              </>
            ) : (
              <>
                <Stat label="Projected" value={projected ?? '—'} />
                <Stat label="Extras" value={inn.extras.total} />
              </>
            )}
            <Stat label="P'ship" value={`${pship.runs}(${pship.balls})`} />
          </div>

          {/* This over */}
          {hasBalls && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {overIsComplete ? `Over ${overBalls[0].overNumber + 1} (complete)` : 'This over'}
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {overBalls.reduce((s, b) => s + b.runsBat + b.runsExtra, 0)} runs
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {overBalls.map((b) => (
                  <motion.span key={b.id} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                    <BallChip ball={b} />
                  </motion.span>
                ))}
                {!overIsComplete && Array.from({ length: 6 - legalInOver }).map((_, i) => <EmptyBallSlot key={`e${i}`} />)}
              </div>
            </div>
          )}

          {/* Replays */}
          {hasBalls && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setReplayMode('over')} className="btn-ghost !min-h-11 text-xs">
                <RotateCcw className="w-4 h-4 text-brand-300" /> Replay over
              </button>
              <button onClick={() => setReplayMode('highlights')} className="btn-ghost !min-h-11 text-xs">
                <Sparkles className="w-4 h-4 text-trophy-400" /> Key moments
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===== At the crease ===== */}
      {hasBalls && match.status !== 'completed' && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-white/[0.05]">
              <span>Batting</span>
              <span className="w-14 text-right">R (B)</span>
              <span className="w-5 text-right">4s</span>
              <span className="w-5 text-right">6s</span>
              <span className="w-10 text-right">SR</span>
            </div>
            {batterRow(striker, true)}
            {batterRow(nonStriker, false)}
            {!striker && !nonStriker && <div className="py-3 text-xs text-slate-500">New batter coming in…</div>}
          </div>

          <div className="card p-4 space-y-3">
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-white/[0.05]">
                <span>Bowling</span>
                <span>O-M-R-W</span>
              </div>
              {bowler ? (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-semibold text-white truncate">{bowler.name}</span>
                  <span className="text-sm font-black text-white tabular-nums" title="Overs-Maidens-Runs-Wickets">
                    {bowler.overs}-{bowler.maidens}-{bowler.runsConceded}-{bowler.wickets}
                    <span className="text-xs font-semibold text-slate-500"> · Econ {bowler.economy.toFixed(1)}</span>
                  </span>
                </div>
              ) : (
                <div className="py-2 text-xs text-slate-500">Bowler changing…</div>
              )}
            </div>
            {lastWicket && (
              <div className="rounded-xl bg-live-600/10 border border-live-500/20 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-live-400">Last wicket</div>
                <div className="text-xs text-slate-200 mt-0.5">
                  <span className="font-bold">{lastWicket.playerOutName}</span>
                  {lastWicketBatter && (
                    <span className="tabular-nums">
                      {' '}
                      {lastWicketBatter.runs} ({lastWicketBatter.balls})
                    </span>
                  )}
                  <span className="text-slate-500 tabular-nums">
                    {' '}
                    · {lastWicket.score}/{lastWicket.wicketNumber} ({lastWicket.over})
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Result / player of the match */}
      {match.status === 'completed' && match.result && (
        <section className="card p-5 text-center bg-gradient-to-br from-pitch-500/10 to-transparent">
          <Trophy className="w-8 h-8 text-trophy-400 mx-auto" />
          <div className="font-display text-3xl font-semibold text-white mt-2">{match.result.winnerName || 'Match result'}</div>
          <div className="text-sm text-slate-300 mt-1">{match.result.summaryText}</div>
          {match.result.playerOfTheMatch && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-trophy-500/10 border border-trophy-400/30 px-3 py-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-trophy-400" />
              <span className="text-slate-300">Player of the match</span>
              <span className="font-bold text-white">{match.result.playerOfTheMatch.name}</span>
            </div>
          )}
        </section>
      )}

      {/* ===== Tabs ===== */}
      <div className={`sticky ${stickyTopClass} z-10 -mx-4 px-4 py-2 bg-ink-900/85 backdrop-blur-xl`}>
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          {(
            [
              ['live', 'Live'],
              ['commentary', 'Commentary'],
              ['scorecard', 'Scorecard'],
              ['overs', 'Overs'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative h-10 rounded-xl text-xs font-bold transition-colors ${tab === key ? 'text-ink-950' : 'text-slate-400'}`}
            >
              {tab === key && <motion.span layoutId="live-tab" className="absolute inset-0 rounded-xl bg-white" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Innings picker for commentary & overs */}
      {(tab === 'commentary' || tab === 'overs') && match.innings[1].deliveries.length > 0 && (
        <div className="flex gap-2">
          {match.innings.map((i, idx) => {
            const t = inningsTeams(match, i);
            return (
              <button
                key={idx}
                onClick={() => setViewInningsIdx(idx)}
                className={`h-9 px-3.5 rounded-full text-xs font-bold border ${
                  viewInningsIdx === idx ? 'bg-brand-500/15 border-brand-400/50 text-white' : 'bg-white/[0.03] border-white/10 text-slate-400'
                }`}
              >
                {t.batting.shortName} innings
              </button>
            );
          })}
        </div>
      )}

      <div className="card p-4 sm:p-5">
        {tab === 'live' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Latest balls</h3>
              {hasBalls && (
                <button onClick={() => setTab('commentary')} className="text-xs font-semibold text-brand-300">
                  Full commentary →
                </button>
              )}
            </div>
            <CommentaryFeed innings={inn} limit={6} />
          </>
        )}
        {tab === 'commentary' && <CommentaryFeed innings={viewInn} />}
        {tab === 'scorecard' && <DetailedScorecard match={match} />}
        {tab === 'overs' && <OversChart innings={viewInn} maxOvers={match.overs} teamName={viewTeams.batting.name} />}
      </div>

      {match.venue && (
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1 pb-2">
          <MapPin className="w-3 h-3" /> {match.venue}
          {match.date && ` · ${new Date(match.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </div>
      )}
    </div>
  );
};
