/**
 * ActivityHUD — overlay for the active timed activity (race / delivery / taxi):
 * countdown bar, checkpoint progress, and a "Press R to Race" hint when idling in
 * the highway corridor. Reads the activity engine reactively.
 */

import { useEffect, useState } from 'react';
import { useActivityStore } from '../../stores/activityStore';
import { useGameStore } from '../../stores/gameStore';
import { zoneAtWorld } from '../../systems/ZoneManager';

export function ActivityHUD() {
  const active = useActivityStore((s) => s.active);
  const [nearRaceZone, setNearRaceZone] = useState(false);

  // Poll the zone at low frequency for the idle hint (avoids per-frame re-render).
  useEffect(() => {
    const id = setInterval(() => {
      if (useActivityStore.getState().active) { setNearRaceZone(false); return; }
      const gm = useGameStore.getState().gameMode;
      if (gm !== 'playing' && gm !== 'exploration') { setNearRaceZone(false); return; }
      const p = useGameStore.getState().playerPosition;
      setNearRaceZone(zoneAtWorld(p.x, p.z) === 'highway');
    }, 500);
    return () => clearInterval(id);
  }, []);

  if (!active) {
    if (!nearRaceZone) return null;
    return (
      <div className="pointer-events-none fixed left-1/2 top-28 z-40 -translate-x-1/2 select-none">
        <div className="rounded-full border border-cyan-500/50 bg-slate-950/80 px-4 py-1.5 text-sm font-bold text-cyan-300 shadow-lg backdrop-blur">
          按 <span className="text-white">R</span> 開始高速公路競速
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, active.timeLimit - active.elapsed);
  const pct = Math.max(0, Math.min(1, remaining / active.timeLimit));
  const low = remaining < 8;

  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-40 w-72 -translate-x-1/2 select-none">
      <div className="rounded-xl border border-cyan-500/40 bg-slate-950/85 p-3 shadow-2xl backdrop-blur">
        <div className="mb-1 flex items-center justify-between text-sm font-bold">
          <span className="text-cyan-300">{active.title}</span>
          <span className="text-slate-300">
            {active.current}/{active.checkpoints.length} ✓
          </span>
        </div>
        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
          <span>剩餘時間</span>
          <span className={low ? 'text-red-400 font-bold' : 'text-slate-200'}>{remaining.toFixed(1)}s</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
          <div
            className={`h-full rounded transition-[width] duration-100 ${low ? 'bg-red-500' : 'bg-cyan-400'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
