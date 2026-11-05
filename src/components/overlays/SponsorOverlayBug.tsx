import React from 'react';
import { BroadcastSponsor } from '../../types/cricket';

interface SponsorOverlayBugProps {
  placement: 'top_right' | 'bottom_ticker' | 'scorecard_header' | 'corner_bug';
  sponsors?: BroadcastSponsor[];
}

export const defaultBroadcastSponsors: BroadcastSponsor[] = [
  {
    id: 'sp_1',
    name: 'AZAD BROADCAST',
    tagline: 'Official Live Streaming',
    placement: 'top_right',
    enabled: true,
  },
  {
    id: 'sp_2',
    name: 'UNIVERSAL SPORTS',
    tagline: 'Tournament Co-Powered By',
    placement: 'bottom_ticker',
    enabled: true,
  },
];

export const SponsorOverlayBug: React.FC<SponsorOverlayBugProps> = ({
  placement,
  sponsors = defaultBroadcastSponsors,
}) => {
  const activeSponsors = sponsors.filter((s) => s.enabled && s.placement === placement);

  if (activeSponsors.length === 0) return null;

  if (placement === 'top_right') {
    return (
      <div className="flex items-center space-x-2 bg-slate-950/90 border border-amber-500/50 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg">
        <span className="text-[9px] uppercase tracking-wider text-amber-400 font-black">
          Sponsor
        </span>
        <div className="h-4 w-px bg-slate-700" />
        {activeSponsors.map((s) => (
          <div key={s.id} className="flex items-center space-x-1.5">
            {s.logoUrl ? (
              <img src={s.logoUrl} alt={s.name} className="h-4 w-auto object-contain" />
            ) : null}
            <div className="text-left">
              <div className="text-[11px] font-black text-white leading-tight tracking-wider">
                {s.name}
              </div>
              {s.tagline && (
                <div className="text-[8px] text-amber-200/70 font-semibold leading-none">
                  {s.tagline}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (placement === 'bottom_ticker') {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
          Powered By:
        </span>
        {activeSponsors.map((s) => (
          <span key={s.id} className="font-black text-[11px] text-white tracking-wide">
            {s.name}
          </span>
        ))}
      </div>
    );
  }

  if (placement === 'scorecard_header') {
    return (
      <div className="flex items-center space-x-3">
        {activeSponsors.map((s) => (
          <div key={s.id} className="flex items-center space-x-1.5 bg-slate-900/90 border border-amber-500/40 px-2.5 py-1 rounded-lg">
            <span className="text-[9px] text-amber-400 font-black uppercase">Associate:</span>
            <span className="text-[10px] font-extrabold text-white">{s.name}</span>
          </div>
        ))}
      </div>
    );
  }

  // Corner Bug
  return (
    <div className="bg-slate-950/90 border border-amber-500/40 rounded-lg px-2.5 py-1 shadow-md flex items-center space-x-2">
      {activeSponsors.map((s) => (
        <span key={s.id} className="text-[10px] font-black text-amber-300">
          {s.name}
        </span>
      ))}
    </div>
  );
};
