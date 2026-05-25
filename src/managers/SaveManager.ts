// src/managers/SaveManager.ts
import { useGameStore } from '../store/gameStore';
import { IPlayerProfile, IQuest } from '../types/core';

const SAVE_KEY = 'highway_adventure_save_v1';

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
      const store = useGameStore.getState();
      
      if (data.profile) {
        const safeProfile: IPlayerProfile = { ...store.profile, ...data.profile };
        safeProfile.inventory = Array.isArray(safeProfile.inventory) ? safeProfile.inventory : [];
        safeProfile.unlockedVehicles = Array.isArray(safeProfile.unlockedVehicles) ? safeProfile.unlockedVehicles : ['veh_sedan_01', 'veh_sports_01'];
        useGameStore.setState({ profile: safeProfile });
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
        profile: {
          id: state.profile.id,
          coins: state.profile.coins,
          level: state.profile.level,
          xp: state.profile.xp,
          inventory: state.profile.inventory,
          unlockedVehicles: state.profile.unlockedVehicles,
          equippedVehicle: state.profile.equippedVehicle
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