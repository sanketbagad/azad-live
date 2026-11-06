import React, { useMemo, useState } from 'react';
import type { Innings } from '../../types/cricket';
import { ballKind, ballOverLabel, oversSummary } from '../../utils/liveMatch';
import { BallChip } from './BallChip';

const ROW_TONE: Record<string, string> = {
  wicket: 'bg-live-600/10 border-live-500/30',
  six: 'bg-pulse-600/10 border-pulse-500/30',
  four: 'bg-brand-600/10 border-brand-500/30',
};

/** Ball-by-ball commentary, newest first, grouped by over with an end-of-over summary. */
export const CommentaryFeed: React.FC<{ innings: Innings; limit?: number }> = ({ innings, limit }) => {
  const [filter, setFilter] = useState<'all' | 'key'>('all');
  const overs = useMemo(() => [...oversSummary(innings)].reverse(), [innings]);

  if (overs.length === 0) {
    return <div className="py-10 text-center text-sm text-slate-500">Waiting for the first ball…</div>;
  }

  let shown = 0;

  return (
    <div>
      {!limit && (
        <div className="flex gap-2 mb-3">
          {(['all', 'key'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold border ${
                filter === f ? 'bg-white text-ink-950 border-white' : 'bg-white/[0.03] border-white/10 text-slate-300'
              }`}
            >
              {f === 'all' ? 'All balls' : '4s, 6s & wickets'}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {overs.map((o) => {
          if (limit && shown >= limit) return null;
          const balls = [...o.balls]
            .reverse()
            .filter((b) => filter === 'all' || ['four', 'six', 'wicket'].includes(ballKind(b)));
          if (balls.length === 0) return null;
          const visible = limit ? balls.slice(0, Math.max(0, limit - shown)) : balls;
          shown += visible.length;

          return (
            <section key={o.over}>
              {o.isComplete && filter === 'all' && (
                <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">End of over {o.over + 1}</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {o.runs} run{o.runs === 1 ? '' : 's'}
                    {o.wickets > 0 && ` · ${o.wickets} wkt`}
                  </span>
                  <span className="ml-auto text-xs font-bold text-white tabular-nums">
                    {o.scoreAfter.runs}/{o.scoreAfter.wickets}
                  </span>
                </div>
              )}
              <ul className="space-y-2">
                {visible.map((b) => (
                  <li
                    key={b.id}
                    className={`flex gap-3 rounded-xl border p-3 ${ROW_TONE[ballKind(b)] || 'bg-ink-950/40 border-white/[0.05]'}`}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 w-10">
                      <BallChip ball={b} />
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">{ballOverLabel(b)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">{b.bowlerName}</span> to{' '}
                        <span className="font-semibold text-slate-300">{b.strikerName}</span>
                      </div>
                      <p className="text-sm text-slate-100 mt-0.5 leading-snug">{b.commentary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
};
