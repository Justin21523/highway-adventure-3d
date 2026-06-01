// src/managers/SaveManager.ts
import { useGameStore } from '../stores/gameStore';
import { IPlayerProfile, IQuest } from '../types/core';

const SAVE_KEY = 'highway_adventure_save_v1';

/**
 * Save schema version. Bump when persisted data becomes incompatible.
 * v2: quest objective locations migrated from 60m road grid to 100m zone grid.
 * v3: gameplay-expansion fields added (profile.rank/reputation, vehicle stat
 *     multipliers/paint). Saves older than v3 are dropped entirely so progress
 *     starts fresh on incompatible data (no migration, by design).
 */
const SAVE_VERSION = 3;

export class SaveManager {
  private static instance: SaveManager | null = null;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SaveManager {
    if (!SaveManager.instance) SaveManager.instance = new SaveManager();
    return SaveManager.instance;
  }

  init() {
    if (this.isInitialized) return;
    this.load();
    this.startAutoSave();
    this.isInitialized = true;
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);

      // Incompatible (older) save → start fresh. No migration, by design.
      if ((data.version ?? 1) < SAVE_VERSION) return;

      const store = useGameStore.getState();

      if (data.profile) {
        const safeProfile: IPlayerProfile = { ...store.profile, ...data.profile };
        safeProfile.inventory = Array.isArray(safeProfile.inventory) ? safeProfile.inventory : [];
        safeProfile.unlockedVehicles = Array.isArray(safeProfile.unlockedVehicles) ? safeProfile.unlockedVehicles : ['sedan_basic', 'sports_red'];
        useGameStore.setState({ profile: safeProfile });
        // Re-equip so vehicle stat multipliers/maxSpeed match the loaded car.
        useGameStore.getState().equipVehicle(safeProfile.equippedVehicle);
      }

      if (Array.isArray(data.availableQuests)) {
        useGameStore.setState({ availableQuests: data.availableQuests as IQuest[] });
      }
    } catch (e) {
      console.warn('SaveManager: Failed to load save data. Starting fresh.', e);
    }
  }

  save() {
    try {
      const state = useGameStore.getState();
      const data = {
        version: SAVE_VERSION,
        profile: {
          id: state.profile.id,
          coins: state.profile.coins,
          level: state.profile.level,
          xp: state.profile.xp,
          inventory: state.profile.inventory,
          unlockedVehicles: state.profile.unlockedVehicles,
          equippedVehicle: state.profile.equippedVehicle,
          rank: state.profile.rank,
          reputation: state.profile.reputation
        },
        availableQuests: state.availableQuests,
        timestamp: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('SaveManager: Failed to persist data (Storage Quota/Privacy Mode).', e);
    }
  }

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
      window.location.reload();
    } catch (e) {
      console.warn('SaveManager: Failed to reset.', e);
    }
  }

  private startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.save();
    }, 30000);
  }

  dispose() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    this.save();
    SaveManager.instance = null;
    this.isInitialized = false;
  }
}
