# Chess Application

A real-time multiplayer chess game with a **Next.js** frontend and a **WebSocket** backend. Players connect, enter a username, get matched in a lobby, and play chess with live board sync. Supports resign, leave game, cancel search, and reconnect by session.

---

## Project structure

```
chessAplication/
├── client/                 # Next.js 16 frontend (React 19, Tailwind CSS)
│   ├── app/
│   │   ├── page.tsx        # Main page: WebSocket, lobby, game view
│   │   ├── layout.tsx      # Root layout, fonts
│   │   ├── globals.css     # Theme variables, board styles
│   │   └── components/
│   │       ├── LobbyView.tsx   # Username, Find game, Cancel, waiting state
│   │       └── GameView.tsx    # Board, opponent, turn, Resign, Leave game
│   └── ...
├── server/
│   ├── index.ts            # WebSocket server, port, event routing
│   └── managers/
│       ├── gameManager.ts  # Lobby, matchmaking, Game instances, rejoin, resign, leave
│       └── moveManager.ts  # Chess rules (chess.js), move validation
└── README.md
```

---

## Tech stack

| Layer      | Tech |
|------------|------|
| **Server** | Node.js, `ws`, TypeScript, `chess.js`, nodemon |
| **Client** | Next.js 16, React 19, Tailwind CSS 4, chessboard.js (CDN), chess.js (CDN) |

---

## Prerequisites

- **Node.js** (v18+)
- **npm** (or yarn/pnpm)

---

## How to run

Run **both** the server and the client.

### 1. Server (port 5555)

```bash
cd server
npm install
npx tsc
npm run dev
```

You should see: `WebSocket server listening on port 5555`

### 2. Client (port 3000)

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:3000**. The client connects to `ws://localhost:5555`.

---

## Features

- **Lobby:** Enter username, "Find a game" to join; first two players are paired with random white/black. "Cancel" to leave lobby.
- **Play:** Board with orientation by color; drag-and-drop moves; turn indicator; Resign and Leave game.
- **Reconnect:** Session ID in `localStorage`; on reconnect, client sends `rejoin` with `sessionId` to reattach to the same game.
- **Security:** SRI on CDN scripts; strong session IDs; server-side username validation and socket checks for moves/resign/leave.

---
