import React from 'react';
import { motion } from 'motion/react';
import {
  Radio,
  Tv,
  Video,
  Gavel,
  TableProperties,
  ShieldCheck,
  LogIn,
  UserCheck,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import { CricketBall, GoogleSignInButton, Logo } from '../ui/Brand';
import { LiveMatchCard } from '../home/LiveMatchCard';

const FEATURES = [
  { icon: Radio, title: 'Ball-by-ball scoring', text: 'Extras, wickets, undo and edit, with every viewer updated instantly.', tint: 'from-brand-400 to-brand-600' },
  { icon: Tv, title: 'OBS & PRISM overlays', text: 'Broadcast-grade scorebugs, scorecards and animations for your stream.', tint: 'from-pulse-400 to-pulse-600' },
  { icon: Video, title: 'Go live from a phone', text: 'Camera, scoreboard and sponsor logos composited straight to YouTube.', tint: 'from-live-400 to-live-600' },
  { icon: TableProperties, title: 'Tables & NRR', text: 'Points tables, net run rate, MVP race and results, all automatic.', tint: 'from-pitch-400 to-pitch-500' },
  { icon: Gavel, title: 'Auction sync', text: 'Players sold in the KPL auction land in team squads in real time.', tint: 'from-trophy-300 to-trophy-500' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Admins, scorers and viewers each see exactly what they should.', tint: 'from-brand-300 to-pulse-500' },
];

const STEPS = [
  { icon: LogIn, title: 'Sign in with Google', text: 'One tap, no passwords to remember.' },
  { icon: UserCheck, title: 'Get your role', text: 'Admins assign scorers to their matches.' },
  { icon: Zap, title: 'Score or follow live', text: 'Every ball syncs to all screens in real time.' },
];

export const LandingPage: React.FC = () => {
  const { state } = useCricket();
  const matches = Object.values(state.matches);
  const liveMatches = matches.filter((m) => m.status === 'live');
  const stats = [
    { label: 'Live now', value: liveMatches.length },
    { label: 'Tournaments', value: Object.keys(state.tournaments).length },
    { label: 'Teams', value: Object.keys(state.teams).length },
  ];

  return (
    <div className="min-h-dvh bg-stadium text-slate-100 overflow-x-hidden">
      {/* Top bar */}
      <header className="pt-safe sticky top-0 z-30 bg-ink-900/60 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <a href="#signin" className="btn-ghost !min-h-10 !py-2 text-xs">
            <LogIn className="w-4 h-4" />
            Sign in
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 pt-10 pb-16 sm:pt-20 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div className="relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="chip bg-live-500/15 text-live-400 border border-live-500/30 mb-5"
          >
            <span className="live-dot" /> Live cricket, every ball
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-6xl sm:text-7xl lg:text-8xl font-semibold leading-[0.85] tracking-tight"
          >
            Score it. <br />
            <span className="text-gradient">Stream it.</span> <br />
            Live it.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-slate-400 text-base sm:text-lg max-w-md"
          >
            The scoring and broadcast home for your tournament, from leather to tennis ball, gully to grounds.
          </motion.p>

          <motion.div
            id="signin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 max-w-sm scroll-mt-24"
          >
            <GoogleSignInButton />
            <p className="mt-3 text-[11px] text-slate-500">
              New accounts start as viewers. Your tournament admin can grant scorer or admin access.
            </p>
          </motion.div>

          {/* Real numbers from the live feed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 grid grid-cols-3 gap-3 max-w-sm"
          >
            {stats.map((s) => (
              <div key={s.label} className="card px-3 py-3 text-center">
                <div className="font-display text-4xl font-semibold leading-none text-white">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating ball visual */}
        <div className="relative mt-14 lg:mt-0 h-72 sm:h-96 flex items-center justify-center" aria-hidden="true">
          <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-br from-brand-500/25 to-pulse-600/25 blur-3xl" />
          <motion.div
            className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-white/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-brand-400 shadow-lg shadow-brand-400/60" />
          </motion.div>
          <motion.div
            className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-dashed border-white/10"
            animate={{ rotate: -360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute top-1/2 -right-1.5 w-3 h-3 rounded-full bg-trophy-400 shadow-lg shadow-trophy-400/60" />
          </motion.div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [0, -14, 0], rotate: [0, 12, 0] }}
            transition={{
              scale: { type: 'spring', stiffness: 120, damping: 12 },
              opacity: { duration: 0.4 },
              y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="relative drop-shadow-[0_25px_40px_rgba(220,38,38,0.35)]"
          >
            <CricketBall className="w-28 h-28 sm:w-36 sm:h-36" />
          </motion.div>
        </div>

        <a
          href="#live"
          className="hidden sm:flex absolute left-1/2 -translate-x-1/2 bottom-2 text-slate-500 hover:text-slate-300"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </a>
      </section>

      {/* Live now */}
      {liveMatches.length > 0 && (
        <section id="live" className="max-w-6xl mx-auto px-4 pb-16">
          <h2 data-aos="fade-up" className="font-display text-4xl font-semibold mb-5 flex items-center gap-3">
            <span className="live-dot" /> Live now
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-4 px-4 pb-2">
            {liveMatches.slice(0, 6).map((m, i) => (
              <div key={m.id} data-aos="fade-left" data-aos-delay={i * 80} className="snap-start shrink-0 w-[85%] sm:w-80">
                <LiveMatchCard match={m} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Sign in to open full scorecards, commentary and stats.</p>
        </section>
      )}

      {/* Features */}
      <section id={liveMatches.length > 0 ? undefined : 'live'} className="max-w-6xl mx-auto px-4 pb-16">
        <h2 data-aos="fade-up" className="font-display text-4xl sm:text-5xl font-semibold mb-2">
          Everything matchday needs
        </h2>
        <p data-aos="fade-up" data-aos-delay="60" className="text-slate-400 mb-8 max-w-lg">
          Built for organizers running real tournaments on real grounds.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              data-aos="fade-up"
              data-aos-delay={(i % 3) * 90}
              whileHover={{ y: -4 }}
              className="card p-5 group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.tint} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white">{f.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 data-aos="fade-up" className="font-display text-4xl sm:text-5xl font-semibold mb-8">
          How it works
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} data-aos="zoom-in-up" data-aos-delay={i * 100} className="card p-5 relative overflow-hidden">
              <span className="absolute -right-2 -top-6 font-display text-9xl font-semibold text-white/[0.04] select-none">
                {i + 1}
              </span>
              <s.icon className="w-6 h-6 text-brand-400 mb-3" />
              <h3 className="font-bold text-white">{s.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{s.text}</p>
            </li>
          ))}
        </ol>

        <div data-aos="fade-up" className="card mt-10 p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-pulse-500/10" />
          <div className="relative">
            <h3 className="font-display text-4xl font-semibold">Ready for the first ball?</h3>
            <p className="text-slate-400 text-sm mt-1 mb-5">Sign in to follow, score or run your tournament.</p>
            <GoogleSignInButton className="max-w-xs mx-auto" />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-6 pb-safe text-center text-xs text-slate-500">
        <span className="font-display text-lg text-slate-300">AZAD</span> <span className="text-live-400 font-bold">LIVE</span>
        <span className="mx-2">•</span>
        Cricket live scoring & broadcasting
      </footer>
    </div>
  );
};
