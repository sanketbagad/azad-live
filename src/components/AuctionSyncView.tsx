import React, { useState } from 'react';
import { useAuctionSync } from '../hooks/useAuctionSync';
import { useCricket } from '../context/CricketContext';
import {
  Gavel,
  CheckCircle2,
  Users,
  Search,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Key
} from 'lucide-react';

export const AuctionSyncView: React.FC = () => {
  const { auctionPlayers, syncStatus, lastSyncTime, stats, lastEvent, isAutoSyncActive } = useAuctionSync();
  const { state, getAuthHeaders, userRole, openAuthModal } = useCricket();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SOLD' | 'UNSOLD' | 'IN_AUCTION' | 'UPCOMING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [syncedSquadsCount, setSyncedSquadsCount] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const playersList = Object.values(auctionPlayers);

  const filteredPlayers = playersList.filter((p) => {
    const matchesFilter = activeFilter === 'ALL' || p.soldStatus === activeFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.teamName && p.teamName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Sync SOLD players into the AZAD LIVE App's official Team Squads (Manual backup option)
  const handleSyncToSquads = async () => {
    if (userRole !== 'admin') {
      openAuthModal();
      return;
    }
    setIsSyncing(true);
    let count = 0;
    const soldPlayers = playersList.filter((p) => p.soldStatus === 'SOLD' && p.teamId);

    try {
      for (const ap of soldPlayers) {
        const res = await fetch('/api/auction/sync-sold-player', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            id: ap.id,
            name: ap.name,
            category: ap.category,
            teamId: ap.teamId,
            teamName: ap.teamName,
            soldPrice: ap.soldPrice,
            basePrice: ap.basePrice,
            status: ap.soldStatus,
            updatedAt: ap.updatedAt || Date.now(),
          }),
        });
        if (res.ok) count++;
      }
      setSyncedSquadsCount(count);
      setTimeout(() => setSyncedSquadsCount(null), 4000);
    } catch (err: any) {
      alert('Squad sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const htmlIntegrationSnippet = `<!-- ========================================================================= -->
<!-- AZAD LIVE AUCTION CONTROL - FIREBASE REAL-TIME AUTO-SYNC -->
<!-- Paste this snippet in KPL_Auction_Control_Custom_Teams_Groups.html before </body> -->
<!-- ========================================================================= -->

<!-- 1. Floating Organizer Sign-in Bar -->
<div id="kpl-auth-bar" style="position:fixed;bottom:12px;right:12px;z-index:9999;background:#090d16;color:#fff;padding:8px 14px;border-radius:10px;border:1px solid #d97706;font-family:sans-serif;font-size:12px;display:flex;align-items:center;gap:10px;box-shadow:0 6px 20px rgba(0,0,0,0.7);">
  <span id="kpl-auth-status">🔒 Organizer: Not Logged In</span>
  <button id="kpl-login-btn" style="background:#dc2626;color:#fff;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:bold;">Sign In with Google</button>
</div>

<!-- 2. Firebase SDK Modules -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
  import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

  const firebaseConfig = {
    projectId: "azad-live",
    appId: "1:412408179252:web:30e29e0803439964917861",
    apiKey: "AIzaSyC4uwg045u_n7e9KnE66e7vFh0UAwWYYgU",
    authDomain: "azad-live.firebaseapp.com",
    firestoreDatabaseId: "(default)"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  // Strict Organizer Check: Google Provider + exact email wasimmakrani531@gmail.com + email_verified
  function isAuthorizedOrganizer(user) {
    if (!user) return false;
    const isGoogle = user.providerData && user.providerData.some(p => p.providerId === "google.com");
    return isGoogle && user.email === "wasimmakrani531@gmail.com" && user.emailVerified === true;
  }

  const statusEl = document.getElementById("kpl-auth-status");
  const loginBtn = document.getElementById("kpl-login-btn");

  loginBtn.addEventListener("click", async () => {
    if (auth.currentUser) {
      await signOut(auth);
    } else {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        alert("Google Login Error: " + err.message);
      }
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user && isAuthorizedOrganizer(user)) {
      statusEl.innerHTML = '🟢 Organizer: <strong style="color:#f59e0b">' + user.email + '</strong> (Verified)';
      loginBtn.innerText = "Sign Out";
      loginBtn.style.background = "#475569";
    } else if (user) {
      statusEl.innerHTML = '⚠️ Logged in as: ' + user.email + ' <span style="color:#ef4444">(Not Authorized Organizer)</span>';
      loginBtn.innerText = "Switch Account";
      loginBtn.style.background = "#dc2626";
    } else {
      statusEl.innerHTML = '🔒 Organizer: Not Logged In';
      loginBtn.innerText = "Sign In with Google";
      loginBtn.style.background = "#dc2626";
    }
  });

  /**
   * Universal Firebase Sync Function
   * Call inside setRecord(status) in your HTML Auction code
   */
  window.kplSyncAuctionToFirebase = async function(status, playerId, playerName, playerCategory, playerBasePrice, teamId, teamName, finalPrice) {
    const user = auth.currentUser;
    if (!isAuthorizedOrganizer(user)) {
      console.warn("⚠️ Firebase write blocked: Only verified Organizer wasimmakrani531@gmail.com via Google Sign-In can write auction records.");
      return;
    }

    try {
      const pid = String(playerId || ("p_" + String(playerName).replace(/\\s+/g, "_").toLowerCase()));
      const playerDocRef = doc(db, "kpl_auction_players", pid);

      const payload = {
        id: pid,
        name: String(playerName || "Player"),
        category: String(playerCategory || "all_rounder"),
        basePrice: Number(playerBasePrice || 0),
        soldStatus: status, // "SOLD" or "UNSOLD"
        updatedAt: Date.now()
      };

      if (status === "SOLD") {
        payload.teamId = String(teamId || "");
        payload.teamName = String(teamName || "Assigned Team");
        payload.soldPrice = Number(finalPrice || 0);
      }

      await setDoc(playerDocRef, payload, { merge: true });
      console.log("⚡ [AZAD LIVE Synced]:", playerName, "=>", status, payload.soldPrice ? "₹" + payload.soldPrice : "");
    } catch (err) {
      console.warn("Firebase sync non-blocking error:", err.message);
    }
  };

  console.log("✅ AZAD LIVE Authenticated Firebase Bridge Ready");
</script>`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(htmlIntegrationSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-ink-850 to-red-950/80 border border-amber-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Gavel className="w-48 h-48 text-amber-400" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl">
                <Gavel className="w-6 h-6" />
              </span>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-red-600 text-white uppercase mr-2">
                  AZAD LIVE
                </span>
                <span className="text-2xl font-black text-white tracking-wide">
                  Premier Auction Real-Time Hub
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time Firestore synchronization between external Auction Control and the AZAD LIVE Platform. Zero static secrets; protected by verified Organizer Google authentication.
            </p>
          </div>

          {/* Connection Status Badge */}
          <div className="flex flex-col items-end space-y-1.5">
            <div className="flex items-center space-x-2 bg-ink-950/80 px-4 py-2 rounded-xl border border-amber-500/40 shadow-inner">
              <span className={`w-2.5 h-2.5 rounded-full ${
                syncStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : syncStatus === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-red-400'
              }`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {syncStatus === 'connected' ? 'Zero-Click Auto-Sync: Active' : syncStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
            <span className="text-[11px] text-amber-300/80 font-mono">
              Collection: kpl_auction_players
            </span>
          </div>
        </div>

        {/* Live Auto-Sync Pipeline Status Bar */}
        <div className="mt-5 p-3.5 bg-ink-950/90 border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-200">
              One-Way Stream: <strong className="text-amber-400">HTML Auction</strong> ➔ <strong className="text-sky-400">Firestore</strong> ➔ <strong className="text-emerald-400">AZAD LIVE Server</strong> ➔ <strong className="text-white">Official Squads</strong>
            </span>
          </div>

          {lastEvent && (
            <div className="bg-ink-850 px-3 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-emerald-300">
              ⚡ Latest: <strong className="text-white">{lastEvent.playerName}</strong> ➔ <span className={lastEvent.status === 'SOLD' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{lastEvent.status}</span> {lastEvent.teamName ? `(${lastEvent.teamName})` : ''}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
          <div className="bg-ink-950/60 border border-white/[0.06] p-3 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Players</span>
            <span className="text-2xl font-black text-white font-mono">{stats.total}</span>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">SOLD Players</span>
            <span className="text-2xl font-black text-emerald-300 font-mono">{stats.soldCount}</span>
          </div>
          <div className="bg-red-950/30 border border-red-800/40 p-3 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 block">UNSOLD</span>
            <span className="text-2xl font-black text-red-300 font-mono">{stats.unsoldCount}</span>
          </div>
          <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Upcoming</span>
            <span className="text-2xl font-black text-amber-300 font-mono">{stats.upcomingCount}</span>
          </div>
          <div className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Total Auction Value</span>
            <span className="text-xl font-black text-amber-300 font-mono">₹{stats.totalSpent.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="card !rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'SOLD', 'IN_AUCTION', 'UNSOLD', 'UPCOMING'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilter === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-ink-950/60 text-slate-400 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search player or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-ink-950/60 border border-white/[0.06] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
            />
          </div>

          <button
            onClick={handleSyncToSquads}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            title="Import all SOLD players into KPL 5 Team Squads in this app"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Official Squads'}</span>
          </button>
        </div>
      </div>

      {syncedSquadsCount !== null && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{syncedSquadsCount} players successfully added to Team Squads! Official lineups now have these players.</span>
        </div>
      )}

      {/* Players List Table */}
      <div className="card overflow-hidden shadow-xl">
        <div className="p-4 bg-ink-950/80 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Auction Roster ({filteredPlayers.length} players)</span>
          </h3>
          <span className="text-xs text-slate-400">
            {lastSyncTime ? `Last updated: ${new Date(lastSyncTime).toLocaleTimeString()}` : ''}
          </span>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="p-10 text-center">
            <Gavel className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
            <h4 className="text-base font-bold text-slate-300 mb-1">No auction records found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              When you mark players in your separate HTML Auction Control App, they will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-950/60 text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Base Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sold To Team</th>
                  <th className="py-3 px-4 text-right">Sold Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-slate-300">
                {filteredPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-white/[0.05] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {player.name}
                      <span className="block text-[10px] text-slate-500 font-mono">{player.id}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.05] text-slate-300">
                        {player.category || 'All-Rounder'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      ₹{(player.basePrice || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          player.soldStatus === 'SOLD'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                            : player.soldStatus === 'IN_AUCTION'
                            ? 'bg-amber-950 text-amber-300 border border-amber-600/50 animate-pulse'
                            : player.soldStatus === 'UNSOLD'
                            ? 'bg-red-950 text-red-400 border border-red-700/50'
                            : 'bg-white/[0.05] text-slate-400 border border-white/10'
                        }`}
                      >
                        {player.soldStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {player.soldStatus === 'SOLD' && player.teamName ? (
                        <span className="font-bold text-white bg-ink-950/60 px-2.5 py-1 rounded-md border border-white/10">
                          {player.teamName}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-sm text-emerald-400 font-mono">
                      {player.soldStatus === 'SOLD' && player.soldPrice
                        ? `₹${player.soldPrice.toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HTML Integration Code Snippet Section */}
      <div className="card p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Secure Authentication & HTML Integration Snippet</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Zero static secrets. Uses Google OAuth to verify that only organizer <code className="text-slate-200 font-mono">wasimmakrani531@gmail.com</code> can write.
            </p>
          </div>

          <button
            onClick={copyCodeToClipboard}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              copiedSnippet
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
            }`}
          >
            {copiedSnippet ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSnippet ? 'Copied to Clipboard!' : 'Copy JavaScript Code'}</span>
          </button>
        </div>

        <div className="bg-ink-950/60 border border-white/[0.06] rounded-xl p-4 overflow-x-auto text-[11px] font-mono text-cyan-300 leading-relaxed max-h-72">
          <pre>{htmlIntegrationSnippet}</pre>
        </div>

        <div className="bg-ink-950/60 border border-white/[0.06] rounded-xl p-4 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-amber-300 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Exact setRecord(status) Integration Instructions</span>
          </h4>
          <p>
            कृपया अपनी HTML फ़ाइल में मौजूद <code>setRecord(status)</code> फंक्शन का वास्तविक कोड हमें दिखाएं। हम आपके वास्तविक वेरिएबल्स (जैसे आपका खिलाड़ी ऑब्जेक्ट, चुनी हुई टीम का ऑब्जेक्ट और अंतिम बोली का वेरिएबल) देखकर ठीक वही कोड तैयार करेंगे, ताकि आपके पुराने लॉजिक में एक भी बग न आए।
          </p>
        </div>
      </div>
    </div>
  );
};
