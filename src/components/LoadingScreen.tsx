/**
 * LoadingScreen — Loading screen with progress bar.
 *
 * Displays while the game is initializing and loading assets.
 */

import { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────
 * LoadingScreen Component
 * ───────────────────────────────────────────── */

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    // Simulate loading progress
    const stages = [
      { progress: 10, status: 'Loading textures...' },
      { progress: 25, status: 'Generating world...' },
      { progress: 40, status: 'Spawning traffic...' },
      { progress: 55, status: 'Loading shops...' },
      { progress: 70, status: 'Preparing quests...' },
      { progress: 85, status: 'Setting up physics...' },
      { progress: 95, status: 'Almost ready...' },
      { progress: 100, status: 'Ready!' },
    ];

    let currentStage = 0;

    const interval = setInterval(() => {
      if (currentStage >= stages.length) {
        clearInterval(interval);
        setTimeout(onComplete, 500);
        return;
      }

      const stage = stages[currentStage];
      setProgress(stage.progress);
      setStatus(stage.status);
      currentStage++;
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">
          🏎️ Highway Adventure 3D
        </h1>
        <p className="mt-4 text-xl text-gray-400">Procedural Driving Experience</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-400">
          <span>{status}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="mt-12 max-w-md text-center">
        <p className="text-sm text-gray-500">
          💡 Tip: Use arrow keys or WASD to drive. Press Q to open quest log.
        </p>
      </div>
    </div>
  );
}
