import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { VehiclePhysics } from '@/systems/VehiclePhysics';

/** Respawn at the last checkpoint with full health, a topped-up tank, and a brief
 *  invulnerability window — never back to the world origin. */
function respawnAtCheckpoint() {
  const gs = useGameStore.getState();
  const cp = gs.lastCheckpoint ?? { x: 4.35, y: 0.5, z: 0 };
  VehiclePhysics.getInstance().reset(); // resets heading/drift + restores health/fuel
  useWorldStore.getState().setPlayerPosition(cp);
  useWorldStore.getState().setElevation(0, false);
  useGameStore.setState((s) => ({
    gameMode: 'playing',
    playerPosition: cp,
    vehicle: { ...s.vehicle, position: cp, speed: 0, steerAngle: 0, isDrifting: false, isBoosting: false, boostTimer: 0 },
    invulnerableUntil: Date.now() + 2000,
  }));
}

export function CrashOverlay() {
  const vehicle = useGameStore((state) => state.vehicle);
  const gameMode = useGameStore((state) => state.gameMode);

  if (vehicle.health > 0 && gameMode !== 'crashed') return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-red-500/50 bg-slate-950/95 p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-2xl font-bold text-red-300">Vehicle Disabled</h2>
        <p className="mb-6 text-sm text-slate-300">
          Your car took too much damage. Respawn at the last checkpoint to continue.
        </p>
        <button
          onClick={respawnAtCheckpoint}
          className="w-full rounded bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-500"
        >
          Respawn
        </button>
      </div>
    </div>
  );
}
