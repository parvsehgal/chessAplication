import WebSocket from "ws"
interface gameRequest{
  username :string,
  action:string,
  timeControl:string,
  id:WebSocket
}
export class Game{
  //should probably use an instance of the chess.js library for move validation
  gameId :string;
  playerW :string;
  playerB :string;
  gameState :string[];
  //probably need the gameState to be the FEN string

  constructor(req1:gameRequest,req2:gameRequest){
    this.gameId = req1.username+req2.username
    //would like to choose randomly but rn hardcode should do
    this.playerW = req1.username
    this.playerB = req2.username
    this.gameState = []
    console.log("game created sending message to participants")
    console.log(req1.id)
    const clientW = req1.id
    const clientB = req2.id
    clientW.send("you are in a game as white") //should be the gamestate
    clientB.send("you are in a game as black")
    //should have the socket ids of both of these users to send them a message of their game creation
    //would be able to then send move between the 2 users
  }
}
export class gameManager{
  gameLobby :gameRequest[]= []
  gameList : Game[] = []
  addPlayerToLobby(createGameReq:gameRequest){
    this.gameLobby.push(createGameReq)
    //after each addition to lobby try to see if a game can be made
    while(this.gameLobby.length !==0 ){
      if(this.gameLobby.length != 2){
        //do an early return from the loop
        break
      }
      const req1 = this.gameLobby.shift()
      const req2 = this.gameLobby.shift()
      if(req1 && req2){
        const game = new Game(req1,req2)
        this.gameList.push(game)
      }
    }
    console.log("game lobby rn")
    console.log(this.gameLobby)
    this.seeActiveGames()
  }
  seeActiveGames(){
   console.log("game list rn")
   console.log(this.gameList)
  }
}
