import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import type { Match } from '../../types/cricket';
import { BallChip } from './BallChip';
import { ballKind, ballOverLabel, currentOverBalls, inningsTeams, runningScores } from '../../utils/liveMatch';

export type ReplayMode = 'over' | 'highlights';

const STEP_MS = 1900;

const KIND_HEADLINE: Record<string, string> = {
  wicket: 'WICKET!',
  six: 'SIX!',
  four: 'FOUR!',
  extra: 'EXTRA',
  dot: 'DOT BALL',
  runs: '',
};

/**
 * Animated ball-by-ball recap: the current/last over, or every 4, 6 and wicket of the innings.
 * Rendered as a bottom sheet on phones and a centered dialog on larger screens.
 */
export const MatchReplay: React.FC<{ match: Match; mode: ReplayMode; onClose: () => void }> = ({ match, mode, onClose }) => {
  const inn = match.innings[match.currentInningsIndex];
  const { batting } = inningsTeams(match, inn);
  const scores = useMemo(() => runningScores(inn), [inn]);

  const steps = useMemo(() => {
    const indexed = inn.deliveries.map((ball, i) => ({ ball, score: scores[i] }));
    if (mode === 'over') {
      const overBalls = new Set(currentOverBalls(inn).map((b) => b.id));
      return indexed.filter((s) => overBalls.has(s.ball.id));
    }
    return indexed.filter((s) => ['four', 'six', 'wicket'].includes(ballKind(s.ball)));
  }, [inn, scores, mode]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    if (idx >= steps.length - 1) {
      const t = setTimeout(() => setPlaying(false), STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [idx, playing, steps.length]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const step = steps[idx];
  const kind = step ? ballKind(step.ball) : 'dot';
  const title =
    mode === 'over'
      ? step
        ? `Over ${step.ball.overNumber + 1} · ${step.ball.bowlerName}`
        : 'This over'
      : `Key moments · ${batting.shortName} innings`;

  const restart = () => {
    setIdx(0);
    setPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Replay">
      <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-ink-850 border border-white/10 shadow-2xl pb-safe overflow-hidden"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-pulse-400 flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" /> Replay
            </div>
            <h3 className="font-display text-2xl font-semibold text-white leading-tight truncate">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 shrink-0" aria-label="Close replay">
            <X className="w-4 h-4" />
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="px-5 pb-8 pt-4 text-center text-sm text-slate-400">
            {mode === 'over' ? 'No balls bowled yet in this innings.' : 'No fours, sixes or wickets yet in this innings.'}
          </div>
        ) : (
          <>
            {/* Stage */}
            <div className="relative mx-4 rounded-2xl bg-gradient-to-b from-[#0b3528] to-[#052219] border border-white/[0.06] overflow-hidden">
              <div className="absolute inset-x-[38%] top-6 bottom-6 rounded-md bg-[#bfa176]/15" aria-hidden />
              <div className="relative px-4 pt-3 flex items-center justify-between text-xs">
                <span className="font-bold text-white/90">{batting.shortName}</span>
                <span className="font-display text-2xl font-semibold text-white tabular-nums">
                  {step.score.runs}/{step.score.wickets}
                  <span className="text-sm text-white/60 ml-1.5">({ballOverLabel(step.ball)})</span>
                </span>
              </div>
              <div className="relative h-44 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.ball.id}
                    className="flex flex-col items-center"
                    initial={{ scale: 0.3, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                  >
                    <BallChip ball={step.ball} size="lg" className="shadow-2xl" />
                    {KIND_HEADLINE[kind] && (
                      <span className="mt-2 font-display text-3xl font-bold text-white tracking-wide">{KIND_HEADLINE[kind]}</span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Commentary for this ball */}
            <div className="px-5 pt-3 min-h-[72px]">
              <div className="text-[11px] font-semibold text-slate-500">
                {ballOverLabel(step.ball)} · {step.ball.bowlerName} to {step.ball.strikerName}
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">{step.ball.commentary}</p>
            </div>

            {/* Timeline */}
            <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto scrollbar-none">
              {steps.map((s, i) => (
                <button
                  key={s.ball.id}
                  onClick={() => {
                    setIdx(i);
                    setPlaying(false);
                  }}
                  className={`rounded-full p-0.5 transition-all ${i === idx ? 'ring-2 ring-white' : i > idx ? 'opacity-40' : ''}`}
                  aria-label={`Ball ${ballOverLabel(s.ball)}`}
                >
                  <BallChip ball={s.ball} size="sm" />
                </button>
              ))}
            </div>
            <div className="mx-5 mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-400 to-pulse-500"
                animate={{ width: `${((idx + 1) / steps.length) * 100}%` }}
              />
            </div>

            {/* Controls */}
            <div className="px-5 py-4 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setIdx((i) => Math.max(0, i - 1));
                  setPlaying(false);
                }}
                disabled={idx === 0}
                className="w-12 h-12 grid place-items-center rounded-full bg-white/[0.05] disabled:opacity-30"
                aria-label="Previous ball"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {idx >= steps.length - 1 && !playing ? (
                <button onClick={restart} className="h-12 px-6 rounded-full bg-white text-ink-950 font-bold text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Replay again
                </button>
              ) : (
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="w-14 h-14 grid place-items-center rounded-full bg-white text-ink-950"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
              )}
              <button
                onClick={() => {
                  setIdx((i) => Math.min(steps.length - 1, i + 1));
                  setPlaying(false);
                }}
                disabled={idx >= steps.length - 1}
                className="w-12 h-12 grid place-items-center rounded-full bg-white/[0.05] disabled:opacity-30"
                aria-label="Next ball"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
