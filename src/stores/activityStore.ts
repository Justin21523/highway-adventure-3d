/**
 * activityStore — the timed-activity engine that turns each district into gameplay.
 *
 * One generic checkpoint+timer engine drives all activity types:
 *   - race / timeTrial : a chain of checkpoints down the highway corridor.
 *   - delivery / taxi  : a single destination (shop / drop-off) within a time limit.
 *
 * It is intentionally separate from QuestManager: quest objectives are single-shot
 * proximity/count checks, whereas activities need an ordered checkpoint sequence,
 * a countdown, and pass/fail — all of which live here. Rewards are paid out through
 * the existing gameStore actions, and the HUD/world beacon read this store reactively.
 *
 * NEVER changes gameMode or snaps the vehicle — activities run while you drive freely,
 * so they can never freeze the car (unlike the old garage/shop auto-traps).
 */

import { create } from 'zustand';
import { useGameStore } from './gameStore';
import { useDailyStore } from './dailyStore';
import { NotificationManager } from '../managers/NotificationManager';

export type ActivityType = 'race' | 'timeTrial' | 'delivery' | 'taxi';

export interface ActivityCheckpoint {
  x: number;
  z: number;
}

export interface ActiveActivity {
  id: string;
  type: ActivityType;
  title: string;
  checkpoints: ActivityCheckpoint[];
  current: number; // index of the next checkpoint to reach
  timeLimit: number; // seconds
  elapsed: number;
  rewardCoins: number;
  rewardXp: number;
  reputation: number; // applied in Phase C once profile.reputation exists
}

interface ActivityState {
  active: ActiveActivity | null;
  /** Result banner shown briefly after finishing (success/fail). */
  lastResult: { type: ActivityType; success: boolean; title: string; at: number } | null;

  startActivity: (a: Omit<ActiveActivity, 'current' | 'elapsed'>) => void;
  abort: () => void;
  /** Advance the active activity. Call every frame with the player's world XZ. */
  tick: (delta: number, px: number, pz: number) => void;
}

const CHECKPOINT_RADIUS = 13; // meters — generous so fast passes still register

export const useActivityStore = create<ActivityState>()((set, get) => ({
  active: null,
  lastResult: null,

  startActivity: (a) => {
    // Only one activity at a time; ignore if one is already running.
    if (get().active) return;
    set({ active: { ...a, current: 0, elapsed: 0 } });
    NotificationManager.getInstance().notify({
      title: a.title,
      message: `Reach the markers before time runs out! (${a.timeLimit}s)`,
      priority: 'medium',
      duration: 2500,
      icon: 'quest',
    });
  },

  abort: () => set({ active: null }),

  tick: (delta, px, pz) => {
    const active = get().active;
    if (!active) return;

    const elapsed = active.elapsed + delta;

    // Time out → fail (recoverable: just clears, player keeps driving).
    if (elapsed > active.timeLimit) {
      NotificationManager.getInstance().notify({
        title: `${active.title} — Failed`,
        message: 'Out of time. Try again!',
        priority: 'medium',
        duration: 2500,
        icon: 'warning',
      });
      set({ active: null, lastResult: { type: active.type, success: false, title: active.title, at: Date.now() } });
      return;
    }

    // Reached the current checkpoint?
    const cp = active.checkpoints[active.current];
    let current = active.current;
    if (cp && Math.hypot(px - cp.x, pz - cp.z) <= CHECKPOINT_RADIUS) {
      current += 1;
    }

    // Completed all checkpoints → reward.
    if (current >= active.checkpoints.length) {
      const gs = useGameStore.getState();
      gs.addCoins(active.rewardCoins);
      gs.addXp(active.rewardXp);
      gs.addReputation(active.reputation);
      useDailyStore.getState().bump('activity');
      const timeBonus = Math.max(0, Math.round((active.timeLimit - elapsed) * 5));
      if (timeBonus > 0) gs.addCoins(timeBonus);
      NotificationManager.getInstance().notify({
        title: `${active.title} — Complete!`,
        message: `+${active.rewardCoins + timeBonus}🪙 +${active.rewardXp}XP`,
        priority: 'high',
        duration: 3500,
        icon: 'success',
      });
      set({ active: null, lastResult: { type: active.type, success: true, title: active.title, at: Date.now() } });
      return;
    }

    set({ active: { ...active, current, elapsed } });
  },
}));

/* ─────────────────────────────────────────────
 * Builders for the three activity flavors
 * ───────────────────────────────────────────── */

/** A highway sprint: N checkpoints straight down the corridor from the player. */
export function buildRace(px: number, pz: number, level: number): Omit<ActiveActivity, 'current' | 'elapsed'> {
  const legs = 4;
  const legLen = 220;
  const checkpoints: ActivityCheckpoint[] = [];
  for (let i = 1; i <= legs; i++) {
    checkpoints.push({ x: 0, z: pz + i * legLen });
  }
  return {
    id: `race_${Date.now()}`,
    type: 'race',
    title: 'Highway Sprint',
    checkpoints,
    timeLimit: 48 + legs * 2,
    rewardCoins: 400 + level * 40,
    rewardXp: 120 + level * 10,
    reputation: 10,
  };
}

/** A relaxed scenic loop through the countryside — more checkpoints, more time. */
export function buildTour(px: number, pz: number, level: number): Omit<ActiveActivity, 'current' | 'elapsed'> {
  const pts = 5;
  const radius = 260;
  const checkpoints: ActivityCheckpoint[] = [];
  for (let i = 1; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    checkpoints.push({ x: px + Math.cos(a) * radius, z: pz + Math.sin(a) * radius });
  }
  return {
    id: `tour_${Date.now()}`,
    type: 'timeTrial',
    title: 'Scenic Tour',
    checkpoints,
    timeLimit: 150,
    rewardCoins: 300 + level * 30,
    rewardXp: 140 + level * 12,
    reputation: 14,
  };
}

/** A single timed destination (used by delivery & taxi). */
export function buildDelivery(
  type: 'delivery' | 'taxi',
  dest: ActivityCheckpoint,
  px: number,
  pz: number,
  level: number,
): Omit<ActiveActivity, 'current' | 'elapsed'> {
  const dist = Math.hypot(dest.x - px, dest.z - pz);
  return {
    id: `${type}_${Date.now()}`,
    type,
    title: type === 'taxi' ? 'Taxi Fare' : 'Express Delivery',
    checkpoints: [dest],
    timeLimit: Math.max(30, Math.round(dist / 22) + 20), // ~22 m/s budget + buffer
    rewardCoins: Math.round(150 + dist * 0.6) + level * 20,
    rewardXp: 60 + level * 8,
    reputation: 6,
  };
}
