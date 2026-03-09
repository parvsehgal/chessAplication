"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";

interface GameState {
  gameId: string;
  color: string;
  opponent: string;
  gameState: string;
  timeControl?: {
    initialTime: number;
    increment: number;
    type: string;
  };
  timerState?: {
    yourTime: number;
    opponentTime: number;
    activePlayer: "white" | "black" | null;
  };
}

interface TimerDisplayState {
  yourTime: number;        // milliseconds
  opponentTime: number;    // milliseconds
  activePlayer: "white" | "black" | null;
  lastUpdate: number;      // timestamp
}

declare global {
  interface Window {
    Chessboard: any;
    $: any;
    jQuery: any;
    Chess: any;
  }
}

export default function Home() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [findingGame, setFindingGame] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [username, setUsername] = useState("");
  const [timeControl, setTimeControl] = useState<string>("rapid");
  const [timerState, setTimerState] = useState<TimerDisplayState | null>(null);
  const sessionIdRef = useRef<string>("");
  const currentGameRef = useRef<GameState | null>(null);
  const [jqueryLoaded, setJqueryLoaded] = useState(false);
  const [chessboardLoaded, setChessboardLoaded] = useState(false);
  const [chessJsLoaded, setChessJsLoaded] = useState(false);
  const boardRef = useRef<any>(null);
  const chessRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scriptsReady = jqueryLoaded && chessboardLoaded && chessJsLoaded;
  const connected = ws?.readyState === 1;

  // Load chessboard CSS
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  // Session id for reconnect (persist in localStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let id = localStorage.getItem("chessSessionId");
    if (!id) {
      id = crypto.randomUUID?.() ?? `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("chessSessionId", id);
    }
    sessionIdRef.current = id;
  }, []);

  currentGameRef.current = currentGame;

  // WebSocket with reconnect when in a game
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;
    let websocket: WebSocket;

    function connect() {
      websocket = new WebSocket("ws://localhost:5555");
      websocket.onopen = () => {
        setStatusMessage(null);
        if (currentGameRef.current && sessionIdRef.current) {
          websocket.send(
            JSON.stringify({
              action: "rejoin",
              sessionId: sessionIdRef.current,
            })
          );
        }
      };
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message === "game is over") {
            if (data.state) {
              setCurrentGame((prev) =>
                prev ? { ...prev, gameState: data.state } : null
              );
              if (chessRef.current) chessRef.current.load(data.state);
              if (boardRef.current) boardRef.current.position(data.state.split(" ")[0]);
            }
            setGameOver(true);
            if (data.reason === "opponent_left") {
              setStatusMessage("Opponent left.");
              setTimeout(() => {
                setCurrentGame(null);
                setGameOver(false);
                setStatusMessage(null);
                setTimerState(null);
              }, 2000);
            } else if (data.reason === "resign") {
              setStatusMessage("Game over (resignation).");
            } else if (data.reason === "timeout") {
              const winner = data.winner;
              const loser = data.loser;
              const isWinner = currentGameRef.current?.color === winner;
              setStatusMessage(`Time out! ${isWinner ? 'You win!' : 'You lose!'}`);
            } else {
              setStatusMessage("Game over.");
            }
            // Clear timer on game over
            setTimerState(null);
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            return;
          }
          if (data.type === "timerUpdate") {
            const serverTimerState = data.timerState;
            const isWhite = currentGameRef.current?.color === "white";

            setTimerState({
              yourTime: isWhite ? serverTimerState.whiteTime : serverTimerState.blackTime,
              opponentTime: isWhite ? serverTimerState.blackTime : serverTimerState.whiteTime,
              activePlayer: serverTimerState.activePlayer,
              lastUpdate: Date.now()
            });
            return;
          }
          if (data.gameId && data.gameState) {
            setFindingGame(false);
            setGameOver(false);
            setStatusMessage(null);
            setCurrentGame(data);

            // Set timer state if provided
            if (data.timerState) {
              const isWhite = data.color === "white";
              setTimerState({
                yourTime: isWhite ? data.timerState.yourTime : data.timerState.opponentTime,
                opponentTime: isWhite ? data.timerState.opponentTime : data.timerState.yourTime,
                activePlayer: data.timerState.activePlayer,
                lastUpdate: Date.now()
              });
            } else {
              setTimerState(null);
            }

            // Clear any existing timer interval
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }

            return;
          }
          if (data.message === "no game to rejoin") {
            setStatusMessage("No game to rejoin.");
            setCurrentGame(null);
            currentGameRef.current = null;
            return;
          }
        } catch {
          const text = event.data.toString();
          if (text.includes("connected")) setStatusMessage(null);
          else if (text.includes("lobby") || text.includes("already in a game"))
            setFindingGame(false);
          setStatusMessage(text);
        }
      };
      websocket.onerror = () =>
        setStatusMessage("Connection error. Is the server running on port 5556?");
      websocket.onclose = () => {
        setWs(null);
        setStatusMessage("Disconnected. Reconnecting…");
        if (mounted && currentGameRef.current) {
          reconnectTimeout = setTimeout(() => connect(), 2000);
        }
      };
      setWs(websocket);
    }
    connect();
    return () => {
      mounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      websocket.close();
    };
  }, []);

  const onDragStart = (
    source: string,
    piece: string,
    _position: any,
    _orientation: string
  ) => {
    if (!chessRef.current || !currentGame || gameOver) return false;
    if (chessRef.current.game_over()) return false;
    const turn = chessRef.current.turn();
    const playerColor = currentGame.color;
    if (
      (turn === "w" && playerColor !== "white") ||
      (turn === "b" && playerColor !== "black")
    )
      return false;
    const pieceColor = piece[0];
    const allowedColor = playerColor === "white" ? "w" : "b";
    if (pieceColor !== allowedColor) return false;
    return true;
  };

  const onDrop = (source: string, target: string) => {
    if (!chessRef.current) return "snapback";
    const move = chessRef.current.move({
      from: source,
      to: target,
      promotion: "q",
    });
    if (move === null) return "snapback";
    if (boardRef.current) boardRef.current.position(chessRef.current.fen());
    if (ws && currentGame) {
      ws.send(
        JSON.stringify({
          username,
          action: "makeMove",
          move: move.san,
          gameObj: {
            gameId: currentGame.gameId,
            color: currentGame.color,
            opponent: currentGame.opponent,
            gameState: chessRef.current.fen(),
          }
        })
      );
    }
    return undefined;
  };

  useEffect(() => {
    if (!currentGame || !scriptsReady) return;
    const timer = setTimeout(() => {
      if (
        typeof window.Chessboard === "undefined" ||
        typeof window.Chess === "undefined" ||
        !containerRef.current
      )
        return;
      chessRef.current = new window.Chess(currentGame.gameState);
      if (boardRef.current) {
        try {
          boardRef.current.destroy();
        } catch {}
      }
      try {
        boardRef.current = window.Chessboard("myBoard", {
          position: currentGame.gameState.split(" ")[0],
          orientation: currentGame.color === "white" ? "white" : "black",
          draggable: true,
          dropOffBoard: "snapback",
          pieceTheme:
            "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
          onDragStart,
          onDrop,
        });
      } catch {}
    }, 100);
    return () => clearTimeout(timer);
  }, [currentGame, scriptsReady]);

  // Sync board when server sends updated FEN (opponent move)
  useEffect(() => {
    if (!currentGame || !chessRef.current || !boardRef.current) return;
    chessRef.current.load(currentGame.gameState);
    boardRef.current.position(currentGame.gameState.split(" ")[0]);
  }, [currentGame?.gameState]);

  // Timer while finding opponent
  useEffect(() => {
    if (!findingGame) {
      setWaitSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setWaitSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [findingGame]);

  // Client-side timer countdown
  useEffect(() => {
    if (!timerState || !timerState.activePlayer) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev) return null;
        const now = Date.now();
        const elapsed = now - prev.lastUpdate;

        const newState = { ...prev, lastUpdate: now };
        if (prev.activePlayer === currentGame?.color) {
          newState.yourTime = Math.max(0, prev.yourTime - elapsed);
        } else {
          newState.opponentTime = Math.max(0, prev.opponentTime - elapsed);
        }

        return newState;
      });
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerState?.activePlayer, currentGame?.color]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const TimerDisplay: React.FC<{
    time: number;
    label: string;
    isActive: boolean;
    color: "white" | "black";
  }> = ({ time, label, isActive, color }) => {
    const formattedTime = formatTime(time);
    const isLowTime = time < 30000; // Less than 30 seconds

    return (
      <div className={`timer-display ${isActive ? 'active' : ''} ${color} ${isLowTime ? 'low-time' : ''}`}>
        <div className="timer-label">{label}</div>
        <div className={`timer-value ${isLowTime ? 'low-time' : ''}`}>{formattedTime}</div>
      </div>
    );
  };

  const enterNewGame = () => {
    if (!username.trim()) {
      setStatusMessage("Enter a username to find a game.");
      return;
    }
    setStatusMessage(null);
    setFindingGame(true);
    if (ws)
      ws.send(
        JSON.stringify({
          username: username.trim(),
          action: "createGame",
          timeControl: timeControl,
          sessionId: sessionIdRef.current || undefined,
        })
      );
  };

  const cancelSearch = () => {
    if (ws) ws.send(JSON.stringify({ action: "cancelSearch" }));
    setFindingGame(false);
    setStatusMessage(null);
  };

  const resign = () => {
    if (ws && currentGame) {
      ws.send(
        JSON.stringify({
          action: "resign",
          gameObj: {
            gameId: currentGame.gameId,
            color: currentGame.color,
            opponent: currentGame.opponent,
            gameState: currentGame.gameState,
          },
        })
      );
      setGameOver(true);
      setStatusMessage("Game over (resignation).");
    }
  };

  const leaveGame = () => {
    if (ws && currentGame) {
      ws.send(JSON.stringify({ action: "leaveGame", gameId: currentGame.gameId }));
      setCurrentGame(null);
      setGameOver(false);
      setStatusMessage("You left the game.");
    }
  };

  // Derive turn from server FEN (currentGame.gameState) so it updates when server sends new state.
  // FEN format: "pieces position active_color ..." — active color is 2nd field, "w" or "b".
  const activeColor = currentGame?.gameState?.split(" ")[1];
  const myTurn =
    currentGame &&
    activeColor &&
    !gameOver &&
    ((activeColor === "w" && currentGame.color === "white") ||
      (activeColor === "b" && currentGame.color === "black"));

  return (
    <>
      <Script
        src="https://code.jquery.com/jquery-3.6.0.min.js"
        strategy="afterInteractive"
        onLoad={() => setJqueryLoaded(true)}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"
        strategy="afterInteractive"
        onLoad={() => setChessJsLoaded(true)}
      />
      <Script
        src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"
        strategy="afterInteractive"
        onLoad={() => setChessboardLoaded(true)}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
          <h1
            className="text-2xl font-semibold tracking-tight text-[var(--cream)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Chess
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-[var(--success)]" : "bg-[var(--error)]"
              }`}
            />
            <span className="text-sm text-[var(--cream-muted)]">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </header>

        {!currentGame ? (
          <section className="w-full max-w-md animate-fade-up text-center">
            <p
              className="text-[var(--cream-muted)] text-lg mb-8"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Play a rapid game. You’ll be matched with another player.
            </p>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={timeControl}
                  onChange={(e) => setTimeControl(e.target.value)}
                  className="w-full rounded-[var(--radius)] border border-[var(--felt-light)] bg-[var(--felt)] px-4 py-3 text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                  disabled={!connected || findingGame}
                >
                  <option value="rapid">Rapid (10|5)</option>
                  <option value="blitz">Blitz (3|2)</option>
                  <option value="bullet">Bullet (1|0)</option>
                  <option value="5|3">5|3 (5 min + 3 sec)</option>
                  <option value="15|10">15|10 (15 min + 10 sec)</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enterNewGame()}
                className="w-full rounded-[var(--radius)] border border-[var(--felt-light)] bg-[var(--felt)] px-4 py-3 text-[var(--cream)] placeholder-[var(--cream-muted)] focus:border-[var(--gold)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                disabled={!connected || findingGame}
              />
              <button
                onClick={enterNewGame}
                disabled={!connected || findingGame || !scriptsReady}
                className="w-full rounded-[var(--radius)] bg-[var(--gold)] px-4 py-3 font-medium text-[var(--ink)] transition hover:bg-[var(--gold-dim)] hover:text-[var(--cream)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {findingGame ? "Finding opponent…" : "Find a game"}
              </button>
              {findingGame && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-[var(--cream-muted)]">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--cream-muted)] border-t-[var(--gold)]" aria-hidden />
                    <span>Waiting {waitSeconds}s</span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelSearch}
                    className="text-sm text-[var(--cream-muted)] underline hover:text-[var(--cream)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {statusMessage && (
              <p
                className="mt-4 text-sm text-[var(--cream-muted)] animate-fade-up"
                role="status"
              >
                {statusMessage}
              </p>
            )}
          </section>
        ) : (
          <section className="flex flex-col items-center gap-6 animate-fade-up">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--cream-muted)] animate-fade-up animate-fade-up-delay-1">
              <span>
                You play{" "}
                <strong className="text-[var(--cream)]">
                  {currentGame.color}
                </strong>
              </span>
              <span>·</span>
              <span>
                Opponent:{" "}
                <strong className="text-[var(--cream)]">
                  {currentGame.opponent}
                </strong>
              </span>
            </div>

            {timerState && currentGame && (
              <div className="timer-container flex items-center justify-center gap-6 animate-fade-up animate-fade-up-delay-1">
                <TimerDisplay
                  time={timerState.yourTime}
                  label="You"
                  isActive={timerState.activePlayer === currentGame.color}
                  color={currentGame.color as "white" | "black"}
                />
                <TimerDisplay
                  time={timerState.opponentTime}
                  label="Opponent"
                  isActive={timerState.activePlayer !== currentGame.color}
                  color={currentGame.color === "white" ? "black" : "white"}
                />
              </div>
            )}

            <div
              className={`board-frame animate-fade-up animate-fade-up-delay-2 ${myTurn ? "turn-indicator-active" : ""}`}
              ref={containerRef}
            >
              <div
                id="myBoard"
                className="min-w-[320px] w-[min(80vw,400px)] aspect-square"
              />
            </div>

            <div
              className="text-center animate-fade-up animate-fade-up-delay-3"
              role="status"
            >
              {gameOver ? (
                <p className="text-[var(--gold)] font-medium">Game over.</p>
              ) : myTurn ? (
                <p className="text-[var(--gold)]">Your turn</p>
              ) : (
                <p className="text-[var(--cream-muted)]">Opponent’s turn</p>
              )}
            </div>

            {!gameOver && currentGame && (
              <div className="flex items-center gap-3 animate-fade-up animate-fade-up-delay-3">
                <button
                  type="button"
                  onClick={resign}
                  className="rounded-[var(--radius)] border border-[var(--felt-light)] bg-[var(--felt)] px-3 py-2 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]"
                >
                  Resign
                </button>
                <button
                  type="button"
                  onClick={leaveGame}
                  className="rounded-[var(--radius)] border border-[var(--felt-light)] bg-[var(--felt)] px-3 py-2 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]"
                >
                  Leave game
                </button>
              </div>
            )}

            {statusMessage && (
              <p className="text-sm text-[var(--cream-muted)]" role="alert">
                {statusMessage}
              </p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
