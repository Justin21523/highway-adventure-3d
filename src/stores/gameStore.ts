/**
 * Core game state store.
 *
 * Manages player profile, game mode transitions, and active quest reference.
 * Vehicle state, world state, traffic state, shop state, quest state, and
 * performance state live in their own dedicated stores to keep each store
 * small and focused.
 *
 * This file replaces the old monolithic store at src/store/gameStore.ts.
 * The old file is kept for backward compatibility during migration.
 */

import { create } from 'zustand';
import type { GameMode } from '@/types/core';
import type { Quest, ActiveQuest } from '@/types/quest';
import { xpForLevel, totalXpForLevel, levelFromXp } from '@/constants/economy';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Player profile persisted across sessions */
export interface PlayerProfile {
  id: string;
  name: string;
  level: number;
  xp: number;
  coins: number;
  inventory: string[];
  equippedVehicle: string;
  unlockedVehicles: string[];
  totalDistanceTraveled: number;
  totalCoinsCollected: number;
  totalQuestsCompleted: number;
}

/** Vehicle state shape (simplified for UI) */
interface VehicleState {
  speed: number;
  maxSpeed: number;
  fuel: number;
  health: number;
  isDrifting: boolean;
  isBoosting: boolean;
  boostTimer: number;
  steerAngle: number;
  headingAngle: number;
}

/** Player position in world space */
interface PlayerPosition {
  x: number;
  y: number;
  z: number;
}

/** Input controls state */
interface ControlsState {
  throttle: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  boost: boolean;
}

/** Notification shape */
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

/** Shape of the game store state */
interface GameStoreState {
  profile: PlayerProfile;
  vehicle: VehicleState;
  controls: ControlsState;
  gameMode: GameMode;
  activeQuestId: string | null;
  playerPosition: PlayerPosition;
  notifications: Notification[];
}

/** Shape of the game store actions */
interface GameStoreActions {
  /* ── Profile ── */
  setProfileName: (name: string) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addXp: (amount: number) => void;
  addItemToInventory: (itemId: string) => void;
  removeItemFromInventory: (itemId: string, count?: number) => void;
  hasItem: (itemId: string) => boolean;

  /* ── Vehicle ── */
  equipVehicle: (vehicleId: string) => boolean;
  unlockVehicle: (vehicleId: string) => boolean;

  /* ── Quest ── */
  setActiveQuest: (quest: ActiveQuest | null) => void;
  setActiveQuestId: (questId: string | null) => void;
  updateQuestObjectiveProgress: (objectiveId: string, amount: number) => void;
  completeActiveQuest: () => void;
  failActiveQuest: () => void;

  /* ── Mode ── */
  setGameMode: (mode: GameMode) => void;

  /* ── Vehicle ── */
  updateVehicleState: (partialState: Partial<VehicleState>) => void;

  /* ── Notifications ── */
  addNotification: (message: string) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  /* ── Position ── */
  setPlayerPosition: (pos: PlayerPosition) => void;

  /* ── Persistence helpers ── */
  exportSave: () => Record<string, unknown>;
  importSave: (data: Record<string, unknown>) => void;
  resetProfile: () => void;
  resetVehicle: () => void;
}

/* ─────────────────────────────────────────────
 * Initial State
 * ───────────────────────────────────────────── */

const INITIAL_PROFILE: PlayerProfile = {
  id: 'player_01',
  name: 'Racer',
  level: 1,
  xp: 0,
  coins: 2000,
  inventory: ['item_repair_kit', 'item_boost_fuel'],
  equippedVehicle: 'sedan_basic',
  unlockedVehicles: ['sedan_basic', 'sports_red'],
  totalDistanceTraveled: 0,
  totalCoinsCollected: 0,
  totalQuestsCompleted: 0,
};

/* ─────────────────────────────────────────────
 * Store
 * ───────────────────────────────────────────── */

