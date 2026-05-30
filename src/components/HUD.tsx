/**
 * HUD — Heads-Up Display for the game.
 *
 * Displays speed, fuel, health, coins, XP, level, and minimap.
 * Uses Tailwind CSS for styling and Zustand stores for reactive data.
 */

import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { useQuestStore } from '@/stores/questStore';
import { formatSpeed, formatDistance, formatCoins, formatXP, formatLevel } from '@/utils/format';

/* ─────────────────────────────────────────────
 * HUD Component
 * ───────────────────────────────────────────── */

export function HUD() {
  const vehicle = useGameStore((state) => state.vehicle);
  const profile = useGameStore((state) => state.profile);
  const currentChunkId = useWorldStore((state) => state.currentChunkId);
  const activeQuests = useQuestStore((state) => state.activeQuests);

  const speedPercent = (vehicle.speed / vehicle.maxSpeed) * 100;
  const xpPercent = (profile.xp / profile.xpToNext) * 100;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        {/* Player info */}
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur-sm">
            <div className="text-sm font-bold">{formatLevel(profile.level)}</div>
            <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-300">{formatXP(profile.xp)}</div>
          </div>

          <div className="rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur-sm">
            <div className="text-lg font-bold">{formatCoins(profile.coins)}</div>
          </div>
        </div>

        {/* Active quest indicator */}
        {activeQuests.length > 0 && (
          <div className="rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur-sm">
            <div className="text-xs text-yellow-400">Active Quest</div>
            <div className="text-sm font-bold">{activeQuests[0].title}</div>
          </div>
        )}

        {/* Chunk info */}
        <div className="rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur-sm">
          <div className="text-xs text-gray-400">Chunk</div>
          <div className="text-sm font-mono">{currentChunkId}</div>
        </div>
      </div>

      {/* Bottom bar - Vehicle stats */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
        {/* Speed and stats */}
        <div className="flex items-end gap-4">
          {/* Speedometer */}
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white/30 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-white">{Math.round(vehicle.speed)}</div>
              <div className="text-xs text-gray-300">km/h</div>
            </div>
            {/* Speed arc */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#374151"
                strokeWidth="6"
                strokeDasharray="212"
                strokeDashoffset="53"
                strokeLinecap="round"
                transform="rotate(135 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={vehicle.isBoosting ? '#3b82f6' : '#ef4444'}
                strokeWidth="6"
                strokeDasharray="212"
                strokeDashoffset={212 - (212 * speedPercent) / 100}
                strokeLinecap="round"
                transform="rotate(135 50 50)"
                className="transition-all duration-300"
              />
            </svg>
          </div>

          {/* Fuel and health bars */}
          <div className="flex flex-col gap-2">
            <div className="rounded-lg bg-black/60 px-3 py-2 backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-300">
                <span>⛽ Fuel</span>
                <span>{Math.round(vehicle.fuel)}%</span>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all ${
                    vehicle.fuel > 50 ? 'bg-green-500' : vehicle.fuel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${vehicle.fuel}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-black/60 px-3 py-2 backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-300">
                <span>❤️ Health</span>
                <span>{Math.round(vehicle.health)}%</span>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all ${
                    vehicle.health > 60 ? 'bg-green-500' : vehicle.health > 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${vehicle.health}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Boost indicator */}
        {vehicle.isBoosting && (
          <div className="rounded-lg bg-blue-500/80 px-4 py-2 text-white backdrop-blur-sm animate-pulse">
            <div className="text-lg font-bold">⚡ BOOST!</div>
            <div className="text-xs">{Math.round(vehicle.boostTimer)}s</div>
          </div>
        )}

        {/* Drift indicator */}
        {vehicle.isDrifting && (
          <div className="rounded-lg bg-orange-500/80 px-4 py-2 text-white backdrop-blur-sm animate-pulse">
            <div className="text-lg font-bold">🔥 DRIFT!</div>
          </div>
        )}
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────
 * Minimap Component
 * ───────────────────────────────────────────── */

function Minimap() {
  const playerPosition = useWorldStore((state) => state.playerPosition);
  const activeChunks = useWorldStore((state) => state.activeChunks);

  return (
    <div className="absolute bottom-4 right-4 h-40 w-40 overflow-hidden rounded-full border-2 border-white/30 bg-black/60 backdrop-blur-sm">
      <div className="relative h-full w-full">
        {/* Player dot */}
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />

        {/* Chunk indicators */}
        {Array.from(activeChunks.entries()).slice(0, 20).map(([chunkId, chunkData]) => {
          const dx = (chunkData.gridX - Math.floor(playerPosition.x / 100)) * 8;
          const dz = (chunkData.gridZ - Math.floor(playerPosition.z / 100)) * 8;

          if (Math.abs(dx) > 60 || Math.abs(dz) > 60) return null;

          return (
            <div
              key={chunkId}
              className="absolute h-2 w-2 rounded-full"
              style={{
                left: `calc(50% + ${dx}px)`,
                top: `calc(50% + ${dz}px)`,
                backgroundColor: chunkData.zone === 'highway' ? '#6b7280' : '#3b82f6',
              }}
            />
          );
        })}

        {/* Direction indicator */}
        <div className="absolute left-1/2 top-1 h-3 w-1 -translate-x-1/2 bg-white" />
      </div>
    </div>
  );
}
