/**
 * dailyStore — date-seeded daily challenges for return-visit motivation.
 *
 * Three deterministic goals per calendar day (same for everyone on a given date,
 * via a date hash). Progress is bumped from existing gameplay signals (activities,
 * near-misses, POI discoveries); completing one auto-grants a coin + reputation
 * reward with a toast. Resets automatically when the date changes.
 */

import { create } from 'zustand';
import { useGameStore } from './gameStore';
import { NotificationManager } from '../managers/NotificationManager';

export type DailyMetric = 'activity' | 'nearMiss' | 'poi';

export interface DailyChallenge {
  id: string;
  label: string;
  metric: DailyMetric;
  target: number;
  progress: number;
  reward: number;
  done: boolean;
}

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function buildChallenges(key: string): DailyChallenge[] {
  const h = hashStr(key);
  const activityT = 1 + (h % 3);
  const nearMissT = 6 + ((h >> 3) % 10);
  const poiT = 1 + ((h >> 7) % 3);
  return [
    { id: 'd_activity', label: `完成 ${activityT} 個分區活動`, metric: 'activity', target: activityT, progress: 0, reward: 500, done: false },
    { id: 'd_nearmiss', label: `達成 ${nearMissT} 次擦身而過`, metric: 'nearMiss', target: nearMissT, progress: 0, reward: 400, done: false },
    { id: 'd_poi', label: `發現 ${poiT} 個景點`, metric: 'poi', target: poiT, progress: 0, reward: 350, done: false },
  ];
}

interface DailyState {
  dateKey: string;
  challenges: DailyChallenge[];
  ensureToday: () => void;
  bump: (metric: DailyMetric, amount?: number) => void;
}

export const useDailyStore = create<DailyState>()((set, get) => ({
  dateKey: dayKey(),
  challenges: buildChallenges(dayKey()),

  ensureToday: () => {
    const today = dayKey();
    if (get().dateKey !== today) {
      set({ dateKey: today, challenges: buildChallenges(today) });
    }
  },

  bump: (metric, amount = 1) => {
    get().ensureToday();
    let rewardedTitle: string | null = null;
    let rewardCoins = 0;
    const challenges = get().challenges.map((c) => {
      if (c.metric !== metric || c.done) return c;
      const progress = Math.min(c.target, c.progress + amount);
      const done = progress >= c.target;
      if (done) { rewardedTitle = c.label; rewardCoins = c.reward; }
      return { ...c, progress, done };
    });
    set({ challenges });
    if (rewardedTitle) {
      useGameStore.getState().addCoins(rewardCoins);
      useGameStore.getState().addReputation(20);
      NotificationManager.getInstance().notify({
        title: '每日挑戰完成！',
        message: `${rewardedTitle} · +${rewardCoins}🪙`,
        priority: 'high',
        duration: 3000,
        icon: 'success',
      });
    }
  },
}));
