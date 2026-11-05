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
import { getInitialCricketData } from '../utils/initialData';

interface CricketContextType {
  state: AppDatabase;
  connectionStatus: 'connected' | 'connecting' | 'offline';
  // Auth state & actions
  currentUser: AppUser | null;
  authToken: string | null;
  isAuthenticated: boolean;
  userRole: UserRole;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, requestedRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<void>;
  fetchAdminUsers: () => Promise<AppUser[]>;
  updateUserRole: (userId: string, role: UserRole, assignedMatchIds?: string[]) => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register' | 'forgot';
  setAuthModalTab: (tab: 'login' | 'register' | 'forgot') => void;
  openAuthModal: (tab?: 'login' | 'register' | 'forgot') => void;
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
  resetDemoData: (resetAll?: boolean) => Promise<void>;
  exportBackup: () => void;
  importBackup: (jsonData: any) => Promise<boolean>;
  playCricketSound: (type: 'bat' | 'six' | 'four' | 'wicket' | 'whistle' | 'click') => void;
}

const CricketContext = createContext<CricketContextType | undefined>(undefined);

export const CricketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppDatabase>(() => getInitialCricketData());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');

  // Auth State with persistence in localStorage
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('criclive_auth_token');
  });
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const cached = localStorage.getItem('criclive_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot'>('login');

  const [activeMatchId, setActiveMatchId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('matchId') || 'm_live_01';
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const openAuthModal = (tab: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  // Helper for auth headers
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }, [authToken]);

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

  // Check auth session validity on startup
  useEffect(() => {
    if (authToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        })
        .then((userData) => {
          setCurrentUser(userData);
          localStorage.setItem('criclive_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token expired, clear session
          setAuthToken(null);
          setCurrentUser(null);
          localStorage.removeItem('criclive_auth_token');
          localStorage.removeItem('criclive_user');
        });
    }
  }, [authToken]);

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

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    setAuthToken(data.token);
    setCurrentUser(data.user);
    localStorage.setItem('criclive_auth_token', data.token);
    localStorage.setItem('criclive_user', JSON.stringify(data.user));
    setAuthModalOpen(false);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    requestedRole: UserRole = 'viewer'
  ) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, requestedRole }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    setAuthToken(data.token);
    setCurrentUser(data.user);
    localStorage.setItem('criclive_auth_token', data.token);
    localStorage.setItem('criclive_user', JSON.stringify(data.user));
    setAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      if (authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      }
    } catch {
      // offline fallback
    } finally {
      setAuthToken(null);
      setCurrentUser(null);
      localStorage.removeItem('criclive_auth_token');
      localStorage.removeItem('criclive_user');
    }
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Forgot password request failed');
    }
    return await res.json();
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Password reset failed');
    }
  };

  const fetchAdminUsers = async (): Promise<AppUser[]> => {
    const res = await fetch('/api/admin/users', {
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, assignedMatchIds }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user role');
    }
  };

  // User Role: derived from verified server session, defaults to 'viewer'
  const userRole: UserRole = currentUser?.role || 'viewer';

  // ==========================================
  // MATCH & SCORING ACTIONS WITH AUTH HEADERS
  // ==========================================

  const createMatch = async (matchData: any): Promise<Match> => {
    if (userRole !== 'admin') {
      openAuthModal('login');
      throw new Error('Admin login is required to create a match or tournament.');
    }

    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Authorized Scorer or Admin login is required to score deliveries.');
    }

    if (delivery.isWicket) playCricketSound('wicket');
    else if (delivery.runsBat === 6) playCricketSound('six');
    else if (delivery.runsBat === 4) playCricketSound('four');
    else playCricketSound('bat');

    const res = await fetch(`/api/matches/${matchId}/delivery`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Scorer or Admin login is required to undo deliveries.');
    }
    playCricketSound('click');
    const res = await fetch(`/api/matches/${matchId}/undo`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Scorer or Admin login is required to edit ball deliveries.');
    }
    const res = await fetch(`/api/matches/${matchId}/edit-delivery`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Login required.');
    }
    const res = await fetch(`/api/matches/${matchId}/start-second-innings`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Login required.');
    }
    const res = await fetch(`/api/matches/${matchId}/reopen`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Only tournament administrators can delete matches.');
    }
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Admin login is required to create a tournament.');
    }
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: getAuthHeaders(),
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
      openAuthModal('login');
      throw new Error('Admin login is required to update a tournament.');
    }
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update tournament');
  };

  const deleteTournament = async (id: string) => {
    if (userRole !== 'admin') {
      openAuthModal('login');
      throw new Error('Only admin can delete tournament');
    }
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete tournament');
  };

  const createTeam = async (team: Team) => {
    if (userRole !== 'admin') {
      openAuthModal('login');
      throw new Error('Admin login is required to create teams.');
    }
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(team),
    });
    if (!res.ok) throw new Error('Failed to create team');
  };

  const createPlayer = async (player: Player) => {
    if (userRole !== 'admin') {
      openAuthModal('login');
      throw new Error('Admin login is required to create players.');
    }
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(player),
    });
    if (!res.ok) throw new Error('Failed to save player');
  };

  const resetDemoData = async (resetAll: boolean = false) => {
    if (userRole !== 'admin') {
      openAuthModal('login');
      throw new Error('Admin login required for resetting data.');
    }
    const res = await fetch('/api/reset-demo', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resetAll }),
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
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
      openAuthModal('login');
      throw new Error('Admin login required to import database.');
    }
    const res = await fetch('/api/backup/import', {
      method: 'POST',
      headers: getAuthHeaders(),
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
        authToken,
        isAuthenticated: !!currentUser,
        userRole,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        fetchAdminUsers,
        updateUserRole,
        authModalOpen,
        setAuthModalOpen,
        authModalTab,
        setAuthModalTab,
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
        resetDemoData,
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
