import WebSocket from "ws";

import { randomUUID } from "crypto";
import { moveManager, moveOutput } from "./moveManager";

interface gameRequest {
  username: string;
  action: string;
  timeControl: string;
  id: WebSocket;
  sessionId?: string;
}
export interface playerGameObj {
  gameId: string;
  color: "white" | "black";
  opponent: string;
  gameState: string;
}
export class Game {
  gameId: string;
  playerW: string;
  playerB: string;
  gameState: string; //should be a FEN string
  socketW: WebSocket | null;
  socketB: WebSocket | null;
  sessionIdW: string | undefined;
  sessionIdB: string | undefined;
  moveManagerOfGame: moveManager;

  constructor(req1: gameRequest, req2: gameRequest) {
    this.gameId = randomUUID().split("-")[0]; // Short unique ID

    // Randomly assign colors
    const random = Math.random() < 0.5;
    this.playerW = random ? req1.username : req2.username;
    this.playerB = random ? req2.username : req1.username;
    this.socketW = random ? req1.id : req2.id;
    this.socketB = random ? req2.id : req1.id;
    this.sessionIdW = random ? req1.sessionId : req2.sessionId;
    this.sessionIdB = random ? req2.sessionId : req1.sessionId;

    this.gameState = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    console.log(
      `Game ${this.gameId} created: ${this.playerW} (W) vs ${this.playerB} (B)`,
    );

    const gameObjW = {
      gameId: this.gameId,
      color: "white",
      opponent: this.playerB,
      gameState: this.gameState,
    };

    const gameObjB = {
      gameId: this.gameId,
      color: "black",
      opponent: this.playerW,
      gameState: this.gameState,
    };

    this.sendToWhite(gameObjW);
    this.sendToBlack(gameObjB);
    this.moveManagerOfGame = new moveManager(this.gameState);
  }

  private sendToWhite(data: object) {
    if (this.socketW?.readyState === 1) this.socketW.send(JSON.stringify(data));
  }
  private sendToBlack(data: object) {
    if (this.socketB?.readyState === 1) this.socketB.send(JSON.stringify(data));
  }

  clearSocket(ws: WebSocket) {
    if (this.socketW === ws) this.socketW = null;
    else if (this.socketB === ws) this.socketB = null;
  }

  replaceSocketBySessionId(sessionId: string, ws: WebSocket) {
    if (this.sessionIdW === sessionId) this.socketW = ws;
    else if (this.sessionIdB === sessionId) this.socketB = ws;
  }

  isPlayerInGame(username: string): boolean {
    return this.playerW === username || this.playerB === username;
  }
  //this function will make the move and send the updated gameState to the respective players
  makeMove(gameObj: playerGameObj, move: string) {
    const acutalMoveOutput: moveOutput = this.moveManagerOfGame.executeMove(
      gameObj,
      move,
    );
    if (acutalMoveOutput.newState && !acutalMoveOutput.isGameEnd) {
      this.gameState = acutalMoveOutput.newState;
      const gameObjW = {
        gameId: this.gameId,
        color: "white",
        opponent: this.playerB,
        gameState: this.gameState,
      };

      const gameObjB = {
        gameId: this.gameId,
        color: "black",
        opponent: this.playerW,
        gameState: this.gameState,
      };
      this.sendToWhite(gameObjW);
      this.sendToBlack(gameObjB);
    } else if (acutalMoveOutput.isGameEnd && acutalMoveOutput.newState) {
      this.gameState = acutalMoveOutput.newState;
      const gameOverMsg = {
        state: this.gameState,
        message: "game is over",
      };
      this.sendToWhite(gameOverMsg);
      this.sendToBlack(gameOverMsg);
    } else {
      if (gameObj.color == "white") {
        this.sendToWhite({ message: acutalMoveOutput.message });
      } else {
        this.sendToBlack({ message: acutalMoveOutput.message });
      }
    }
  }

  resign(gameObj: playerGameObj) {
    const msg = {
      state: this.gameState,
      message: "game is over",
      reason: "resign",
    };
    this.sendToWhite(msg);
    this.sendToBlack(msg);
  }

  leaveGame(ws: WebSocket) {
    const isWhite = this.socketW === ws;
    const opponentSocket = isWhite ? this.socketB : this.socketW;
    if (opponentSocket?.readyState === 1)
      opponentSocket.send(
        JSON.stringify({ message: "game is over", reason: "opponent_left" })
      );
  }
}

