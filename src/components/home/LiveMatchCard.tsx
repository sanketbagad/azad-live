import React from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { Match, Team } from '../../types/cricket';

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

const TeamRow: React.FC<{ match: Match; team: Team }> = ({ match, team }) => {
  const inn = inningsFor(match, team);
  const isBatting = match.status === 'live' && match.innings[match.currentInningsIndex]?.battingTeamId === team.id;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-md"
          style={{ background: team.color || '#334155' }}
        >
          {team.shortName?.slice(0, 3)}
        </span>
        <span className={`truncate text-sm font-semibold ${isBatting ? 'text-white' : 'text-slate-300'}`}>{team.name}</span>
        {isBatting && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" title="Batting" />}
      </div>
      {inn ? (
        <div className="text-right shrink-0">
          <span className="font-display text-2xl font-semibold leading-none text-white">
            {inn.totalRuns}/{inn.wickets}
          </span>
          <span className="text-[11px] text-slate-500 ml-1.5">({inn.oversFormatted})</span>
        </div>
      ) : (
        <span className="text-xs text-slate-500 shrink-0">Yet to bat</span>
      )}
    </div>
  );
};

export const LiveMatchCard: React.FC<{
  match: Match;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ match, onClick, children }) => {
  const chip = STATUS_CHIP[match.status];
  const current = match.innings[match.currentInningsIndex];
  const runsNeeded = match.target && match.status === 'live' ? Math.max(0, match.target - current.totalRuns) : null;
  const ballsLeft = match.overs * 6 - current.legalDeliveries;

  return (
    <motion.div
      whileHover={onClick ? { y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`card p-4 h-full flex flex-col gap-3 relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${match.team1.color || '#22d3ee'}, ${match.team2.color || '#8b5cf6'})` }}
      />
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="truncate">{match.tournamentName || match.stage || 'Match'}</span>
        <span className={`chip ${chip.className} shrink-0`}>
          {match.status === 'live' && <span className="live-dot !w-1.5 !h-1.5" />}
          {chip.label}
        </span>
      </div>

      <div className="space-y-2.5">
        <TeamRow match={match} team={match.team1} />
        <TeamRow match={match} team={match.team2} />
      </div>

      <div className="text-xs mt-auto pt-2 border-t border-white/[0.05]">
        {match.status === 'completed' && match.result ? (
          <span className="text-trophy-300 font-semibold">{match.result.summaryText}</span>
        ) : runsNeeded !== null ? (
          <span className="text-brand-300 font-semibold">
            Need {runsNeeded} from {ballsLeft} balls
          </span>
        ) : (
          <span className="text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {match.venue} • {match.overs} overs • {match.ballType.replace('_', ' ')}
          </span>
        )}
      </div>

      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
    </motion.div>
  );
};
