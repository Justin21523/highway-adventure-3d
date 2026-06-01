/**
 * ComboIndicator — big "xN COMBO" flourish for the near-miss chain (Phase A),
 * with a draining timer. Hides itself once the combo expires.
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function ComboIndicator() {
  const combo = useGameStore((s) => s.combo);
  const expiresAt = useGameStore((s) => s.comboExpiresAt);
  const [, force] = useState(0);

  // Re-evaluate a few times a second so it fades out when the combo expires.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 150);
    return () => clearInterval(id);
  }, []);

  if (combo < 2 || Date.now() > expiresAt) return null;
  const remaining = Math.max(0, (expiresAt - Date.now()) / 3000);

  return (
    <div className="pointer-events-none fixed left-1/2 top-44 z-40 -translate-x-1/2 select-none text-center">
      <div className="text-3xl font-black tracking-wide text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
        ×{combo} COMBO
      </div>
      <div className="mx-auto mt-1 h-1 w-24 overflow-hidden rounded bg-amber-900/50">
        <div className="h-full bg-amber-400" style={{ width: `${remaining * 100}%` }} />
      </div>
    </div>
  );
}
