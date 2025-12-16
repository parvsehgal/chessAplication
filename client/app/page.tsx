'use client'
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [gameData, setGameData] = useState({
    username: "",
    action: "createGame",
    timeControl: "rapid"
  });
  
  const wsRef = useRef(null);
  const router = useRouter();

  const fromServer = (data) => {
    console.log(`from gameServer: ${data}`);
    const response = JSON.parse(data);
    
    if (response.gameId) {
      // Set a cookie with the entire game object
      const gameInfo = {
        gameId: response.gameId,
        username: gameData.username,
        timeControl: gameData.timeControl,
        timestamp: new Date().toISOString()
      };
      
      // Store game info in cookie (expires in 24 hours)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `currentGame=${JSON.stringify(gameInfo)}; expires=${expires}; path=/`;
      
      // Redirect to game page with dynamic gameId
      router.push(`/game/${response.gameId}`);
    }
  };

  useEffect(() => {
    // Check if user already has an active game
    const cookies = document.cookie.split('; ');
    const gameCookie = cookies.find(c => c.startsWith('currentGame='));
    
    if (gameCookie) {
      try {
        const gameInfo = JSON.parse(gameCookie.split('=')[1]);
        // User already in a game, redirect them
        console.log("User already in a game, redirecting...");
        router.push(`/game/${gameInfo.gameId}`);
        return;
      } catch (e) {
        // Invalid cookie, clear it
        document.cookie = 'currentGame=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    }

    // Connect to WebSocket on page load
    const ws = new WebSocket("ws://localhost:8080");
    
    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };
    
    ws.onmessage = (event) => {
      fromServer(event.data);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };
    
    wsRef.current = ws;
    
    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if user already has an active game
    const cookies = document.cookie.split('; ');
    const gameCookie = cookies.find(c => c.startsWith('currentGame='));
    
    if (gameCookie) {
      alert("You already have an active game! Please finish it first.");
      return;
    }
    
    if (gameData.username.trim() && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Send game data to server
      wsRef.current.send(JSON.stringify(gameData));
      console.log("Starting game with:", gameData);
    } else if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      alert("Not connected to server. Please refresh the page.");
    }
  };

  const handleUsernameChange = (e) => {
    setGameData({
      ...gameData,
      username: e.target.value
    });
  };

  const handleTimeControlChange = (control) => {
    setGameData({
      ...gameData,
      timeControl: control
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-black">
          {/* Header - Black section */}
          <div className="bg-black text-white text-center py-8 px-8">
            <h1 className="text-5xl font-bold mb-2">♕</h1>
            <h2 className="text-3xl font-bold mb-2">Chess Arena</h2>
            <p className="text-white text-lg font-bold tracking-wide">ENTER THE BATTLEFIELD</p>
          </div>

          {/* Form Container - White section */}
          <div className="bg-white p-8 space-y-6">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Username
              </label>
              <input
                type="text"
                value={gameData.username}
                onChange={handleUsernameChange}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-white border-2 border-black rounded-lg text-black placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-300 transition"
              />
            </div>

            {/* Time Control Selection */}
            <div>
              <label className="block text-sm font-bold text-black mb-3">
                Time Control
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['bullet', 'blitz', 'rapid'].map((control) => (
                  <button
                    key={control}
                    type="button"
                    onClick={() => handleTimeControlChange(control)}
                    className={`py-3 px-4 rounded-lg font-bold transition-all border-2 ${
                      gameData.timeControl === control
                        ? 'bg-black text-white border-black shadow-lg scale-105'
                        : 'bg-white text-black border-black hover:bg-zinc-100'
                    }`}
                  >
                    {control.charAt(0).toUpperCase() + control.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-zinc-600 font-medium">
                {gameData.timeControl === 'bullet' && '⚡ 1-2 minutes'}
                {gameData.timeControl === 'blitz' && '⏱️ 3-5 minutes'}
                {gameData.timeControl === 'rapid' && '🕐 10+ minutes'}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full bg-black text-white font-bold py-4 px-6 rounded-lg hover:bg-zinc-800 transform hover:scale-105 transition-all duration-200 shadow-lg border-2 border-black"
            >
              Start Game
            </button>
          </div>

          {/* Footer - Black section */}
          <div className="bg-black text-center py-4 px-8 border-t-4 border-white">
            <p className="text-sm text-zinc-400">
              Ready to checkmate? Let's play! 🎯
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
