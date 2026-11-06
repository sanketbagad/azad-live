import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import AOS from 'aos';
import { motion } from 'motion/react';
import { CricketProvider, useCricket } from './context/CricketContext';
import { ScoreboardHeader } from './components/ScoreboardHeader';
import { ScoringPad } from './components/ScoringPad';
import { DetailedScorecard } from './components/DetailedScorecard';
import { LiveMatchesGrid } from './components/LiveMatchesGrid';
import { TournamentsView } from './components/TournamentsView';
import { PointsTableView } from './components/PointsTableView';
import { StatsMvpView } from './components/StatsMvpView';
import { OBSOverlayView } from './components/OBSOverlayView';
import { PublicLiveScoreView } from './components/PublicLiveScoreView';
import { TeamsPlayersView } from './components/TeamsPlayersView';
import { FixturesHistoryView } from './components/FixturesHistoryView';
import { QuickMatchModal } from './components/QuickMatchModal';
import { TournamentModal } from './components/TournamentModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuctionHubPortal } from './components/AuctionHubPortal';
import { AuthModal } from './components/AuthModal';
import { LiveStreamStudio } from './components/streaming/LiveStreamStudio';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { HomeDashboard } from './components/home/HomeDashboard';
import { AccessDenied } from './components/ui/AccessDenied';
import { CricketBall, Logo } from './components/ui/Brand';
import { TabKey, getTab, tabFromPath, usePermissions } from './auth/permissions';
import { Match } from './types/cricket';
import { Radio } from 'lucide-react';

// Public, sign-in free entry points (broadcast software and shared links can't sign in)
const urlParams = new URLSearchParams(window.location.search);
const IS_OBS_STANDALONE =
  urlParams.get('obs') === 'true' || urlParams.get('overlay') === 'true' || window.location.pathname.startsWith('/overlay');
const IS_PUBLIC_SHARE = urlParams.get('public') === 'true';
const OBS_THEME =
  urlParams.get('theme') ||
  (window.location.pathname.startsWith('/overlay/') ? window.location.pathname.replace('/overlay/', '') : undefined);

function initialTab(): TabKey {
  if (urlParams.get('portal') === 'auction') return 'auction_sync';
  return tabFromPath(window.location.pathname);
}

