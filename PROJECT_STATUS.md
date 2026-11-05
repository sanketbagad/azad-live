# AZAD LIVE — Project Status & Roadmap

_Audit date: 2026-11-04 · Scope: full codebase in `AZAD-LIVE/` (~21.7k lines of TS/TSX)_

**Stack:** React 19 + Vite 8 + Tailwind 4 frontend · Express + `tsx` server ([server.ts](server.ts)) · JSON-file persistence ([data/cricket_db.json](data/cricket_db.json)) · Server-Sent Events for real-time sync · Firebase Firestore (auction feed only) · FFmpeg relay for YouTube RTMPS streaming.

---

## 1. Completed Features ✅

### Core scoring
- [x] Ball-by-ball scoring engine — runs, wides, no-balls, byes, leg-byes, penalty runs ([src/utils/cricketEngine.ts](src/utils/cricketEngine.ts))
- [x] Dismissal types (bowled, caught, LBW, run out, stumped, hit wicket, retired, obstructing, handled ball, …)
- [x] Strike rotation, over completion, maidens, fall of wickets, extras breakdown
- [x] Undo last ball and edit any past delivery (full innings recalculation)
- [x] 2nd-innings target, chase result, tied-match detection, match reopen
- [x] Player of the Match auto-calculation
- [x] Ball types: leather / heavy tennis / light tennis; configurable overs & overs-per-bowler
- [x] Scoring pad UI, scoreboard header, detailed scorecard

### Tournaments & data
- [x] Tournament creation (league/groups), fixtures, points table with proper NRR
- [x] Teams & squads manager, add/edit players
- [x] Quick Match creation with toss
- [x] Player stats, MVP leaderboard (batting/bowling/fielding/bonus points), POTM history
- [x] Fixtures & results history
- [x] ~~Seed/demo data~~: removed 2026-11-04. The app starts empty, and real teams, players and tournaments are entered by admins or the auction sync.
- [x] Backup export / import, demo reset (admin)

### Auth & roles
- [x] Email/password register, login, logout, session tokens (30-day)
- [x] PBKDF2-SHA512 hashing (100k iterations), timing-safe compare
- [x] Roles: admin / scorer / viewer; scorer can be restricted to assigned matches
- [x] Admin dashboard: list users, change roles, assign matches; "last admin" protection
- [x] Forgot / reset password flow (token-based, 1-hour expiry)

### Real-time & broadcast
- [x] SSE live stream (`/api/live/stream`) pushing state to all clients
- [x] Public live-score view (`?public=true`)
- [x] OBS / PRISM overlays (`?obs=true`, `/overlay/<theme>`): scorecard, player status, points table, leaderboard, fixtures, end-of-over, match result, Man of the Match, event animations (4/6/W), sponsor bug + sponsor control
- [x] JSON overlay API (`/api/obs/:id`)
- [x] Live Stream Studio: camera + mic + canvas compositor with scoreboard & logos → MediaRecorder chunks → server → FFmpeg → YouTube RTMPS; test/rehearsal mode; simulator mode when no camera
- [x] Per-match custom logos (tournament, teams, sponsor), scoreboard position & scale

### Auction (KPL)
- [x] Auction Hub portal reading Firestore `kpl_auction_players` in real time
- [x] Server-side Firestore listener auto-syncing SOLD/UNSOLD players into team squads
- [x] Idempotent, stale-event-safe sync (`auctionSyncMap`), strict team validation
- [x] Manual sync API (`/api/auction/sync-sold-player`, admin only)
- [x] Firestore security rules with schema validation and default deny

---

## 2. Critical Issues — fix before any public use 🔴

> **Update 2026-11-04:** Issues #1–#8 below are fixed. Email/password auth was replaced with **Google Sign-In only** (Firebase Auth, with ID tokens verified on the server) plus role-based access:
> - New accounts are always **viewers**.
> - Admins add other admins or scorers by Google email from the Admin Dashboard. Pending invites activate on first sign-in.
> - Admins grant **scorer** access per match.
> - `wasimmakrani531@gmail.com` is the founding admin. The server restores it as admin only if no admin exists.
>
> Other changes in the same pass: scoring and streaming routes are guarded by match assignment, PUT bodies are whitelisted, backup import keeps existing accounts, the ZIP routes are gone and the ZIPs moved out of `public/`, user accounts are no longer sent in the public state, legacy password hashes, sessions and demo accounts are purged on startup, rate limiting is in place, CORS is restricted for writes, the database is written atomically, and stream chunk/logo uploads now send auth.

