/**
 * PauseMenu — Pause menu overlay.
 *
 * Displayed when the game is paused. Provides options to resume,
 * open garage, settings, or quit to main menu.
 */

import { useGameStore } from '@/stores/gameStore';

/* ─────────────────────────────────────────────
 * PauseMenu Component
 * ───────────────────────────────────────────── */

export function PauseMenu({ onResume, onGarage, onMainMenu }: {
  onResume: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}) {
  const gameMode = useGameStore((state) => state.gameMode);

  if (gameMode !== 'pause') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-gray-900/95 p-8 backdrop-blur-lg">
        {/* Title */}
        <h2 className="mb-8 text-center text-3xl font-bold text-white">⏸️ Paused</h2>

        {/* Menu buttons */}
        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-lg font-bold text-white hover:from-green-500 hover:to-emerald-500"
          >
            ▶️ Resume Game
          </button>

          <button
            onClick={onGarage}
            className="w-full rounded-lg bg-gray-800 px-6 py-3 text-lg font-bold text-gray-300 hover:bg-gray-700"
          >
            🔧 Garage
          </button>

          <button
            onClick={() => {}}
            className="w-full rounded-lg bg-gray-800 px-6 py-3 text-lg font-bold text-gray-300 hover:bg-gray-700"
          >
            ⚙️ Settings
          </button>

          <button
            onClick={onMainMenu}
            className="w-full rounded-lg bg-red-900/50 px-6 py-3 text-lg font-bold text-red-300 hover:bg-red-900"
          >
            🏠 Main Menu
          </button>
        </div>

        {/* Controls info */}
        <div className="mt-8 rounded-lg bg-gray-800 p-4">
          <h3 className="mb-2 text-sm font-bold text-gray-400">Controls</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
            <span>WASD / Arrows</span>
            <span className="text-right">Drive</span>

            <span>E</span>
            <span className="text-right">Interact</span>

            <span>Q</span>
            <span className="text-right">Quest Log</span>

            <span>Esc</span>
            <span className="text-right">Pause</span>

            <span>Space</span>
            <span className="text-right">Brake</span>
          </div>
        </div>
      </div>
    </div>
  );
}
