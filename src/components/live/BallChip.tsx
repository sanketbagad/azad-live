import React from 'react';
import type { BallDelivery } from '../../types/cricket';
import { ballKind, ballLabel, BallKind } from '../../utils/liveMatch';

const KIND_CLASSES: Record<BallKind, string> = {
  wicket: 'bg-live-600 text-white border-live-400/60',
  six: 'bg-pulse-600 text-white border-pulse-400/60',
  four: 'bg-brand-600 text-white border-brand-400/60',
  extra: 'bg-trophy-500/20 text-trophy-300 border-trophy-400/50',
  dot: 'bg-white/[0.04] text-slate-500 border-white/10',
  runs: 'bg-white/[0.08] text-white border-white/15',
};

const SIZES = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-16 h-16 text-xl',
};

export const BallChip: React.FC<{ ball: BallDelivery; size?: keyof typeof SIZES; className?: string }> = ({
  ball,
  size = 'md',
  className = '',
}) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-full border font-black tabular-nums ${SIZES[size]} ${
      KIND_CLASSES[ballKind(ball)]
    } ${className}`}
    title={ball.commentary}
  >
    {ballLabel(ball)}
  </span>
);

/** Empty slot for a ball not yet bowled in the over */
export const EmptyBallSlot: React.FC<{ size?: keyof typeof SIZES }> = ({ size = 'md' }) => (
  <span className={`inline-flex shrink-0 rounded-full border border-dashed border-white/10 ${SIZES[size]}`} />
);
