# 🏏 IPL Auction Simulator — Frontend (React)

A real-time multiplayer IPL auction + season simulation app built with **React 18 · Vite · Socket.io Client**.

---

## 📁 Project Structure

```
ipl-frontend/
├── src/
│   ├── main.jsx                  ← Entry point
│   ├── App.jsx                   ← Routes + providers
│   ├── index.css                 ← Global design system
│   ├── context/
│   │   ├── AuthContext.jsx       ← JWT auth state
│   │   └── SocketContext.jsx     ← Single socket.io connection
│   ├── hooks/
│   │   └── useToast.js           ← Toast notification hook
│   ├── utils/
│   │   └── helpers.js            ← Constants + formatters
│   ├── components/
│   │   ├── Navbar.jsx/css        ← Top navigation bar
│   │   ├── PlayerCard.jsx/css    ← Reusable player card
│   │   └── Toast.jsx             ← Toast notifications
│   └── pages/
│       ├── AuthPage.jsx/css      ← Login / Register
│       ├── LobbyPage.jsx/css     ← Create room + pick team
│       ├── RoomPage.jsx          ← Game shell (routes between screens)
│       └── screens/
│           ├── AuctionScreen.jsx/css   ← Live real-time bidding
│           ├── SquadScreen.jsx/css     ← Post-auction squad review
│           ├── SeasonScreen.jsx/css    ← Points table + match results
│           ├── PlayoffsScreen.jsx/css  ← Bracket (Q1/Elim/Q2/Final)
│           └── ChampionScreen.jsx/css  ← Winner celebration + confetti
├── index.html
├── vite.config.js
└── .env.example
```

---

## ⚡ Quick Start

### 1. Install

```bash
cd ipl-frontend
npm install
```

### 2. Configure

```bash
cp .env.example .env
# If backend is on same machine at :4000, leave defaults
```

### 3. Run (backend must be running first)

```bash
npm run dev
# Opens at http://localhost:3000
```

### 4. Build for production

```bash
npm run build
# Output in /dist — deploy to Vercel
```

---

## 🎮 User Flow

```
/auth       → Login or Register
    ↓
/           → Lobby: pick your IPL team → Create Room
    ↓
/room/:id   → AuctionScreen  (live bidding with AI teams)
    ↓
            → SquadScreen    (review your acquired players)
    ↓
            → SeasonScreen   (simulate league, view points table)
    ↓
            → PlayoffsScreen (Q1 / Eliminator / Q2 / Final bracket)
    ↓
            → ChampionScreen (🎉 confetti + winner reveal)
```

---

## 🔌 Socket.io Events Used

| Emitted by client     | Listened by client           |
|----------------------|------------------------------|
| `room:join`          | `auction:player`             |
| `auction:start`      | `auction:timer`              |
| `auction:bid`        | `auction:bid`                |
| `season:simulate`    | `auction:sold / unsold`      |
| `playoffs:simulate`  | `auction:complete`           |
|                      | `season:complete`            |
|                      | `playoffs:complete`          |

---

## 🎨 Design System

**Fonts:** Bebas Neue (display) + Barlow Condensed (headings) + Barlow (body)

**Colors:**
- `--gold` `#f5a623` — primary accent
- `--cyan` `#00d4ff` — secondary accent / info
- `--green` `#2ed573` — success / bid leader
- `--red` `#ff4757` — danger / bowler
- `--bg` `#05080f` — deep navy background

---

## 🚀 Deploy to Vercel

```bash
npm run build
# Push /dist to GitHub → connect to Vercel
# Set env vars:
#   VITE_API_URL     = https://your-backend.onrender.com
#   VITE_SOCKET_URL  = https://your-backend.onrender.com
```

---

## 📈 Coming Next (Phase 5)

- [ ] Player form & injuries
- [ ] Trade window between teams
- [ ] Live commentary text feed
- [ ] Global leaderboard
- [ ] Mobile-first responsive polish
