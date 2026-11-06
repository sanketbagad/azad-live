import React, { useState } from 'react';
import { User } from 'lucide-react';
import type { AuctionPlayer } from '../../types/cricket';
import { auctionPhotoUrl } from '../../utils/auction';

export const PlayerPhoto: React.FC<{ player?: AuctionPlayer; className?: string }> = ({ player, className = '' }) => {
  const url = player ? auctionPhotoUrl(player) : undefined;
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || failed === url) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-ink-700 to-ink-800 text-slate-500 ${className}`}>
        <User className="w-1/3 h-1/3" />
      </div>
    );
  }
  return <img src={url} alt={player?.name || 'Player'} className={`object-cover bg-ink-800 ${className}`} onError={() => setFailed(url)} />;
};
