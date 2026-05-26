/**
 * StartScreen — Main menu / start screen.
 *
 * Displays the game title, start button, and settings options.
 */

import { useState } from 'react';

/* ─────────────────────────────────────────────
 * StartScreen Component
 * ───────────────────────────────────────────── */

export function StartScreen({ onStart }: { onStart: () => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      {/* Background animation placeholder */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Title */}
        <h1 className="mb-4 text-7xl font-bold text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text">
          🏎️ Highway Adventure
        </h1>
        <p className="mb-12 text-2xl text-gray-400">3D Procedural Driving Experience</p>

        {/* Menu buttons */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onStart}
            className="w-64 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-xl font-bold text-white shadow-lg hover:from-blue-500 hover:to-purple-500"
          >
            🚀 Start Game
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-64 rounded-lg bg-gray-800 px-8 py-3 text-lg font-bold text-gray-300 hover:bg-gray-700"
          >
            ⚙️ Settings
          </button>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="w-64 rounded-lg bg-gray-800 px-8 py-3 text-lg font-bold text-gray-300 hover:bg-gray-700"
          >
            📖 How to Play
          </button>
        </div>

        {/* Version */}
        <div className="mt-12 text-sm text-gray-600">
          Version 1.0.0 — Built with React Three Fiber
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* How to Play modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * SettingsModal Component
 * ───────────────────────────────────────────── */

function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-gray-900/95 p-6 backdrop-blur-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Quality settings */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-300">Quality</label>
          <select className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high" selected>High</option>
            <option value="ultra">Ultra</option>
          </select>
        </div>

        {/* Volume */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-300">Master Volume</label>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="75"
            className="w-full"
          />
        </div>

        {/* Music Volume */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-300">Music Volume</label>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="50"
            className="w-full"
          />
        </div>

        {/* SFX Volume */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-300">SFX Volume</label>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="80"
            className="w-full"
          />
        </div>

        {/* Save button */}
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-bold text-white hover:bg-blue-500"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * HowToPlayModal Component
 * ───────────────────────────────────────────── */

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-white/20 bg-gray-900/95 p-6 backdrop-blur-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">📖 How to Play</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="mb-2 text-lg font-bold text-white">🚗 Driving Controls</h3>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li><kbd className="rounded bg-gray-800 px-2 py-1 text-white">W</kbd> / <kbd className="rounded bg-gray-800 px-2 py-1 text-white">↑</kbd> — Accelerate</li>
              <li><kbd className="rounded bg-gray-800 px-2 py-1 text-white">S</kbd> / <kbd className="rounded bg-gray-800 px-2 py-1 text-white">↓</kbd> — Brake / Reverse</li>
              <li><kbd className="rounded bg-gray-800 px-2 py-1 text-white">A</kbd> / <kbd className="rounded bg-gray-800 px-2 py-1 text-white">←</kbd> — Steer Left</li>
              <li><kbd className="rounded bg-gray-800 px-2 py-1 text-white">D</kbd> / <kbd className="rounded bg-gray-800 px-2 py-1 text-white">→</kbd> — Steer Right</li>
              <li><kbd className="rounded bg-gray-800 px-2 py-1 text-white">Space</kbd> — Handbrake (for drifting!)</li>
              <li><kbd className="rounded bg-gray-800 px-2 py-1 text-white">Shift</kbd> — Boost (when available)</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-bold text-white">🎮 Game Features</h3>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li><strong className="text-white">Quests</strong> — Press <kbd className="rounded bg-gray-800 px-2 py-1 text-white">Q</kbd> to open quest log</li>
              <li><strong className="text-white">Shop</strong> — Press <kbd className="rounded bg-gray-800 px-2 py-1 text-white">E</kbd> when near a shop</li>
              <li><strong className="text-white">Pause</strong> — Press <kbd className="rounded bg-gray-800 px-2 py-1 text-white">Esc</kbd> to pause</li>
              <li><strong className="text-white">Coins</strong> — Collect coins on the road for points</li>
              <li><strong className="text-white">Drifting</strong> — Use handbrake while turning to drift for bonus XP</li>
              <li><strong className="text-white">Traffic</strong> — Avoid or pass NPC traffic cars</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-bold text-white">💡 Tips</h3>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>Stay in the fast lanes to complete quests faster</li>
              <li>Visit shops to upgrade your vehicle</li>
              <li>Keep an eye on your fuel gauge — refuel at gas stations</li>
              <li>Drifting around corners earns extra XP and coins</li>
            </ul>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-bold text-white hover:bg-blue-500"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
