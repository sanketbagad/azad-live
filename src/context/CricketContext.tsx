import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  AppDatabase,
  AppUser,
  BallDelivery,
  Dismissal,
  ExtraType,
  Match,
  Player,
  Team,
  Tournament,
  UserRole,
} from '../types/cricket';
import { createEmptyDatabase } from '../utils/emptyDatabase';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface CricketContextType {
  state: AppDatabase;
  connectionStatus: 'connected' | 'connecting' | 'offline';
  // Auth state & actions
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  userRole: UserRole;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  canScoreMatch: (matchId: string) => boolean;
  fetchAdminUsers: () => Promise<AppUser[]>;
  updateUserRole: (userId: string, role: UserRole, assignedMatchIds?: string[]) => Promise<void>;
  addUser: (email: string, role: UserRole, name?: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  openAuthModal: () => void;
  // Match & Tournament Actions
  activeMatchId: string | null;
  setActiveMatchId: (id: string | null) => void;
  createMatch: (matchData: any) => Promise<Match>;
  recordDelivery: (
    matchId: string,
    delivery: {
      runsBat: number;
      runsExtra?: number;
      extraType: ExtraType;
      isWicket: boolean;
      dismissal?: Dismissal;
      isBoundaryFour?: boolean;
      isBoundarySix?: boolean;
      bowlerId?: string;
      strikerId?: string;
      nonStrikerId?: string;
      commentary?: string;
    }
  ) => Promise<void>;
  undoDelivery: (matchId: string) => Promise<void>;
  editDelivery: (matchId: string, deliveryId: string, updatedFields: Partial<BallDelivery>) => Promise<void>;
  startSecondInnings: (matchId: string) => Promise<void>;
  reopenMatch: (matchId: string) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  createTournament: (data: any) => Promise<Tournament>;
  updateTournament: (id: string, data: any) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  createTeam: (team: Team) => Promise<void>;
  createPlayer: (player: Player) => Promise<void>;
  exportBackup: () => void;
  importBackup: (jsonData: any) => Promise<boolean>;
  playCricketSound: (type: 'bat' | 'six' | 'four' | 'wicket' | 'whistle' | 'click') => void;
}

const CricketContext = createContext<CricketContextType | undefined>(undefined);

export const CricketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppDatabase>(() => createEmptyDatabase());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');

  // Auth state: Firebase (Google) handles the session; the server owns the role
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [activeMatchId, setActiveMatchId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('matchId');
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const openAuthModal = () => {
    setAuthModalOpen(true);
  };

  // Auth headers with a fresh Google ID token (Firebase refreshes it automatically)
  const getAuthHeaders = useCallback(async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const user = auth.currentUser;
    if (user) {
      headers['Authorization'] = `Bearer ${await user.getIdToken()}`;
    }
    return headers;
  }, []);

  // Audio feedback
  const playCricketSound = useCallback((type: 'bat' | 'six' | 'four' | 'wicket' | 'whistle' | 'click') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'bat' || type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'four') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'six') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(740, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'wicket') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'whistle') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // AudioContext policy
    }
  }, []);

  // Exchange the Google ID token for the app profile (role, assigned matches)
  const syncSession = useCallback(async (user: FirebaseUser) => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Sign-in failed');
    }
    setCurrentUser(await res.json());
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCurrentUser(null);
        setIsAuthLoading(false);
        return;
      }
      try {
        await syncSession(user);
      } catch (err) {
        console.error('Session sync failed:', err);
        setCurrentUser(null);
        await signOut(auth);
      } finally {
        setIsAuthLoading(false);
      }
    });
  }, [syncSession]);

  const refreshCurrentUser = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const res = await fetch('/api/auth/me', { headers: await getAuthHeaders() });
    if (res.ok) setCurrentUser(await res.json());
  }, [getAuthHeaders]);

  // Pick up role / match-assignment changes made by an admin when the tab regains focus
  useEffect(() => {
    if (!firebaseUser) return;
    const onFocus = () => {
      refreshCurrentUser().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [firebaseUser, refreshCurrentUser]);

  // Connect to SSE stream
  useEffect(() => {
    let reconnectTimeout: any;

    function connectSSE() {
      setConnectionStatus('connecting');
      const es = new EventSource('/api/live/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('connected');
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'INIT' || payload.type === 'STATE_UPDATE') {
            setState(payload.state);
            setConnectionStatus('connected');
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      es.onerror = () => {
        setConnectionStatus('offline');
        es.close();
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    }

    fetch('/api/state')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.matches) {
          setState(data);
          setConnectionStatus('connected');
        }
      })
      .catch(() => setConnectionStatus('offline'));

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  // ==========================================
  // REAL AUTHENTICATION ACTIONS
  // ==========================================

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged syncs the server profile
    setAuthModalOpen(false);
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const fetchAdminUsers = async (): Promise<AppUser[]> => {
    const res = await fetch('/api/admin/users', {
      headers: await getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch users');
    }
    return await res.json();
  };

  const updateUserRole = async (
    userId: string,
    role: UserRole,
    assignedMatchIds?: string[]
  ) => {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ role, assignedMatchIds }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user role');
    }
  };

  const addUser = async (email: string, role: UserRole, name?: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ email, role, name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add user');
    }
  };

  const removeUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove user');
    }
  };

  // User Role: derived from verified server session, defaults to 'viewer'
  const userRole: UserRole = currentUser?.role || 'viewer';

  // Mirrors the server rule: admins score anything, scorers only their assigned matches
  const canScoreMatch = (matchId: string) =>
    userRole === 'admin' || (userRole === 'scorer' && Boolean(currentUser?.assignedMatchIds?.includes(matchId)));

  // ==========================================
  // MATCH & SCORING ACTIONS WITH AUTH HEADERS
  // ==========================================

  const createMatch = async (matchData: any): Promise<Match> => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Admin login is required to create a match or tournament.');
    }

    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(matchData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create match');
    }
    const match = await res.json();
    setActiveMatchId(match.id);
    return match;
  };

  const recordDelivery = async (matchId: string, delivery: any) => {
    if (userRole === 'viewer') {
      openAuthModal();
      throw new Error('Authorized Scorer or Admin login is required to score deliveries.');
    }

    if (delivery.isWicket) playCricketSound('wicket');
    else if (delivery.runsBat === 6) playCricketSound('six');
    else if (delivery.runsBat === 4) playCricketSound('four');
    else playCricketSound('bat');

    const res = await fetch(`/api/matches/${matchId}/delivery`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(delivery),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Delivery recording failed');
    }
    const updated = await res.json();
    setState((prev) => ({
      ...prev,
      matches: { ...prev.matches, [matchId]: updated },
    }));
  };

  const undoDelivery = async (matchId: string) => {
    if (userRole === 'viewer') {
      openAuthModal();
      throw new Error('Scorer or Admin login is required to undo deliveries.');
    }
    playCricketSound('click');
    const res = await fetch(`/api/matches/${matchId}/undo`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Undo failed');
    }
    const updated = await res.json();
    setState((prev) => ({
      ...prev,
      matches: { ...prev.matches, [matchId]: updated },
    }));
  };

  const editDelivery = async (matchId: string, deliveryId: string, updatedFields: Partial<BallDelivery>) => {
    if (userRole === 'viewer') {
      openAuthModal();
      throw new Error('Scorer or Admin login is required to edit ball deliveries.');
    }
    const res = await fetch(`/api/matches/${matchId}/edit-delivery`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ deliveryId, updatedFields }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Edit delivery failed');
    }
    const updated = await res.json();
    setState((prev) => ({
      ...prev,
      matches: { ...prev.matches, [matchId]: updated },
    }));
  };

  const startSecondInnings = async (matchId: string) => {
    if (userRole === 'viewer') {
      openAuthModal();
      throw new Error('Login required.');
    }
    const res = await fetch(`/api/matches/${matchId}/start-second-innings`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to start 2nd innings');
    const updated = await res.json();
    setState((prev) => ({
      ...prev,
      matches: { ...prev.matches, [matchId]: updated },
    }));
  };

  const reopenMatch = async (matchId: string) => {
    if (userRole === 'viewer') {
      openAuthModal();
      throw new Error('Login required.');
    }
    const res = await fetch(`/api/matches/${matchId}/reopen`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reopen match');
    const updated = await res.json();
    setState((prev) => ({
      ...prev,
      matches: { ...prev.matches, [matchId]: updated },
    }));
  };

  const deleteMatch = async (matchId: string) => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Only tournament administrators can delete matches.');
    }
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete match');
    }
    setState((prev) => {
      const copy = { ...prev.matches };
      delete copy[matchId];
      return { ...prev, matches: copy };
    });
    if (activeMatchId === matchId) {
      setActiveMatchId(null);
    }
  };

  const createTournament = async (data: any): Promise<Tournament> => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Admin login is required to create a tournament.');
    }
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create tournament');
    }
    return await res.json();
  };

  const updateTournament = async (id: string, data: any) => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Admin login is required to update a tournament.');
    }
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update tournament');
  };

  const deleteTournament = async (id: string) => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Only admin can delete tournament');
    }
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete tournament');
  };

  const createTeam = async (team: Team) => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Admin login is required to create teams.');
    }
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(team),
    });
    if (!res.ok) throw new Error('Failed to create team');
  };

  const createPlayer = async (player: Player) => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Admin login is required to create players.');
    }
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(player),
    });
    if (!res.ok) throw new Error('Failed to save player');
  };

  const exportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `universal_cricket_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importBackup = async (jsonData: any): Promise<boolean> => {
    if (userRole !== 'admin') {
      openAuthModal();
      throw new Error('Admin login required to import database.');
    }
    const res = await fetch('/api/backup/import', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(jsonData),
    });
    if (!res.ok) return false;
    return true;
  };

  return (
    <CricketContext.Provider
      value={{
        state,
        connectionStatus,
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthLoading,
        userRole,
        signInWithGoogle,
        logout,
        refreshCurrentUser,
        getAuthHeaders,
        canScoreMatch,
        fetchAdminUsers,
        updateUserRole,
        addUser,
        removeUser,
        authModalOpen,
        setAuthModalOpen,
        openAuthModal,
        activeMatchId,
        setActiveMatchId,
        createMatch,
        recordDelivery,
        undoDelivery,
        editDelivery,
        startSecondInnings,
        reopenMatch,
        deleteMatch,
        createTournament,
        updateTournament,
        deleteTournament,
        createTeam,
        createPlayer,
        exportBackup,
        importBackup,
        playCricketSound,
      }}
    >
      {children}
    </CricketContext.Provider>
  );
};

export const useCricket = () => {
  const context = useContext(CricketContext);
  if (!context) throw new Error('useCricket must be used within a CricketProvider');
  return context;
};