export const useGameStore = create<GameStoreState & GameStoreActions>()((set, get) => ({
  /* ── State ── */
  profile: INITIAL_PROFILE,
  vehicle: {
    speed: 0,
    maxSpeed: 200,
    fuel: 100,
    health: 100,
    isDrifting: false,
    isBoosting: false,
    boostTimer: 0,
    steerAngle: 0,
    headingAngle: 0,
  },
  controls: {
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    boost: false,
  },
  gameMode: 'playing' as GameMode,
  activeQuestId: null,
  playerPosition: { x: 4.35, y: 0.5, z: 0 },
  notifications: [],

  /* ── Profile Actions ── */

  setProfileName: (name) =>
    set((state) => ({
      profile: { ...state.profile, name },
    })),

  addCoins: (amount) =>
    set((state) => {
      const newCoins = state.profile.coins + amount;
      const newTotalCoins = state.profile.totalCoinsCollected + amount;
      return {
        profile: { ...state.profile, coins: newCoins, totalCoinsCollected: newTotalCoins },
      };
    }),

  spendCoins: (amount) => {
    const { profile } = get();
    if (profile.coins < amount) return false;
    set({ profile: { ...profile, coins: profile.coins - amount } });
    return true;
  },

  addXp: (amount) =>
    set((state) => {
      let newXp = state.profile.xp + amount;
      let newLevel = state.profile.level;

      // Level up loop — XP required grows per level
      while (newLevel < 50) {
        const xpNeeded = xpForLevel(newLevel + 1);
        if (newXp >= xpNeeded) {
          newXp -= xpNeeded;
          newLevel += 1;
        } else {
          break;
        }
      }

      return {
        profile: { ...state.profile, xp: newXp, level: newLevel },
      };
    }),

  addItemToInventory: (itemId) =>
    set((state) => {
      if (state.profile.inventory.includes(itemId)) {
        return {}; // Already owned, no-op
      }
      return {
        profile: { ...state.profile, inventory: [...state.profile.inventory, itemId] },
      };
    }),

  removeItemFromInventory: (itemId, count = 1) =>
    set((state) => {
      const items = state.profile.inventory.filter((id) => id !== itemId);
      return { profile: { ...state.profile, inventory: items } };
    }),

  hasItem: (itemId) => get().profile.inventory.includes(itemId),

  /* ── Vehicle Actions ── */

  equipVehicle: (vehicleId) => {
    const { profile } = get();
    if (!profile.unlockedVehicles.includes(vehicleId)) return false;
    set({ profile: { ...profile, equippedVehicle: vehicleId } });
    return true;
  },

  unlockVehicle: (vehicleId) => {
    const { profile } = get();
    if (profile.unlockedVehicles.includes(vehicleId)) return true;
    set({
      profile: { ...profile, unlockedVehicles: [...profile.unlockedVehicles, vehicleId] },
    });
    return true;
  },

  /* ── Quest Actions ── */

  setActiveQuest: (quest) =>
    set((state) => ({
      activeQuestId: quest ? quest.questId : null,
    })),

  setActiveQuestId: (questId) => set({ activeQuestId: questId }),

  updateQuestObjectiveProgress: (objectiveId, amount) => {
    // This action is intentionally minimal — actual quest state lives in questStore.
    // Kept here for backward compatibility with existing code that references gameStore.
    set(() => ({}));
  },

  completeActiveQuest: () =>
    set((state) => {
      const { profile } = state;
      return {
        activeQuestId: null,
        profile: {
          ...profile,
          totalQuestsCompleted: profile.totalQuestsCompleted + 1,
        },
      };
    }),

  failActiveQuest: () => set({ activeQuestId: null }),

  /* ── Mode Actions ── */

  setGameMode: (mode) => set({ gameMode: mode }),

  /* ── Vehicle Actions ── */

  updateVehicleState: (partialState) =>
    set((state) => ({
      vehicle: { ...state.vehicle, ...partialState },
    })),

  /* ── Controls Actions ── */

  setControls: (partialControls) =>
    set((state) => ({
      controls: { ...state.controls, ...partialControls },
    })),

  /* ── Notification Actions ── */

  addNotification: (message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          message,
          type: 'info',
          timestamp: Date.now(),
        },
      ].slice(-10), // Keep last 10 notifications
    })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  /* ── Persistence Helpers ── */

  exportSave: () => {
    const state = get();
    return {
      profile: {
        id: state.profile.id,
        name: state.profile.name,
        level: state.profile.level,
        xp: state.profile.xp,
        coins: state.profile.coins,
        inventory: state.profile.inventory,
        equippedVehicle: state.profile.equippedVehicle,
        unlockedVehicles: state.profile.unlockedVehicles,
        totalDistanceTraveled: state.profile.totalDistanceTraveled,
        totalCoinsCollected: state.profile.totalCoinsCollected,
        totalQuestsCompleted: state.profile.totalQuestsCompleted,
      },
      vehicle: {
        speed: state.vehicle.speed,
        maxSpeed: state.vehicle.maxSpeed,
        fuel: state.vehicle.fuel,
        health: state.vehicle.health,
      },
      timestamp: Date.now(),
    };
  },

  importSave: (data) => {
    if (!data || typeof data !== 'object') return;
    const profileData = (data as any).profile;
    if (!profileData || typeof profileData !== 'object') return;

    const safeProfile: PlayerProfile = {
      id: String(profileData.id ?? 'player_01'),
      name: String(profileData.name ?? 'Racer'),
      level: Math.max(1, Math.min(50, Number(profileData.level) || 1)),
      xp: Math.max(0, Number(profileData.xp) || 0),
      coins: Math.max(0, Number(profileData.coins) || 2000),
      inventory: Array.isArray(profileData.inventory) ? profileData.inventory : [],
      equippedVehicle: String(profileData.equippedVehicle ?? 'sedan_basic'),
      unlockedVehicles: Array.isArray(profileData.unlockedVehicles)
        ? profileData.unlockedVehicles
        : ['sedan_basic', 'sports_red'],
      totalDistanceTraveled: Number(profileData.totalDistanceTraveled) || 0,
      totalCoinsCollected: Number(profileData.totalCoinsCollected) || 0,
      totalQuestsCompleted: Number(profileData.totalQuestsCompleted) || 0,
    };

    set({ profile: safeProfile });
  },

  resetProfile: () =>
    set({
      profile: INITIAL_PROFILE,
      vehicle: {
        speed: 0,
        maxSpeed: 200,
        fuel: 100,
        health: 100,
        isDrifting: false,
        isBoosting: false,
        boostTimer: 0,
        steerAngle: 0,
        headingAngle: 0,
      },
      controls: {
        throttle: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
        boost: false,
      },
      activeQuestId: null,
      playerPosition: { x: 4.35, y: 0.5, z: 0 },
      notifications: [],
    }),

  /* ── Position Actions ── */

  setPlayerPosition: (pos) =>
    set({ playerPosition: pos }),

  /* ── Vehicle Actions ── */

  resetVehicle: () =>
    set({
      vehicle: {
        speed: 0,
        maxSpeed: 200,
        fuel: 100,
        health: 100,
        isDrifting: false,
        isBoosting: false,
        boostTimer: 0,
        steerAngle: 0,
        headingAngle: 0,
      },
      playerPosition: { x: 4.35, y: 0.5, z: 0 },
    }),
}));
