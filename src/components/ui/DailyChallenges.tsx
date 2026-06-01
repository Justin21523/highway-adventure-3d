/**
 * DailyChallenges — small bottom-left panel showing today's 3 seeded goals and
 * their progress. Auto-rewards are handled in dailyStore; this is display only.
 */

import { useEffect } from 'react';
import { useDailyStore } from '../../stores/dailyStore';

export function DailyChallenges() {
  const challenges = useDailyStore((s) => s.challenges);
  const ensureToday = useDailyStore((s) => s.ensureToday);

  // Roll over at midnight if the tab stays open.
  useEffect(() => {
    const id = setInterval(() => ensureToday(), 60000);
    return () => clearInterval(id);
  }, [ensureToday]);

  return (
    <div className="pointer-events-none fixed bottom-28 left-4 z-30 w-56 select-none">
      <div className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-2.5 backdrop-blur">
        <div className="mb-1.5 text-xs font-bold tracking-wide text-amber-300">每日挑戰</div>
        <div className="space-y-1.5">
          {challenges.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between text-[11px]">
                <span className={c.done ? 'text-green-400 line-through' : 'text-slate-200'}>{c.label}</span>
                <span className="text-slate-400">{Math.min(c.progress, c.target)}/{c.target}</span>
              </div>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-slate-800">
                <div
                  className={`h-full rounded ${c.done ? 'bg-green-500' : 'bg-amber-400'}`}
                  style={{ width: `${(Math.min(c.progress, c.target) / c.target) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