const SplashScreen: React.FC = () => (
  <div className="min-h-dvh bg-stadium flex flex-col items-center justify-center gap-6">
    <motion.div
      animate={{ y: [0, -18, 0], rotate: [0, 180, 360] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <CricketBall className="w-16 h-16 drop-shadow-[0_15px_25px_rgba(220,38,38,0.4)]" />
    </motion.div>
    <div className="font-display text-3xl tracking-wide text-slate-300">
      AZAD <span className="text-live-400">LIVE</span>
    </div>
  </div>
);

/** Public match view for shared links: no sign-in required */
const PublicShareView: React.FC = () => (
  <div className="min-h-dvh bg-stadium">
    <header className="pt-safe sticky top-0 z-20 bg-ink-900/70 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Logo onClick={() => (window.location.href = '/')} />
        <a href="/" className="btn-ghost !min-h-9 !py-1.5 text-xs">
          Sign in for more
        </a>
      </div>
    </header>
    <main className="max-w-5xl mx-auto px-4 py-5 pb-safe">
      <PublicLiveScoreView stickyTopClass="top-[calc(3.5rem+env(safe-area-inset-top))]" />
    </main>
  </div>
);

function MainApp() {
  const { state, activeMatchId, setActiveMatchId, currentUser, isAuthLoading } = useCricket();
  const { canAccessTab, can, canScoreMatch } = usePermissions();

  const [currentTab, setCurrentTab] = useState<TabKey>(initialTab);
  const [isQuickMatchOpen, setIsQuickMatchOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState(false);
  const [liveStudioMatchId, setLiveStudioMatchId] = useState<string | null>(null);

  const activeMatch = activeMatchId ? state.matches[activeMatchId] : null;

  // ---------- URL routing: each screen has its own path; back/forward works ----------
  const navigate = useCallback(
    (tab: TabKey, matchId?: string | null) => {
      const params = new URLSearchParams();
      const id = matchId ?? (tab === 'scoring' || tab === 'public_score' ? activeMatchId : null);
      if (id && (tab === 'scoring' || tab === 'public_score')) params.set('matchId', id);
      const url = getTab(tab).path + (params.toString() ? `?${params}` : '');
      if (url !== window.location.pathname + window.location.search) {
        window.history.pushState({ tab }, '', url);
      }
      setCurrentTab(tab);
    },
    [activeMatchId]
  );

  useEffect(() => {
    const onPopState = () => {
      setCurrentTab(tabFromPath(window.location.pathname));
      const id = new URLSearchParams(window.location.search).get('matchId');
      if (id) setActiveMatchId(id);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setActiveMatchId]);

  // Re-scan for AOS elements after each screen change
  useEffect(() => {
    const t = setTimeout(() => AOS.refreshHard(), 300);
    return () => clearTimeout(t);
  }, [currentTab, currentUser]);

  // Celebration confetti when the active match finishes
  useEffect(() => {
    if (activeMatch?.status === 'completed' && activeMatch.result) {
      try {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: ['#22d3ee', '#8b5cf6', '#fbbf24', '#22c55e'] });
      } catch {
        // confetti is cosmetic
      }
    }
  }, [activeMatch?.status]);

  // ---------- Public entry points ----------
  if (IS_OBS_STANDALONE) {
    return <OBSOverlayView matchId={urlParams.get('matchId') || activeMatchId || undefined} theme={OBS_THEME} isStandalone />;
  }
  if (IS_PUBLIC_SHARE) {
    return <PublicShareView />;
  }

  // ---------- Sign-in gate ----------
  if (isAuthLoading) return <SplashScreen />;
  if (!currentUser) {
    return (
      <>
        <LandingPage />
        <AuthModal />
      </>
    );
  }

  // ---------- Actions ----------
  const scoreMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    navigate('scoring', matchId);
  };
  const viewMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    navigate('public_score', matchId);
  };
  const openOBS = (matchId: string) => {
    setActiveMatchId(matchId);
    navigate('obs_overlay');
  };
  const streamMatch = (matchId: string) => {
    setLiveStudioMatchId(matchId);
    setIsLiveStudioOpen(true);
  };
  const handleMatchCreated = (newMatch: Match) => scoreMatch(newMatch.id);

  const scoringShortcut =
    activeMatch && activeMatch.status !== 'completed' && canScoreMatch(activeMatch.id)
      ? { id: activeMatch.id, name: activeMatch.name }
      : null;

  // ---------- Screen rendering with role guard ----------
  const renderScreen = () => {
    if (!canAccessTab(currentTab)) {
      return <AccessDenied onBack={() => navigate('home')} />;
    }

    switch (currentTab) {
      case 'home':
        return (
          <HomeDashboard
            onNavigate={navigate}
            onScoreMatch={scoreMatch}
            onViewMatch={viewMatch}
            onStreamMatch={streamMatch}
            onOpenQuickMatch={() => setIsQuickMatchOpen(true)}
            onOpenCreateTournament={() => setIsTournamentOpen(true)}
          />
        );
      case 'live_matches':
        return (
          <LiveMatchesGrid
            onSelectMatchToScore={scoreMatch}
            onOpenPublicScore={viewMatch}
            onOpenOBS={openOBS}
            onOpenQuickMatch={() => setIsQuickMatchOpen(true)}
            onOpenLiveStream={streamMatch}
          />
        );
      case 'scoring':
        if (!activeMatch) {
          return (
            <div className="card max-w-md mx-auto mt-10 p-8 text-center">
              <Radio className="w-8 h-8 text-brand-400 mx-auto mb-3" />
              <h2 className="font-display text-3xl font-semibold">Pick a match to score</h2>
              <p className="text-sm text-slate-400 mt-2">Choose a live match you’re assigned to.</p>
              <button onClick={() => navigate('live_matches')} className="btn-primary mt-5">
                Browse matches
              </button>
            </div>
          );
        }
        if (!canScoreMatch(activeMatch.id)) {
          return (
            <AccessDenied
              title="You’re not assigned to this match"
              message="Only admins and the scorers assigned to this match can score it."
              onBack={() => navigate('home')}
            />
          );
        }
        return (
          <div className="space-y-6">
            <ScoreboardHeader match={activeMatch} onGoLive={() => streamMatch(activeMatch.id)} />
            <ScoringPad match={activeMatch} />
            <DetailedScorecard match={activeMatch} />
          </div>
        );
      case 'tournaments':
        return (
          <TournamentsView
            onOpenCreateTournament={() => setIsTournamentOpen(true)}
            onSelectMatchToScore={scoreMatch}
            onOpenPointsTable={() => navigate('points_table')}
            onOpenMvp={() => navigate('mvp')}
          />
        );
      case 'fixtures':
        return <FixturesHistoryView mode="fixtures" onSelectMatchToScore={scoreMatch} onOpenPublicScore={viewMatch} />;
      case 'history':
        return <FixturesHistoryView mode="history" onSelectMatchToScore={scoreMatch} onOpenPublicScore={viewMatch} />;
      case 'points_table':
        return <PointsTableView />;
      case 'player_stats':
      case 'mvp':
        return <StatsMvpView />;
      case 'teams_players':
        return <TeamsPlayersView />;
      case 'auction_sync':
        return <AuctionHubPortal onSwitchToCricketPortal={() => navigate('home')} />;
      case 'public_score':
        return <PublicLiveScoreView />;
      case 'obs_overlay':
        return <OBSOverlayView matchId={activeMatchId || undefined} />;
      case 'admin':
        return <AdminDashboardView />;
      case 'live_streaming':
        // The studio opens full-screen; this keeps the route meaningful
        return null;
    }
  };

  return (
    <>
      <AppShell currentTab={currentTab} onNavigate={navigate} scoringMatch={scoringShortcut}>
        {renderScreen()}
      </AppShell>

      <AuthModal />

      {/* Direct mobile live streaming studio (camera + mic + scoreboard composite to YouTube) */}
      {can('match.stream') && (isLiveStudioOpen || currentTab === 'live_streaming') && (
        <LiveStreamStudio
          initialMatchId={liveStudioMatchId || activeMatchId || undefined}
          onClose={() => {
            setIsLiveStudioOpen(false);
            if (currentTab === 'live_streaming') navigate('home');
          }}
        />
      )}

      {can('match.create') && (
        <QuickMatchModal
          isOpen={isQuickMatchOpen}
          onClose={() => setIsQuickMatchOpen(false)}
          onMatchCreated={handleMatchCreated}
        />
      )}

      {can('tournament.manage') && (
        <TournamentModal
          isOpen={isTournamentOpen}
          onClose={() => setIsTournamentOpen(false)}
          onTournamentCreated={() => navigate('tournaments')}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <CricketProvider>
      <MainApp />
    </CricketProvider>
  );
}
