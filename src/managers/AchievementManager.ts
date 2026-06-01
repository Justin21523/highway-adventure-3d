// src/managers/AchievementManager.ts
/**
 * AchievementManager
 * Tracks player milestones and awards achievements with rewards.
 * Persistent storage via localStorage, with real-time progress updates.
 * Zero external dependencies - pure TypeScript logic.
 */

import { useGameStore } from '../stores/gameStore';
import { NotificationManager } from './NotificationManager';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  condition: (state: any) => boolean;
  reward: { coins: number; xp: number; item?: string };
  unlocked: boolean;
  progress: number;
  maxProgress: number;
};

export class AchievementManager {
  private static instance: AchievementManager | null = null;
  private achievements: Map<string, Achievement> = new Map();
  private STORAGE_KEY = 'highway_achievements_v1';
  
  private constructor() {
    this.registerDefaultAchievements();
    this.loadProgress();
  }
  
  static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }
  
  private registerDefaultAchievements() {
    const defs: Achievement[] = [
      {
        id: 'first_blood',
        title: 'First Blood',
        description: 'Complete your first quest',
        condition: (state) => state.completedQuests >= 1,
        reward: { coins: 200, xp: 100 },
        unlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Reach 250 km/h',
        condition: (state) => state.maxSpeedEver >= 250,
        reward: { coins: 500, xp: 250, item: 'cosmetic_neon_under' },
        unlocked: false,
        progress: 0,
        maxProgress: 250
      },
      {
        id: 'drift_master',
        title: 'Drift Master',
        description: 'Drift for 1000 meters total',
        condition: (state) => state.totalDriftDistance >= 1000,
        reward: { coins: 300, xp: 150, item: 'part_tires_sport' },
        unlocked: false,
        progress: 0,
        maxProgress: 1000
      },
      {
        id: 'collector',
        title: 'Coin Collector',
        description: 'Collect 5000 coins',
        condition: (state) => state.totalCoinsCollected >= 5000,
        reward: { coins: 1000, xp: 500 },
        unlocked: false,
        progress: 0,
        maxProgress: 5000
      },
      {
        id: 'survivor',
        title: 'Highway Survivor',
        description: 'Drive 50 km without crashing',
        condition: (state) => state.longestSurvivalDistance >= 50000,
        reward: { coins: 400, xp: 200, item: 'item_fuel_tank' },
        unlocked: false,
        progress: 0,
        maxProgress: 50000
      },
      {
        id: 'shopaholic',
        title: 'Shopaholic',
        description: 'Purchase 10 items',
        condition: (state) => state.totalPurchases >= 10,
        reward: { coins: 250, xp: 125 },
        unlocked: false,
        progress: 0,
        maxProgress: 10
      }
    ];
    
    defs.forEach(a => this.achievements.set(a.id, { ...a }));
  }
  
  private loadProgress() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      saved.forEach((s: any) => {
        const ach = this.achievements.get(s.id);
        if (ach) {
          ach.unlocked = s.unlocked;
          ach.progress = s.progress;
        }
      });
    } catch (e) {
      console.warn('AchievementManager: Failed to load progress', e);
    }
  }
  
  private saveProgress() {
    try {
      const data = Array.from(this.achievements.values()).map(a => ({
        id: a.id, unlocked: a.unlocked, progress: a.progress
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('AchievementManager: Failed to save progress', e);
    }
  }
  
  /**
   * Update achievement progress based on current game state
   * Call this periodically from your game loop or on relevant events
   */
  updateProgress() {
    const state = useGameStore.getState();
    let changed = false;
    
    this.achievements.forEach(ach => {
      if (ach.unlocked) return;
      
      // Update progress based on achievement type
      if (ach.id === 'speed_demon') {
        ach.progress = Math.max(ach.progress, state.vehicle.speed);
      } else if (ach.id === 'drift_master') {
        ach.progress = Math.max(ach.progress, state.totalDriftDistance || 0);
      } else if (ach.id === 'collector') {
        ach.progress = Math.max(ach.progress, state.totalCoinsCollected || 0);
      } else if (ach.id === 'survivor') {
        ach.progress = Math.max(ach.progress, state.longestSurvivalDistance || 0);
      } else if (ach.id === 'shopaholic') {
        ach.progress = Math.max(ach.progress, state.totalPurchases || 0);
      } else if (ach.id === 'first_blood') {
        ach.progress = state.completedQuests || 0;
      }
      
      // Check completion
      if (ach.progress >= ach.maxProgress && ach.condition({
        ...state,
        completedQuests: state.completedQuests || 0,
        maxSpeedEver: state.maxSpeedEver || 0,
        totalDriftDistance: state.totalDriftDistance || 0,
        totalCoinsCollected: state.totalCoinsCollected || 0,
        longestSurvivalDistance: state.longestSurvivalDistance || 0,
        totalPurchases: state.totalPurchases || 0
      })) {
        ach.unlocked = true;
        // Award rewards
        if (ach.reward.coins) useGameStore.getState().addCoins(ach.reward.coins);
        if (ach.reward.xp) useGameStore.getState().addXp(ach.reward.xp);
        if (ach.reward.item) useGameStore.getState().addItemToInventory(ach.reward.item);
        // Celebrate with a toast.
        NotificationManager.getInstance().achievementUnlocked(
          ach.title,
          ach.reward.coins ? `+${ach.reward.coins}🪙` : 'Unlocked',
        );
        useGameStore.getState().addReputation(15);
        changed = true;
      }
    });
    
    if (changed) this.saveProgress();
  }
  
  /**
   * Get all achievements for UI display
   */
  getAll(): Achievement[] {
    return Array.from(this.achievements.values());
  }
  
  /**
   * Get unlocked achievements only
   */
  getUnlocked(): Achievement[] {
    return this.getAll().filter(a => a.unlocked);
  }
  
  /**
   * Reset all progress (for testing/debugging)
   */
  reset() {
    this.achievements.forEach(a => {
      a.unlocked = false;
      a.progress = 0;
    });
    localStorage.removeItem(this.STORAGE_KEY);
  }
}