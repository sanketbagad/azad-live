import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronRight, MapPin, Video } from 'lucide-react';
import { Match, Team } from '../../types/cricket';
import { isVideoLive, situationText } from '../../utils/liveMatch';
import { BallChip } from '../live/BallChip';

const STATUS_CHIP: Record<Match['status'], { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-live-500/15 text-live-400 border border-live-500/30' },
  innings_break: { label: 'Innings break', className: 'bg-trophy-500/15 text-trophy-300 border border-trophy-500/30' },
  upcoming: { label: 'Upcoming', className: 'bg-brand-500/15 text-brand-300 border border-brand-500/30' },
  completed: { label: 'Result', className: 'bg-white/5 text-slate-300 border border-white/10' },
  abandoned: { label: 'Abandoned', className: 'bg-white/5 text-slate-500 border border-white/10' },
};

function inningsFor(match: Match, team: Team) {
  return match.innings.find((inn) => inn.battingTeamId === team.id && (inn.legalDeliveries > 0 || inn.totalRuns > 0));
}

const TeamRow: React.FC<{ match: Match; team: Team; big?: boolean }> = ({ match, team, big }) => {
  const inn = inningsFor(match, team);
  const isBatting =
    (match.status === 'live' || match.status === 'innings_break') &&
    match.innings[match.currentInningsIndex]?.battingTeamId === team.id;
  const isWinner = match.status === 'completed' && match.result?.winnerId === team.id;
  const dim = match.status === 'completed' && !isWinner && Boolean(match.result?.winnerId);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`${big ? 'w-9 h-9' : 'w-8 h-8'} rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-md`}
          style={{ background: team.color || '#334155' }}
        >
          {team.shortName?.slice(0, 3)}
        </span>
        <span className={`truncate text-sm font-semibold ${dim ? 'text-slate-500' : isBatting || isWinner ? 'text-white' : 'text-slate-300'}`}>
          {team.name}
        </span>
        {isBatting && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" title="Batting" />}
      </div>
      {inn ? (
        <div className="text-right shrink-0">
          <span className={`font-display ${big ? 'text-3xl' : 'text-2xl'} font-semibold leading-none tabular-nums ${dim ? 'text-slate-500' : 'text-white'}`}>
            {inn.totalRuns}/{inn.wickets}
          </span>
          <span className="text-[11px] text-slate-500 ml-1.5 tabular-nums">({inn.oversFormatted})</span>
        </div>
      ) : (
        <span className="text-xs text-slate-500 shrink-0">{match.status === 'upcoming' ? '' : 'Yet to bat'}</span>
      )}
    </div>
  );
};

export const LiveMatchCard: React.FC<{
  match: Match;
  onClick?: () => void;
  /** Larger layout for the "Live now" section */
  featured?: boolean;
  children?: React.ReactNode;
}> = ({ match, onClick, featured, children }) => {
  const chip = STATUS_CHIP[match.status];
  const current = match.innings[match.currentInningsIndex];
  const isLive = match.status === 'live' || match.status === 'innings_break';
  const videoLive = isVideoLive(match);
  const recentBalls = isLive ? current.deliveries.slice(-6) : [];

  return (
    <motion.div
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={`card ${featured ? 'p-4 sm:p-5' : 'p-4'} h-full flex flex-col gap-3 relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-white/15 transition-colors' : ''}`}
      style={featured ? { backgroundImage: `linear-gradient(135deg, ${match.team1.color || '#06b6d4'}1f, transparent 50%, ${match.team2.color || '#8b5cf6'}1a)` } : undefined}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${match.team1.color || '#22d3ee'}, ${match.team2.color || '#8b5cf6'})` }}
      />
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="truncate">{[match.tournamentName, match.stage].filter(Boolean).join(' · ') || match.name}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {videoLive && (
            <span className="chip bg-live-600 text-white">
              <Video className="w-3 h-3" /> Live video
            </span>
          )}
          <span className={`chip ${chip.className}`}>
            {match.status === 'live' && <span className="live-dot !w-1.5 !h-1.5" />}
            {chip.label}
          </span>
        </span>
      </div>

      <div className="space-y-2.5">
        <TeamRow match={match} team={match.team1} big={featured} />
        <TeamRow match={match} team={match.team2} big={featured} />
      </div>

      {recentBalls.length > 0 && (
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">Recent</span>
          {recentBalls.map((b) => (
            <BallChip key={b.id} ball={b} size="sm" />
          ))}
        </div>
      )}

      <div className="text-xs mt-auto pt-2 border-t border-white/[0.05] flex items-center gap-2">
        {match.status === 'completed' && match.result ? (
          <span className="text-trophy-300 font-semibold flex-1 min-w-0 truncate">{match.result.summaryText}</span>
        ) : isLive ? (
          <span className="text-brand-300 font-semibold flex-1 min-w-0 truncate">{situationText(match)}</span>
        ) : (
          <span className="text-slate-500 flex items-center gap-1 flex-1 min-w-0 truncate">
            {match.date ? <Calendar className="w-3 h-3 shrink-0" /> : <MapPin className="w-3 h-3 shrink-0" />}
            <span className="truncate">
              {[
                match.date && new Date(match.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }),
                match.venue,
                `${match.overs} ov`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        )}
        {onClick && <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />}
      </div>

      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
    </motion.div>
  );
};
