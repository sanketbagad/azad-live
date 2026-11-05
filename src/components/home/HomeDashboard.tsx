import React from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Trophy,
  Users,
  ShieldCheck,
  Activity,
  Video,
  Tv,
  Radio,
  TableProperties,
  BarChart3,
  Share2,
  CheckCircle2,
  Circle,
  ArrowRight,
  CalendarClock,
  Inbox,
} from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import { TabKey, usePermissions } from '../../auth/permissions';
import { Avatar, RoleBadge } from '../ui/Brand';
import { LiveMatchCard } from './LiveMatchCard';
import { Match } from '../../types/cricket';

interface HomeDashboardProps {
  onNavigate: (tab: TabKey) => void;
  onScoreMatch: (matchId: string) => void;
  onViewMatch: (matchId: string) => void;
  onStreamMatch: (matchId: string) => void;
  onOpenQuickMatch: () => void;
  onOpenCreateTournament: () => void;
}

interface QuickAction {
  label: string;
  hint: string;
  icon: React.ElementType;
  tint: string;
  onClick: () => void;
}

const ROLE_COPY = {
  admin: 'You run the show: tournaments, teams, scorers and broadcasts.',
  scorer: 'Score and stream the matches assigned to you.',
  viewer: 'Follow every ball, table and stat live.',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const SectionTitle: React.FC<{ title: string; action?: { label: string; onClick: () => void } }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-display text-3xl font-semibold leading-none">{title}</h2>
    {action && (
      <button onClick={action.onClick} className="text-xs font-semibold text-brand-300 hover:text-brand-400 flex items-center gap-1 min-h-9">
        {action.label} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; title: string; text: string; action?: React.ReactNode }> = ({
  icon: Icon,
  title,
  text,
  action,
}) => (
  <div className="card p-6 text-center">
    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
      <Icon className="w-6 h-6 text-slate-500" />
    </div>
    <h3 className="font-bold text-white">{title}</h3>
    <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onScoreMatch,
  onViewMatch,
  onStreamMatch,
  onOpenQuickMatch,
  onOpenCreateTournament,
}) => {
  const { state, currentUser } = useCricket();
  const { role, can, canScoreMatch } = usePermissions();
  if (!currentUser) return null;

  const matches = Object.values(state.matches).sort((a, b) => b.updatedAt - a.updatedAt);
  const live = matches.filter((m) => m.status === 'live' || m.status === 'innings_break');
  const upcoming = matches.filter((m) => m.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const results = matches.filter((m) => m.status === 'completed');
  const myMatches = role === 'scorer' ? matches.filter((m) => canScoreMatch(m.id) && m.status !== 'completed') : [];

  const actions: QuickAction[] =
    role === 'admin'
      ? [
          { label: 'Quick Match', hint: 'Start scoring now', icon: Zap, tint: 'from-pitch-400 to-pitch-500', onClick: onOpenQuickMatch },
          { label: 'Tournament', hint: 'Create a new cup', icon: Trophy, tint: 'from-trophy-300 to-trophy-500', onClick: onOpenCreateTournament },
          { label: 'Teams', hint: 'Squads & players', icon: Users, tint: 'from-brand-400 to-brand-600', onClick: () => onNavigate('teams_players') },
          { label: 'Users', hint: 'Roles & scorers', icon: ShieldCheck, tint: 'from-pulse-400 to-pulse-600', onClick: () => onNavigate('admin') },
        ]
      : role === 'scorer'
      ? [
          { label: 'Live Matches', hint: 'All games', icon: Radio, tint: 'from-live-400 to-live-600', onClick: () => onNavigate('live_matches') },
          { label: 'Go Live', hint: 'Stream to YouTube', icon: Video, tint: 'from-pulse-400 to-pulse-600', onClick: () => onNavigate('live_streaming') },
          { label: 'OBS Overlay', hint: 'Broadcast graphics', icon: Tv, tint: 'from-brand-400 to-brand-600', onClick: () => onNavigate('obs_overlay') },
          { label: 'Stats', hint: 'Players & MVP', icon: BarChart3, tint: 'from-trophy-300 to-trophy-500', onClick: () => onNavigate('player_stats') },
        ]
      : [
          { label: 'Live Scores', hint: 'Every ball', icon: Radio, tint: 'from-live-400 to-live-600', onClick: () => onNavigate('live_matches') },
          { label: 'Points Table', hint: 'Standings & NRR', icon: TableProperties, tint: 'from-brand-400 to-brand-600', onClick: () => onNavigate('points_table') },
          { label: 'Stats', hint: 'Players & MVP', icon: BarChart3, tint: 'from-trophy-300 to-trophy-500', onClick: () => onNavigate('player_stats') },
          { label: 'Match Centre', hint: 'Scorecards & sharing', icon: Share2, tint: 'from-pulse-400 to-pulse-600', onClick: () => onNavigate('public_score') },
        ];

  const setupSteps = [
    { label: 'Add teams and their players', done: Object.keys(state.teams).length >= 2, tab: 'teams_players' as TabKey },
    { label: 'Create a tournament', done: Object.keys(state.tournaments).length > 0, onClick: onOpenCreateTournament },
    { label: 'Invite scorers and assign matches', done: false, tab: 'admin' as TabKey },
  ];
  const showSetup = role === 'admin' && (!setupSteps[0].done || !setupSteps[1].done);

  const matchCard = (m: Match, i: number) => (
    <div key={m.id} data-aos="fade-up" data-aos-delay={Math.min(i, 3) * 70}>
      <LiveMatchCard match={m} onClick={() => onViewMatch(m.id)}>
        {canScoreMatch(m.id) && m.status !== 'completed' && (
          <div className="flex gap-2">
            <button onClick={() => onScoreMatch(m.id)} className="btn-primary flex-1 !min-h-10 !py-2 text-xs">
              <Activity className="w-4 h-4" /> Score
            </button>
            {can('match.stream') && (
              <button onClick={() => onStreamMatch(m.id)} className="btn-ghost !min-h-10 !py-2 text-xs" title="Go live">
                <Video className="w-4 h-4 text-live-400" />
              </button>
            )}
          </div>
        )}
      </LiveMatchCard>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-gradient-to-br from-brand-500/20 to-pulse-500/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <Avatar user={currentUser} size={52} />
          <div className="min-w-0">
            <p className="text-xs text-slate-400">{greeting()},</p>
            <h1 className="font-display text-4xl font-semibold leading-none truncate">{currentUser.name.split(' ')[0]}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <RoleBadge role={role} />
              <span className="text-xs text-slate-400">{ROLE_COPY[role]}</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i + 0.1 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.96 }}
            onClick={a.onClick}
            className="card p-4 text-left min-h-24 flex flex-col justify-between"
          >
            <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.tint} flex items-center justify-center shadow-lg`}>
              <a.icon className="w-5 h-5 text-white" />
            </span>
            <span className="mt-3">
              <span className="block font-bold text-sm text-white">{a.label}</span>
              <span className="block text-[11px] text-slate-400">{a.hint}</span>
            </span>
          </motion.button>
        ))}
      </section>

      {/* Admin setup checklist */}
      {showSetup && (
        <section data-aos="fade-up" className="card p-5">
          <h2 className="font-display text-3xl font-semibold leading-none mb-1">Set up your tournament</h2>
          <p className="text-sm text-slate-400 mb-4">A few steps before the first ball.</p>
          <ol className="space-y-2">
            {setupSteps.map((s, i) => (
              <li key={s.label}>
                <button
                  onClick={() => (s.tab ? onNavigate(s.tab) : s.onClick?.())}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-left min-h-12"
                >
                  {s.done ? (
                    <CheckCircle2 className="w-5 h-5 text-pitch-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${s.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {i + 1}. {s.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Scorer: assigned matches */}
      {role === 'scorer' && (
        <section>
          <SectionTitle title="Your matches" />
          {myMatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{myMatches.map(matchCard)}</div>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No matches assigned yet"
              text="Ask your tournament admin to assign you to a match. It will appear here as soon as they do."
            />
          )}
        </section>
      )}

      {/* Live now */}
      <section>
        <SectionTitle
          title="Live now"
          action={live.length > 0 ? { label: 'All matches', onClick: () => onNavigate('live_matches') } : undefined}
        />
        {live.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{live.slice(0, 6).map(matchCard)}</div>
        ) : (
          <EmptyState
            icon={Radio}
            title="No live matches right now"
            text={can('match.create') ? 'Start a quick match or schedule fixtures from a tournament.' : 'Check back on matchday. Live games show up here automatically.'}
            action={
              can('match.create') && (
                <button onClick={onOpenQuickMatch} className="btn-primary">
                  <Zap className="w-4 h-4" /> Start a Quick Match
                </button>
              )
            }
          />
        )}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <SectionTitle title="Coming up" action={{ label: 'Fixtures', onClick: () => onNavigate('fixtures') }} />
          <div className="card divide-y divide-white/[0.05]">
            {upcoming.slice(0, 4).map((m) => (
              <button
                key={m.id}
                onClick={() => onViewMatch(m.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] min-h-14"
              >
                <CalendarClock className="w-5 h-5 text-brand-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">
                    {m.team1.name} vs {m.team2.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {m.date} • {m.venue}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      {results.length > 0 && (
        <section>
          <SectionTitle title="Latest results" action={{ label: 'All results', onClick: () => onNavigate('history') }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{results.slice(0, 3).map(matchCard)}</div>
        </section>
      )}
    </div>
  );
};
