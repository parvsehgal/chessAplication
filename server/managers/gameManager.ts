import WebSocket from "ws";
import { randomUUID } from "crypto";

interface gameRequest {
  username: string;
  action: string;
  timeControl: string;
  id: WebSocket;
}

export class Game {
  gameId: string;
  playerW: string;
  playerB: string;
  gameState: string[];
  socketW: WebSocket;
  socketB: WebSocket;

  constructor(req1: gameRequest, req2: gameRequest) {
    this.gameId = randomUUID().split("-")[0]; // Short unique ID

    // Randomly assign colors
    const random = Math.random() < 0.5;
    this.playerW = random ? req1.username : req2.username;
    this.playerB = random ? req2.username : req1.username;
    this.socketW = random ? req1.id : req2.id;
    this.socketB = random ? req2.id : req1.id;

    this.gameState = [];

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

    this.socketW.send(JSON.stringify(gameObjW));
    this.socketB.send(JSON.stringify(gameObjB));
  }

  isPlayerInGame(username: string): boolean {
    return this.playerW === username || this.playerB === username;
  }
}

export class gameManager {
  gameLobby: gameRequest[] = [];
  gameList: Game[] = [];
  //maps game id to its game object
  private gameMap: Map<string, Game> = new Map();
  //maps username with gameid
  private playerGameMap: Map<string, string> = new Map();

  addPlayerToLobby(createGameReq: gameRequest) {
    if (this.playerGameMap.has(createGameReq.username)) {
      console.log(`${createGameReq.username} already in a game`);
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
      }
    }
    this.showAllGames();
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
}