| # | Issue | Where | Impact |
|---|-------|-------|--------|
| 1 ✅ | **Forgot-password returns the reset token in the API response.** Anyone who knows an email (e.g. the owner's, which is hardcoded) can reset that password. | [server.ts:384-389](server.ts#L384-L389) | Full account takeover, including admin. |
| 2 ✅ | **Public ZIP download exposes the database**, including password hashes and 15 live session tokens. Served unauthenticated at `/cricket-live-score-complete-project.zip`, `/api/export-source-zip`, etc. | [server.ts:1433-1454](server.ts#L1433-L1454), [public/](public/) | Session hijacking → admin access. Delete both ZIPs, remove the routes, and **invalidate all sessions**. |
| 3 ✅ | **Self-registration as scorer.** Sending `requestedRole: "scorer"` grants scorer immediately. A scorer with no assigned matches can score *every* match. | [server.ts:236-239](server.ts#L236-L239), [server.ts:576](server.ts#L576) | Anyone can tamper with live scores. Register everyone as viewer and require admin approval. |
| 4 ✅ | **Undo / edit / 2nd-innings / reopen skip the assigned-match check** that `/delivery` does. | [server.ts:594](server.ts#L594), [611](server.ts#L611), [633](server.ts#L633), [651](server.ts#L651) | A scorer can change matches they don't own. Extract a shared `canScoreMatch()` guard. |
| 5 ✅ | **Backup import locks every user out.** Export strips `passwordHash`/`salt`, and import replaces `users` with those hash-less records. | [server.ts:1051-1072](server.ts#L1051-L1072) | Nobody can log in after restoring a backup. Keep existing users or merge credentials on import. |
| 6 ✅ | **Default credentials shown in the UI** (`admin123`, `scorer123`) and seed users share a static salt and known passwords. | [AdminDashboardView.tsx:124](src/components/AdminDashboardView.tsx#L124), [AuthModal.tsx:107-113](src/components/AuthModal.tsx#L107-L113), [initialData.ts:723](src/utils/initialData.ts#L723) | Trivial admin login on any fresh deploy. |
| 7 ✅ | **Mass-assignment on PUT routes.** `Object.assign(match, req.body)` accepts any field (innings, result, id…). | [server.ts:674](server.ts#L674), [server.ts:738](server.ts#L738) | Corrupted data; bypasses the engine. Whitelist editable fields. |
| 8 ✅ | **Firestore rule bypass.** The second clause accepts the owner email *without* `email_verified`. | [firestore.rules](firestore.rules) (`isAuctionAdmin`) | Weakens the verified-email check. Remove the unverified clause. |

---

## 3. Important Improvements 🟠

### Security & hardening
- [x] ~~Remove hardcoded owner email~~ (now a single founding-admin fallback in `server.ts`, plus `firestore.rules` and the external auction snippet)
- [x] Rate limiting on auth and write routes (in-memory, per IP).
- [x] Restrict CORS: it's `*` for every route, including authenticated APIs ([server.ts:153](server.ts#L153)). Allow `*` only on the public overlay/state endpoints.
- [ ] Add input validation (e.g. `zod`) for every POST/PUT body. Today `/api/teams` and `/api/players` store `req.body` as-is.
- [x] Sessions and reset tokens removed entirely (Firebase manages sessions).
- [x] No passwords any more (Google Sign-In only).
- [ ] Don't keep the YouTube stream key in `localStorage` in plain text, or at least warn users about it.
- [ ] Add security headers (`helmet`).
- [ ] Check FFmpeg is installed at startup and report a clear error, rather than failing mid-broadcast.

### Data & scalability
- [ ] **Swap the JSON file for a real database** (SQLite/Postgres, or Firestore since it's already integrated). Every ball currently triggers a synchronous `writeFileSync` of the whole 524 KB file. A crash mid-write can corrupt it, and there's no concurrency safety.
- [ ] **Send diffs over SSE, not the full state.** Each delivery broadcasts the entire DB (~0.5 MB) to every connected viewer ([server.ts:96-107](server.ts#L96-L107)). This won't scale past a few dozen viewers. Send per-match patches and let clients subscribe by `matchId`.
- [ ] In-memory stream sessions disappear on restart. Add an idle-chunk timeout so FFmpeg processes from abandoned streams get killed.
- [ ] Persist `careerStats` when a match completes. The engine never updates them today. Also check for **double counting**: [StatsMvpView.tsx](src/components/StatsMvpView.tsx) adds live match tallies on top of seeded `careerStats`, which may already include those matches.

### Code quality
- [ ] **React hooks rule violation:** [App.tsx](src/App.tsx) returns early for OBS mode and then calls `useEffect`/`useState`. Move the hooks above the early return.
- [ ] Split [server.ts](server.ts) (1,553 lines) into routes/services (auth, matches, tournaments, auction, streaming).
- [ ] Split [LiveStreamStudio.tsx](src/components/streaming/LiveStreamStudio.tsx) (1,839 lines) and [ScoringPad.tsx](src/components/ScoringPad.tsx) (875 lines).
- [ ] Remove repeated `any` casts (`(req as any).user`, `ffmpegProcess: any`) and add proper Express request typing.
- [ ] Extract a shared `emptyCareerStats()` helper. The same object literal is copy-pasted many times in [QuickMatchModal.tsx](src/components/QuickMatchModal.tsx).
- [ ] Rename the package from `"react-example"` in [package.json](package.json).
- [ ] Remove the unused `@google/genai` dependency (no code uses it, though [metadata.json](metadata.json) still claims a Gemini capability), or build the AI feature.

---

## 4. Pending / Missing Features 🟡

### Cricket rules
- [ ] Free hit after a no-ball
- [ ] Super Over for tied matches (knockouts especially)
- [ ] DLS / rain-reduced overs and revised targets
- [ ] Explicit `innings_break` flow (the status exists in types but isn't used); validate the 1st innings is complete before `start-second-innings`
- [ ] Abandoned / No Result handling in the UI (points rules already include `ptsNR`)
- [ ] Retired hurt → resume batting
- [ ] Partnerships view, wagon wheel, Manhattan / worm charts
- [ ] Commentary / ball-by-ball text feed
- [ ] Test / multi-day formats (only limited-overs today)

### Management
- [ ] Delete / archive teams and players (no endpoints exist)
- [ ] Playing XI selection and substitutes / impact player
- [ ] Knockout brackets (semis/final) auto-generated from the points table
- [ ] Auto fixture generator (round robin)
- [ ] Image upload storage (logos are base64 in the JSON DB today, up to 7 MB each, which bloats every SSE payload)

### UX
- [x] URL routing: every screen has its own path (`/live`, `/fixtures`, `/admin`…), and back/forward and refresh work.
- [ ] Offline scoring queue for poor ground connectivity (PWA + retry)
- [ ] Shareable match link / QR code for spectators
- [ ] Push notifications for wickets / milestones
- [ ] i18n (Hindi / Marathi / Urdu) for local tournaments
- [ ] Accessibility pass (ARIA labels, keyboard scoring shortcuts)

### Streaming
- [ ] Reconnect/resume on network drop (health states exist in types; verify the end-to-end recovery)
- [ ] Multi-camera / scene switching
- [ ] Streaming to other platforms (Facebook, custom RTMP)
- [ ] YouTube OAuth to create broadcasts automatically instead of pasting keys

---

## 5. DevOps & Housekeeping 🧹

- [ ] **Initialize git.** The project isn't under version control. Add `data/cricket_db.json` to `.gitignore`, since it contains user hashes and sessions.
- [ ] Delete the backup folders: `.phase1_backup/`, `.phase2_3_backup/`, `.master_upgrade_backup/`, `data/backup_master/` (git replaces them).
- [ ] Delete the duplicate ZIPs in [public/](public/) (the two files are byte-identical).
- [ ] Add a `README.md`: setup, env vars, FFmpeg requirement, default admin bootstrap, OBS/PRISM overlay URLs.
- [ ] Add tests:
  - Unit tests for [cricketEngine.ts](src/utils/cricketEngine.ts) (extras, strike rotation, undo/edit, NRR, ties). This is the highest-value target.
  - API tests for auth/role guards (would have caught issues #3–#5).
- [ ] CI: `npm run lint` (tsc) + tests on every push.
- [ ] Production build script: `build` only builds the client, and `start` runs via `tsx`. Bundle the server too (esbuild is already a dependency).
- [ ] Dockerfile including FFmpeg; health-check endpoint; structured logging.
- [ ] Move the Firebase config to env vars per environment (dev/prod).

---

## 6. Suggested Priority Order

1. **Now (security):** Critical issues #1–#8. Delete the public ZIPs and invalidate all sessions first.
2. **Next (stability):** git + README, hooks fix in App.tsx, engine unit tests, backup-import fix.
3. **Then (scale):** real database, SSE diffs, image storage off the main DB.
4. **Features:** free hit, super over, DLS, delete team/player, URL routing, offline scoring.
5. **Polish:** charts, commentary, i18n, multi-platform streaming.

---

_Note: TypeScript type-check and runtime tests weren't run for this audit because `node_modules` isn't installed. Run `npm install && npm run lint` to surface any type errors._
