import { useGameStore } from '@/stores/gameStore';

export function CrashOverlay() {
  const vehicle = useGameStore((state) => state.vehicle);
  const gameMode = useGameStore((state) => state.gameMode);
  const resetVehicle = useGameStore((state) => state.resetVehicle);
  const setGameMode = useGameStore((state) => state.setGameMode);

  if (vehicle.health > 0 && gameMode !== 'crashed') return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-red-500/50 bg-slate-950/95 p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-2xl font-bold text-red-300">Vehicle Disabled</h2>
        <p className="mb-6 text-sm text-slate-300">
          Your car took too much damage. Respawn at the last checkpoint to continue.
        </p>
        <button
          onClick={() => {
            resetVehicle();
            setGameMode('playing');
          }}
          className="w-full rounded bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-500"
        >
          Respawn
        </button>
      </div>
    </div>
  );
}
