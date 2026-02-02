# Chess Application

A **real-time multiplayer chess game** you can run locally. Two players connect to the same server, enter a lobby, get matched automatically, and play chess with live board updates.

**Educational purpose:** This project is for learning. Use it to see how **WebSockets** work in a small, end-to-end app — connection, client/server messages, matchmaking, and live state sync — without extra complexity.

---

## What it does

- **Lobby:** You enter a username and click “Find a game”. When a second player does the same, you are paired.
- **Game:** You are assigned white or black at random. You see the board from your side, your opponent’s name, and whose turn it is. Moves sync in real time; when the game ends, you see “Game over.”
- **Tech:** A WebSocket server (Node.js) handles matchmaking and move validation. A web client (Next.js) connects to it and shows the board. No database — everything is in memory for the session.

---

## How to run it (for others)

You need **Node.js** (v18+) and **npm**. Run **both** the server and the client.

### 1. Clone and start the server

```bash
git clone <this-repo-url>
cd chessAplication/server
npm install
npx tsc
npm run dev
```

You should see the server running (e.g. “a player got made connection” when something connects). It listens on **port 8080**.

### 2. Start the client

In a **new terminal**:

```bash
cd chessAplication/client
npm install
npm run dev
```

Open **http://localhost:3000** in your browser. The client connects to the server at `ws://localhost:8080`.

### 3. Play

- Enter a username and click **Find a game**.
- Open another browser tab (or another browser) and do the same with a different username. You’ll be matched and the game starts.
- Drag and drop pieces to move. Refresh the page to leave a game (there is no exit button yet).

---

## App structure

What each part of the repo is for:

```
chessAplication/
├── client/                    # Web frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx           # Single page: lobby + game board, WebSocket logic
│   │   ├── layout.tsx         # Root layout, fonts, metadata
│   │   └── globals.css        # Theme (colors, typography), board frame styles
│   └── package.json           # Next.js 16, React 19, Tailwind CSS 4
│
├── server/                    # WebSocket game server (Node.js + TypeScript)
│   ├── index.ts               # WebSocket server on port 8080, routes actions to gameManager
│   ├── managers/
│   │   ├── gameManager.ts     # Lobby queue, matchmaking, Game instances, player–game mapping
│   │   └── moveManager.ts     # Chess rules (chess.js), move validation, FEN updates
│   └── package.json           # ws, chess.js, nodemon, TypeScript
│
└── README.md                  # This file
```

- **client/app/page.tsx** — Connects to the server, sends “createGame” and “makeMove”, receives game state, renders the lobby or the board (using chessboard.js + chess.js from CDN).
- **server/index.ts** — Accepts WebSocket connections; parses messages and calls `gameManager` for `createGame` and `makeMove`.
- **server/managers/gameManager.ts** — Keeps a lobby list; when two players are in the lobby, creates a `Game`, assigns colors, and forwards moves to that game. Each `Game` holds both players’ sockets and the current FEN.
- **server/managers/moveManager.ts** — Wraps `chess.js` to validate moves and return the new FEN (or an error). Used by `Game` to apply moves.

---

## Tech stack

| Part    | Tech |
|---------|------|
| Server  | Node.js, `ws`, TypeScript, `chess.js`, `nodemon` |
| Client  | Next.js 16, React 19, Tailwind CSS 4, chessboard.js (CDN), chess.js (CDN) |

Game state is **FEN**; the server is the source of truth for each game and broadcasts the updated FEN after every valid move.

---

## WebSocket API (for developers)

- **Client → Server**
  - `createGame`: `{ "action": "createGame", "username": "<name>", "timeControl": "rapid" }`
  - `makeMove`: `{ "action": "makeMove", "gameObj": { "gameId", "color", "opponent", "gameState" }, "move": "<SAN>" }` (e.g. `"move": "e4"`)
- **Server → Client**
  - On match: `{ "gameId", "color", "opponent", "gameState" }` (FEN)
  - After each move: same object with updated `gameState`
  - Game over: `{ "state": "<FEN>", "message": "game is over" }`
  - Errors: plain text (e.g. “you are already in a game play that”, “not your turn rn”)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
