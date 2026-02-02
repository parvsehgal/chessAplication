import { WebSocketServer } from "ws";
import { gameManager } from "./managers/gameManager";

const PORT = Number(process.env.PORT) || 5555;
const wss = new WebSocketServer({ port: PORT });
wss.on("listening", () => console.log(`WebSocket server listening on port ${PORT}`));
wss.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is in use. Stop the other server (Ctrl+C in that terminal) or run: PORT=${PORT + 1} npm run dev`);
  } else console.error(err);
});

const mainGameManager = new gameManager();

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);
  ws.on("close", function () {
    mainGameManager.handleDisconnect(ws);
  });
  ws.on("message", function message(data) {
    const event = JSON.parse(data.toString());
    //each event from a client gets its websocket acctached to it as its id
    event.id = ws;
    if (event.action == "createGame") {
      mainGameManager.addPlayerToLobby(event);
    } else if (event.action == "cancelSearch") {
      mainGameManager.removeFromLobby(event.id);
    } else if (event.action == "makeMove") {
      mainGameManager.makeMove(event.gameObj, event.move);
    } else if (event.action == "resign") {
      mainGameManager.resign(event.gameObj);
    } else if (event.action == "leaveGame") {
      mainGameManager.leaveGame(event.gameId, event.id);
    } else if (event.action == "rejoin") {
      mainGameManager.rejoin(event.sessionId, event.id);
    }
  });
  console.log("a player got made connection to this server");
  ws.send("connected to the game server");
});
