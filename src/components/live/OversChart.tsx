import React, { useMemo, useState } from 'react';
import type { Innings } from '../../types/cricket';
import { oversSummary } from '../../utils/liveMatch';
import { BallChip } from './BallChip';

const BAR_COLOR = '#06b6d4'; // brand-500, passes 3:1 contrast on the card surface

/**
 * Runs per over ("Manhattan"): one series, so no legend; wickets are labeled "W" above the bar
 * (never color alone). Tap or hover a column to read that over; the list below is the table view.
 */
export const OversChart: React.FC<{ innings: Innings; maxOvers: number; teamName: string }> = ({ innings, maxOvers, teamName }) => {
  const overs = useMemo(() => oversSummary(innings), [innings]);
  const [selected, setSelected] = useState<number | null>(null);

  if (overs.length === 0) {
    return <div className="py-10 text-center text-sm text-slate-500">No overs bowled yet.</div>;
  }

  const maxRuns = Math.max(6, ...overs.map((o) => o.runs));
  const yMax = Math.ceil(maxRuns / 6) * 6;
  const gridLines = [yMax / 2, yMax];
  const columns = Math.max(maxOvers, overs.length);
  const active = overs.find((o) => o.over === selected) ?? overs[overs.length - 1];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-bold text-white">Runs per over · {teamName}</h4>
        <span className="text-[11px] text-slate-500">W = wicket in the over</span>
      </div>

      {/* Readout for the hovered / tapped over */}
      <div className="mt-2 min-h-[44px] rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 flex items-center gap-3" aria-live="polite">
        <span className="text-xs font-bold text-white tabular-nums">Over {active.over + 1}</span>
        <span className="text-xs text-slate-300 tabular-nums">
          {active.runs} run{active.runs === 1 ? '' : 's'}
          {active.wickets > 0 && `, ${active.wickets} wkt${active.wickets > 1 ? 's' : ''}`}
        </span>
        <span className="text-[11px] text-slate-500 truncate">
          {active.bowlerName} · {active.scoreAfter.runs}/{active.scoreAfter.wickets}
        </span>
      </div>

      {/* Plot */}
      <div className="relative mt-3 h-40 pl-6">
        {gridLines.map((v) => (
          <div key={v} className="absolute left-6 right-0 border-t border-white/[0.06]" style={{ bottom: `${(v / yMax) * 100}%` }}>
            <span className="absolute -left-6 -top-2 w-5 text-right text-[10px] text-slate-500 tabular-nums">{v}</span>
          </div>
        ))}
        <div className="absolute left-6 right-0 bottom-0 border-t border-white/15" />
        <div className="absolute inset-0 left-6 flex items-end" style={{ gap: 2 }}>
          {Array.from({ length: columns }).map((_, i) => {
            const o = overs.find((x) => x.over === i);
            const h = o ? (o.runs / yMax) * 100 : 0;
            const isActive = o && active.over === i;
            return (
              <button
                key={i}
                type="button"
                className="relative h-full flex-1 min-w-0 flex flex-col justify-end items-center group focus:outline-none"
                onMouseEnter={() => o && setSelected(i)}
                onFocus={() => o && setSelected(i)}
                onClick={() => o && setSelected(i)}
                disabled={!o}
                aria-label={o ? `Over ${i + 1}: ${o.runs} runs, ${o.wickets} wickets` : `Over ${i + 1}: not bowled`}
              >
                {o && o.wickets > 0 && (
                  <span className="mb-0.5 text-[9px] font-black text-white leading-none">{o.wickets > 1 ? `${o.wickets}W` : 'W'}</span>
                )}
                {o && (
                  <span
                    className="w-full max-w-[18px] rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${Math.max(h, o.runs === 0 ? 1.5 : 0)}%`,
                      background: BAR_COLOR,
                      opacity: isActive ? 1 : 0.55,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* Over numbers, aligned under each column (every 5th when there are many overs) */}
      <div className="pl-6 mt-1 flex text-[10px] text-slate-500 tabular-nums" style={{ gap: 2 }}>
        {Array.from({ length: columns }).map((_, i) => {
          const show = columns <= 12 || i === 0 || (i + 1) % 5 === 0;
          return (
            <span key={i} className="flex-1 min-w-0 text-center">
              {show ? i + 1 : ''}
            </span>
          );
        })}
      </div>

      {/* Table view: every over with its balls */}
      <ul className="mt-5 divide-y divide-white/[0.05]">
        {[...overs].reverse().map((o) => (
          <li key={o.over} className="py-2.5 flex items-center gap-3">
            <div className="w-14 shrink-0">
              <div className="text-xs font-bold text-white tabular-nums">Over {o.over + 1}</div>
              <div className="text-[10px] text-slate-500 tabular-nums">
                {o.runs} run{o.runs === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto scrollbar-none">
              {o.balls.map((b) => (
                <BallChip key={b.id} ball={b} size="sm" />
              ))}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs font-semibold text-slate-200 tabular-nums">
                {o.scoreAfter.runs}/{o.scoreAfter.wickets}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[90px]">{o.bowlerName}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
