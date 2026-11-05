import { SheetBackdrop } from './ui/SheetBackdrop';
import React, { useEffect, useState } from 'react';
import { useCricket } from '../context/CricketContext';
import { AppUser, UserRole } from '../types/cricket';
import {
  Shield,
  Users,
  Lock,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Check,
  AlertTriangle,
  Key,
  Database,
  Sliders,
  CheckCircle,
  LogIn,
  Tv,
  Video,
  Smartphone,
  Radio,
  UserPlus,
} from 'lucide-react';
import { PRISMOverlayUrlList } from './overlays/PRISMOverlayUrlList';

export const AdminDashboardView: React.FC = () => {
  const {
    currentUser,
    userRole,
    openAuthModal,
    fetchAdminUsers,
    updateUserRole,
    addUser,
    removeUser,
    exportBackup,
    importBackup,
    state,
  } = useCricket();

  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [selectedSubTab, setSelectedSubTab] = useState<'users' | 'settings' | 'prism_overlays' | 'streaming_architecture'>('prism_overlays');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('admin');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Match assignment modal state
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);

  useEffect(() => {
    if (userRole === 'admin') {
      loadUsers();
    }
  }, [userRole]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await fetchAdminUsers();
      setUsersList(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      setStatusMsg({ type: 'success', text: 'User role updated successfully!' });
      await loadUsers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    try {
      await addUser(newUserEmail.trim(), newUserRole, newUserName.trim() || undefined);
      setStatusMsg({
        type: 'success',
        text: `${newUserEmail.trim()} added as ${newUserRole}. Their access activates when they sign in with that Google account.`,
      });
      setNewUserEmail('');
      setNewUserName('');
      await loadUsers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add user' });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = async (user: AppUser) => {
    if (!confirm(`Remove ${user.name} (${user.email})? They will become a viewer if they sign in again.`)) return;
    try {
      await removeUser(user.id);
      setStatusMsg({ type: 'success', text: `${user.email} removed.` });
      await loadUsers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to remove user' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = await importBackup(json);
        if (success) {
          setStatusMsg({ type: 'success', text: 'Database imported and restored successfully!' });
        } else {
          setStatusMsg({ type: 'error', text: 'Failed to import database file.' });
        }
      } catch {
        setStatusMsg({ type: 'error', text: 'Invalid JSON file format.' });
      }
    };
    reader.readAsText(file);
  };

  // If NOT Admin: Show Protected Login Screen as required in Requirement 1
  if (userRole !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-12 card p-6 sm:p-8 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-wide leading-none text-white">Administrator Access Required</h2>
          <p className="text-xs text-slate-400 mt-2">
            The Admin & Settings Dashboard is protected. Please sign in with Google using an Administrator account to manage user roles, tournament configurations, and system backups.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => openAuthModal()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>
        </div>

      </div>
    );
  }

  // Logged-in Admin Screen
  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Top Banner */}
      <div className="card p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mt-0.5">
            Logged in as <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.email})
          </p>
        </div>

        {/* Sub-tab pills with responsive wrap */}
        <div className="flex flex-wrap gap-1 p-1 bg-ink-950/60 rounded-xl border border-white/[0.06] text-xs font-semibold">
          <button
            onClick={() => setSelectedSubTab('prism_overlays')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              selectedSubTab === 'prism_overlays'
                ? 'bg-cyan-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>PRISM Overlays</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('users')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedSubTab === 'users'
                ? 'bg-cyan-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            User Roles ({usersList.length})
          </button>
          <button
            onClick={() => setSelectedSubTab('streaming_architecture')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              selectedSubTab === 'streaming_architecture'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Streaming & Highlights</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('settings')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedSubTab === 'settings'
                ? 'bg-cyan-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Database & Backups
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700/60 text-rose-200'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* SUB-TAB 1: USER ROLES MANAGEMENT */}
      {selectedSubTab === 'users' && (
        <div className="card shadow-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Registered Users & Authorization</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Add admins and scorers by their Google email, or change roles below. Viewers cannot alter scores.
              </p>
            </div>
            <button
              onClick={loadUsers}
              className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-xs text-slate-300 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Add user / admin by Google email */}
          <form
            onSubmit={handleAddUser}
            className="p-4 border-b border-white/[0.06] bg-ink-950/40 flex flex-col sm:flex-row gap-2 text-xs"
          >
            <input
              type="email"
              required
              placeholder="Google email, e.g. organizer@gmail.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="flex-[2] bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-400"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-400"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-2 text-white"
            >
              <option value="admin">Admin</option>
              <option value="scorer">Scorer</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isAddingUser}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-500 to-pulse-500 hover:brightness-110 disabled:opacity-60 text-white font-bold flex items-center justify-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAddingUser ? 'Adding...' : 'Add User'}</span>
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-ink-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Current Role</th>
                  <th className="py-3 px-3">Assign Role</th>
                  <th className="py-3 px-3 text-right">Match Scope</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.05]">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {user.photoURL && (
                        <img
                          src={user.photoURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="inline-block w-6 h-6 rounded-full mr-2 align-middle"
                        />
                      )}
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          You
                        </span>
                      )}
                      {user.isPending && (
                        <span
                          title="Added by an admin; access activates on their first Google sign-in"
                          className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-400 border border-white/10"
                        >
                          Pending sign-in
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : user.role === 'scorer'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/[0.05] text-slate-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        className="bg-white/[0.05] border border-white/10 rounded-lg p-1 text-xs text-white"
                      >
                        <option value="viewer">Viewer (Read-Only)</option>
                        <option value="scorer">Scorer (Record Balls)</option>
                        <option value="admin">Admin (Full Control)</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {user.role === 'scorer' ? (
                        <button
                          onClick={() => {
                            setAssigningUserId(user.id);
                            setSelectedMatchIds(user.assignedMatchIds || []);
                          }}
                          className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-cyan-300 text-[11px]"
                        >
                          {user.assignedMatchIds?.length
                            ? `${user.assignedMatchIds.length} Matches`
                            : 'Assign Matches'}
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleRemoveUser(user)}
                          title="Remove user"
                          className="p-1.5 rounded bg-white/[0.05] hover:bg-rose-900 text-slate-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DATABASE, BACKUPS & MAINTENANCE */}
      {selectedSubTab === 'settings' && (
        <div className="grid grid-cols-1 gap-5 max-w-2xl">
          {/* Export & Import Card */}
          <div className="card p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Database Backup & Restore</span>
            </h3>
            <p className="text-xs text-slate-400">
              Export the current tournaments, matches, player profiles, and statistics to a standalone JSON file, or restore from an existing backup.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={exportBackup}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-cyan-300 font-semibold text-xs border border-white/10 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Backup (JSON)</span>
              </button>

              <label className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-emerald-300 font-semibold text-xs border border-white/10 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import Backup</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 3: PRISM OVERLAY URLS */}
      {selectedSubTab === 'prism_overlays' && (
        <div className="space-y-6">
          <PRISMOverlayUrlList />
        </div>
      )}

      {/* SUB-TAB 4: MULTI-DEVICE BROADCAST & VIDEO PIPELINE ARCHITECTURE */}
      {selectedSubTab === 'streaming_architecture' && (
        <div className="space-y-5">
          <div className="card p-6 shadow-xl space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">AZAD LIVE • Broadcast & Video Pipeline Architecture</h3>
                <p className="text-xs text-slate-400">
                  Ready for dual-phone live scoring, camera streaming, and video clipping workflows
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Dual Phone Streaming Workflow */}
            <div className="card p-5 shadow-lg space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Workflow 1: Scoring on Phone 1, Streaming on Phone 2</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Operates completely over the air with zero cables:
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong className="text-white">Phone 1 (Ground Scorer):</strong> Opens the mobile Scoring Pad and records each delivery with single taps.</li>
                <li><strong className="text-white">Phone 2 (Camera Operator):</strong> Streams live cricket via PRISM Live Studio app and pastes the transparent Lower-Third Overlay URL into the PRISM Web Widget.</li>
                <li><strong className="text-white">Instant Sync:</strong> As soon as Phone 1 taps a run or wicket, Phone 2&apos;s camera video overlay updates within 200 milliseconds.</li>
              </ul>
            </div>

            {/* 2. Professional Camera & Laptop Broadcast */}
            <div className="card p-5 shadow-lg space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Tv className="w-4 h-4" />
                <span>Workflow 2: Professional Camera & OBS / vMix Setup</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Production-grade multi-camera broadcasting:
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong className="text-white">Laptop Running OBS:</strong> Connects HDMI/SDI video capture cards and sets up scenes.</li>
                <li><strong className="text-white">Browser Sources:</strong> Add <code>?obs=true&amp;matchId=...&amp;theme=lower_third</code> (1920×1080 transparent) as a layer above the live camera.</li>
                <li><strong className="text-white">Multi-Overlay Hotkeys:</strong> Switch between Lower Third, Full Scorecard, End-of-Over summary, and Man of the Match with smooth transitions.</li>
              </ul>
            </div>

            {/* 3. Match Highlights & Video Clipping Indexing */}
            <div className="card p-5 shadow-lg space-y-3 md:col-span-2">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                <Radio className="w-4 h-4" />
                <span>Workflow 3: Highlights Gallery &amp; Event Clipping Index</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The scoring engine precisely tags every ball delivery with metadata:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl">
                  <div className="text-[11px] font-bold text-blue-400">FOURS Index</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Timestamped ball event with striker name, bowler, over number, and delivery outcome.
                  </div>
                </div>
                <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl">
                  <div className="text-[11px] font-bold text-purple-400">SIXES Index</div>
                  <div className="text-xs text-slate-400 mt-1">
                    High-impact maximum strikes indexed for highlight reel extraction.
                  </div>
                </div>
                <div className="p-3 bg-ink-950/60 border border-white/[0.06] rounded-xl">
                  <div className="text-[11px] font-bold text-rose-400">WICKETS Index</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Dismissal type (bowled, caught, run out, lbw), fielder assist, and batsman out metadata.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-ink-950/80 border border-amber-600/30 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                <strong>Hardware &amp; Video Capture Pipeline Transparency:</strong> Generating standalone MP4 video files automatically requires an active hardware video capture feed (or RTMP stream recorder with video segment buffers). Our scoring platform indexes all delivery timecodes in real-time and triggers live broadcast event animations, ready for direct hookup when video hardware recording storage is attached. Direct YouTube streaming credentials remain untouched pending user authorization.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Assignment Modal for Scorers */}
      {assigningUserId && (
        <SheetBackdrop>
          <div className="card sheet max-w-md px-5 pt-5 space-y-4 overflow-y-auto">
            <h3 className="text-base font-bold text-white">Assign Matches to Scorer</h3>
            <p className="text-xs text-slate-400">
              Select which matches this scorer can score and stream. A scorer with no assigned matches cannot score anything.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {Object.values(state.matches).map((m) => {
                const isSelected = selectedMatchIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMatchIds(selectedMatchIds.filter((id) => id !== m.id));
                      } else {
                        setSelectedMatchIds([...selectedMatchIds, m.id]);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                        : 'bg-white/[0.05] border-white/10 text-slate-300'
                    }`}
                  >
                    <span>{m.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex space-x-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setAssigningUserId(null)}
                className="flex-1 py-2 rounded-xl bg-white/[0.05] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (assigningUserId) {
                    await updateUserRole(assigningUserId, 'scorer', selectedMatchIds);
                    setAssigningUserId(null);
                    await loadUsers();
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </SheetBackdrop>
      )}
    </div>
  );
};
