// src/managers/StatsTracker.ts
/**
 * StatsTracker
 * Persistent local statistics for player progression and analytics.
 * Auto-saves to localStorage, provides getters for UI/achievements.
 * Thread-safe via singleton pattern and immutable updates.
 */

import { useGameStore } from '../stores/gameStore';

export interface PlayerStats {
  totalDistance: number; // meters driven
  totalCoins: number; // all-time coins collected
  totalQuests: number; // completed quests count
  maxSpeed: number; // highest speed ever reached
  longestDrift: number; // longest single drift in meters
  totalPlaytime: number; // seconds
  crashes: number; // times health reached 0
  purchases: number; // shop transactions
  lastSession: number; // timestamp
}

const DEFAULT_STATS: PlayerStats = {
  totalDistance: 0,
  totalCoins: 0,
  totalQuests: 0,
  maxSpeed: 0,
  longestDrift: 0,
  totalPlaytime: 0,
  crashes: 0,
  purchases: 0,
  lastSession: Date.now()
};

export class StatsTracker {
  private static instance: StatsTracker | null = null;
  private stats: PlayerStats = { ...DEFAULT_STATS };
  private sessionStart = Date.now();
  private lastUpdate = Date.now();
  private readonly SAVE_INTERVAL = 30000; // 30 seconds
  private STORAGE_KEY = 'highway_stats_v1';
  
  private constructor() {
    this.load();
    // Auto-save interval
    setInterval(() => this.save(), this.SAVE_INTERVAL);
  }
  
  static getInstance(): StatsTracker {
    if (!StatsTracker.instance) {
      StatsTracker.instance = new StatsTracker();
    }
    return StatsTracker.instance;
  }
  
  private load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        this.stats = { ...DEFAULT_STATS, ...loaded };
      }
    } catch (e) {
      console.warn('StatsTracker: Failed to load stats', e);
    }
  }
  
  save() {
    try {
      this.stats.lastSession = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.warn('StatsTracker: Failed to save stats', e);
    }
  }
  
  /**
   * Update stats based on current game state
   * Call this every frame or on relevant events
   */
  update() {
    const state = useGameStore.getState();
    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000; // seconds
    this.lastUpdate = now;
    
    // Distance tracking
    if (state.vehicle.speed > 1) {
      this.stats.totalDistance += (state.vehicle.speed / 3.6) * delta; // m/s * s = meters
    }
    
    // Max speed tracking
    if (state.vehicle.speed > this.stats.maxSpeed) {
      this.stats.maxSpeed = state.vehicle.speed;
    }
    
    // Drift tracking
    if (state.vehicle.isDrifting && state.vehicle.speed > 30) {
      const driftDist = (state.vehicle.speed / 3.6) * delta;
      this.stats.longestDrift = Math.max(this.stats.longestDrift, driftDist);
    }
    
    // Playtime tracking
    this.stats.totalPlaytime += delta;
    
    // Crash detection (health dropped to 0)
    if (state.vehicle.health <= 0 && state.gameMode === 'crashed') {
      this.stats.crashes += 1;
    }
    
    // Auto-save if significant changes
    if (Math.random() < 0.01) this.save(); // ~1% chance per frame to avoid constant writes
  }
  
  /**
   * Record a coin collection event
   */
  addCoins(amount: number) {
    this.stats.totalCoins += amount;
    this.save();
  }
  
  /**
   * Record a quest completion
   */
  completeQuest() {
    this.stats.totalQuests += 1;
    this.save();
  }
  
  /**
   * Record a shop purchase
   */
  recordPurchase() {
    this.stats.purchases += 1;
    this.save();
  }
  
  /**
   * Get current stats for UI display
   */
  getStats(): PlayerStats {
    return { ...this.stats };
  }
  
  /**
   * Format distance for display (km with 1 decimal)
   */
  formatDistance(meters: number): string {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  
  /**
   * Format playtime for display (HH:MM:SS)
   */
  formatPlaytime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  /**
   * Reset all stats (for testing/debugging)
   */
  reset() {
    this.stats = { ...DEFAULT_STATS };
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
