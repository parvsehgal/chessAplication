# Chess

Real-time multiplayer chess. Two players connect, get matched, and play with live board sync.

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# Terminal 1 - Server
cd server && npm install && npx tsc && npm run dev

# Terminal 2 - Client
cd client && npm install && npm run dev
```

Open http://localhost:3000

## Features

- **Matchmaking** — Enter username, find opponent, random color assignment
- **Live sync** — Moves update instantly on both boards
- **Reconnect** — Session persists in localStorage; rejoin if disconnected
- **Game controls** — Resign, leave game, cancel search

## Tech Stack

| Layer | Stack |
|-------|-------|
| Server | Node.js, TypeScript, `ws`, `chess.js` |
| Client | Next.js 16, React 19, Tailwind CSS 4 |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5555` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for client | `ws://localhost:5555` |

## Project Structure

```
├── server/
│   ├── index.ts              # WebSocket server
│   └── managers/
│       ├── gameManager.ts    # Lobby, matchmaking, game state
│       └── moveManager.ts    # Move validation (chess.js)
│
├── client/
│   └── app/
│       ├── page.tsx          # Main game logic
│       └── components/
│           ├── LobbyView.tsx
│           └── GameView.tsx
```

## Deployment

**Server** (Railway/Render/Fly.io):
- Root: `server`
- Build: `npm install && npx tsc`
- Start: `node dist/index.js`

**Client** (Vercel):
- Root: `client`
- Set `NEXT_PUBLIC_WS_URL=wss://your-server-url`

## WebSocket API

| Action | Payload |
|--------|---------|
| `createGame` | `{ username, sessionId }` |
| `cancelSearch` | `{}` |
| `makeMove` | `{ gameObj, move }` |
| `resign` | `{ gameObj }` |
| `leaveGame` | `{ gameId }` |
| `rejoin` | `{ sessionId }` |
