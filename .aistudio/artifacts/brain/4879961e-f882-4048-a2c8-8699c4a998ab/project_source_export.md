# Universal Cricket Live Scoring & Broadcasting Platform (KPL 5)
## Complete Project Source Code Export

The complete project has been packaged into a downloadable ZIP archive that preserves the exact repository hierarchy.

### Download Links
- **Direct Download (Browser)**: [cricket-live-score-complete-project.zip](https://ais-dev-pzk23xzrlxgty7gqejncan-185946973270.asia-northeast1.run.app/cricket-live-score-complete-project.zip)
- **API Download**: [api/download-project-zip](https://ais-dev-pzk23xzrlxgty7gqejncan-185946973270.asia-northeast1.run.app/api/download-project-zip)
- **In-App Download**: Admin Dashboard -> Settings -> "Export Full Project Source Code (.ZIP)"

---

### Archive Summary
- **Archive File**: `cricket-live-score-complete-project.zip`
- **Archive Size**: ~189 KB (Deflated)
- **Files Included**: 47 files
- **Integrity Status**: Verified & Passed (Zero extraction errors)

---

### Preserved Directory Structure
```
cricket-live-score-complete-project/
├── data/
│   └── cricket_db.json                 # Real tournament, teams (8), squad rosters and 28 matches
├── public/                             # Public static assets
├── src/
│   ├── App.tsx                         # Main SPA router & layout controller
│   ├── index.css                       # Global Tailwind CSS styles
│   ├── main.tsx                        # React application bootstrap
│   ├── components/
│   │   ├── AdminDashboardView.tsx      # Admin management, backups, export & roles
│   │   ├── AuctionSyncView.tsx         # KPL Auction sync & real-time roster monitor
│   │   ├── AuthModal.tsx               # Login, registration & reset dialog
│   │   ├── DetailedScorecard.tsx       # Comprehensive match scorecard
│   │   ├── FixturesHistoryView.tsx     # Fixtures and tournament history
│   │   ├── Header.tsx                  # Top navigation & league branding
│   │   ├── LiveMatchesGrid.tsx         # Live & upcoming match cards
│   │   ├── Navigation.tsx              # Tab switcher with badge indicators
│   │   ├── OBSOverlayView.tsx          # OBS Studio & PRISM broadcast controller
│   │   ├── PointsTableView.tsx         # League standings & NRR calculator
│   │   ├── PublicLiveScoreView.tsx     # Read-only public shareable score view
│   │   ├── QuickMatchModal.tsx         # Quick match generator
│   │   ├── ScoreboardHeader.tsx        # Ball-type badge & match header
│   │   ├── ScoringPad.tsx              # Real-time ball-by-ball scorer console
│   │   ├── StatsMvpView.tsx            # Leaderboards (Orange/Purple caps) & MVP
│   │   ├── TeamsPlayersView.tsx        # Squad rosters and player profiles
│   │   ├── TournamentModal.tsx         # League tournament creator
│   │   ├── TournamentsView.tsx         # Tournament selector & management
│   │   └── overlays/
│   │       ├── FixturesOverlay.tsx     # 16:9 PRISM broadcast overlay for fixtures
│   │       ├── LeaderboardOverlay.tsx  # 16:9 PRISM broadcast overlay for MVP/Caps
│   │       ├── PlayerStatusOverlay.tsx # 16:9 PRISM broadcast overlay for player stats
│   │       ├── PointsTableOverlay.tsx  # 16:9 PRISM broadcast overlay for standings
│   │       ├── PRISMOverlayUrlList.tsx # Dedicated URLs with Copy buttons
│   │       └── ScorecardOverlay.tsx    # 16:9 PRISM broadcast overlay for scorecard
│   ├── context/
│   │   └── CricketContext.tsx          # Global cricket state, SSE listener & auth
│   ├── hooks/
│   │   └── useAuctionSync.ts           # Real-time Firestore onSnapshot hook
│   ├── services/
│   │   └── firebase.ts                 # Firebase Firestore & Auth client
│   ├── types/
│   │   └── cricket.ts                  # Complete TypeScript definitions
│   └── utils/
│       ├── authUtils.ts                # Password hashing and token generation
│       ├── cricketEngine.ts            # Cricket scoring rules, NRR & strike rates
│       └── initialData.ts              # Seed database and default accounts
├── firebase-applet-config.json         # Provisioned Firebase Cloud config
├── firebase-blueprint.json             # Intermediate representation schema blueprint
├── firestore.rules                     # Zero-secret hardened ABAC Firestore security rules
├── index.html                          # Entry HTML
├── metadata.json                       # Applet capability metadata
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript compiler options
├── vite.config.ts                      # Vite configuration & Tailwind plugin
├── bun.lock                            # Lockfile
├── .env.example                        # Environment variables template
└── .gitignore                          # Git exclusions
```

---

### How to Run Locally
1. Extract `cricket-live-score-complete-project.zip`
2. Run `npm install`
3. Run `npm run dev` to start Express + Vite on port 3000
