import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { BallDelivery } from '../../types/cricket';
import { ballKind } from '../../utils/liveMatch';

const STYLES = {
  four: { word: 'FOUR', gradient: 'from-brand-500 to-brand-700', glow: 'shadow-brand-500/40' },
  six: { word: 'SIX', gradient: 'from-pulse-500 to-fuchsia-700', glow: 'shadow-pulse-500/40' },
  wicket: { word: 'WICKET', gradient: 'from-live-500 to-live-600', glow: 'shadow-live-500/40' },
} as const;

type FlashKind = keyof typeof STYLES;

/**
 * TV-style full-width flash when a new FOUR / SIX / WICKET arrives.
 * Ignores the ball that was already there on mount (no flash on page load).
 */
export const EventFlash: React.FC<{ latestBall?: BallDelivery }> = ({ latestBall }) => {
  const seenRef = useRef<string | null | undefined>(undefined);
  const [flash, setFlash] = useState<{ id: string; kind: FlashKind; who: string; detail: string } | null>(null);

  useEffect(() => {
    const id = latestBall?.id ?? null;
    if (seenRef.current === undefined || id === seenRef.current) {
      seenRef.current = id;
      return;
    }
    seenRef.current = id;
    if (!latestBall) return;
    const kind = ballKind(latestBall);
    if (kind !== 'four' && kind !== 'six' && kind !== 'wicket') return;

    const who = kind === 'wicket' ? latestBall.dismissal?.playerOutName || latestBall.strikerName : latestBall.strikerName;
    const detail =
      kind === 'wicket'
        ? `${latestBall.dismissal?.type?.replace(/_/g, ' ') || 'out'} · b ${latestBall.bowlerName}`
        : `off ${latestBall.bowlerName}`;
    setFlash({ id: latestBall.id, kind, who, detail });
    if (navigator.vibrate) navigator.vibrate(kind === 'wicket' ? [60, 40, 60] : 40);
    const t = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(t);
  }, [latestBall?.id]);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          className="pointer-events-none fixed inset-x-0 top-1/3 z-[70] flex justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="status"
          aria-live="assertive"
        >
          <motion.div
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${STYLES[flash.kind].gradient} px-8 py-5 shadow-2xl ${STYLES[flash.kind].glow} text-center min-w-[240px]`}
            initial={{ scale: 0.4, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          >
            <motion.span
              className="absolute inset-y-0 -left-1/2 w-1/2 bg-white/25 skew-x-[-20deg]"
              initial={{ x: 0 }}
              animate={{ x: '400%' }}
              transition={{ duration: 0.9, delay: 0.15 }}
            />
            <div className="relative font-display text-6xl sm:text-7xl font-bold tracking-wide text-white leading-none">
              {STYLES[flash.kind].word}!
            </div>
            <div className="relative mt-2 text-sm font-bold text-white">{flash.who}</div>
            <div className="relative text-[11px] font-semibold uppercase tracking-wider text-white/75">{flash.detail}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