export class gameManager {
  gameLobby: gameRequest[] = [];
  gameList: Game[] = [];
  private gameMap: Map<string, Game> = new Map();
  private playerGameMap: Map<string, string> = new Map();
  private socketToGameId: Map<WebSocket, string> = new Map();

  addPlayerToLobby(createGameReq: gameRequest) {
    //not let the user enter the lobby if they are already in there
    const isAlreadyInLobby = this.gameLobby
      .map((obj) => JSON.stringify(obj))
      .includes(JSON.stringify(createGameReq));
    if (isAlreadyInLobby) {
      console.log(`player ${createGameReq.username} is already in the lobby`);
      createGameReq.id.send("you are alreay in the lobby wait");
      return;
    }
    if (this.playerGameMap.has(createGameReq.username)) {
      //should probably relay the same message to the user as well
      console.log(`${createGameReq.username} already in a game`);
      createGameReq.id.send("you are already in a game play that");
      return;
    }

    this.gameLobby.push(createGameReq);

    while (this.gameLobby.length >= 2) {
      const req1 = this.gameLobby.shift();
      const req2 = this.gameLobby.shift();

      if (req1 && req2) {
        const game = new Game(req1, req2);
        this.gameList.push(game);
        this.gameMap.set(game.gameId, game);
        this.playerGameMap.set(req1.username, game.gameId);
        this.playerGameMap.set(req2.username, game.gameId);
        this.socketToGameId.set(req1.id, game.gameId);
        this.socketToGameId.set(req2.id, game.gameId);
      }
    }
    console.log(this.gameLobby);
    this.showAllGames();
  }

  removeFromLobby(ws: WebSocket) {
    this.gameLobby = this.gameLobby.filter((req) => req.id !== ws);
    console.log("Player left lobby, remaining:", this.gameLobby.length);
  }

  showAllGames() {
    console.log(this.gameList);
  }
  getGame(gameId: string): Game | undefined {
    //this returns the game object when given its id
    return this.gameMap.get(gameId);
  }

  validateMove(gameId: string, username: string): boolean {
    const game = this.gameMap.get(gameId);
    return game ? game.isPlayerInGame(username) : false;
  }
  makeMove(gameObj: playerGameObj, move: string) {
    const game = this.getGame(gameObj.gameId);
    if (game) {
      game.makeMove(gameObj, move);
    }
  }

  removeGame(gameId: string) {
    const game = this.gameMap.get(gameId);
    if (game) {
      if (game.socketW) this.socketToGameId.delete(game.socketW);
      if (game.socketB) this.socketToGameId.delete(game.socketB);
      this.playerGameMap.delete(game.playerW);
      this.playerGameMap.delete(game.playerB);
      this.gameMap.delete(gameId);
      this.gameList = this.gameList.filter((g) => g.gameId !== gameId);
    }
  }

  handleDisconnect(ws: WebSocket) {
    const gameId = this.socketToGameId.get(ws);
    this.socketToGameId.delete(ws);
    const game = gameId ? this.gameMap.get(gameId) : undefined;
    if (game) game.clearSocket(ws);
  }

  rejoin(sessionId: string, ws: WebSocket) {
    const game = this.gameList.find(
      (g) => g.sessionIdW === sessionId || g.sessionIdB === sessionId
    );
    if (!game) {
      ws.send(JSON.stringify({ message: "no game to rejoin" }));
      return;
    }
    game.replaceSocketBySessionId(sessionId, ws);
    this.socketToGameId.set(ws, game.gameId);
    const isWhite = game.sessionIdW === sessionId;
    const payload = {
      gameId: game.gameId,
      color: isWhite ? "white" : "black",
      opponent: isWhite ? game.playerB : game.playerW,
      gameState: game.gameState,
    };
    ws.send(JSON.stringify(payload));
  }

  resign(gameObj: playerGameObj) {
    const game = this.getGame(gameObj.gameId);
    if (game) {
      game.resign(gameObj);
      this.removeGame(gameObj.gameId);
    }
  }

  leaveGame(gameId: string, ws: WebSocket) {
    const game = this.getGame(gameId);
    if (game) {
      game.leaveGame(ws);
      this.removeGame(gameId);
    }
  }
}
