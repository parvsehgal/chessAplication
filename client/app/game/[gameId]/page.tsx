'use client'
import { useParams } from 'next/navigation';

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-black">
          {/* Header */}
          <div className="bg-black text-white text-center py-8 px-8">
            <h1 className="text-5xl font-bold mb-2">♕</h1>
            <h2 className="text-3xl font-bold mb-2">Chess Arena</h2>
            <p className="text-white text-lg font-bold tracking-wide">GAME IN PROGRESS</p>
          </div>

          {/* Game Content */}
          <div className="bg-white p-8 text-center">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-black">Game ID:</h3>
              <p className="text-4xl font-mono font-bold text-black bg-zinc-100 py-4 px-6 rounded-lg border-2 border-black">
                {gameId}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-black text-center py-4 px-8 border-t-4 border-white">
            <p className="text-sm text-zinc-400">
              Game board will appear here 🎯
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
