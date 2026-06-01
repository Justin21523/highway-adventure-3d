// src/store/gameStore.ts - COMPLETE FIXED VERSION

import { create } from 'zustand';
import * as THREE from 'three';
import {
  IPlayerProfile, IQuest, IVehicleState, IPerformanceMetrics,
  GameMode, IVec3, InputState, InteractionTarget, QuestStats,
  QuestObjective, QuestCategory, Controls
} from '../types/core';
import { effectiveVehicleStats } from '../systems/VehicleUpgradeSystem';
import { VEHICLE_CONFIG_MAP } from '../constants/vehicles';

/** Reputation needed per rank step. */
const REP_PER_RANK = 500;

// Helper for XP calculation
const xpForLevel = (level: number): number => 1000 + (level - 1) * 500;

// ============================================================================
// INITIAL STATE CONSTANTS
// ============================================================================

const INITIAL_POSITION: IVec3 = { x: 0, y: 0.5, z: 0 };

const INITIAL_PROFILE: IPlayerProfile = {
  id: 'player_01',
  name: 'Racer',
  level: 1,
  xp: 0,
  coins: 2000,
  inventory: [],
  equippedVehicle: 'sedan_basic',
  unlockedVehicles: ['sedan_basic', 'sports_red'],
  totalDistanceTraveled: 0,
  totalCoinsCollected: 0,
  totalQuestsCompleted: 0,
  xpToNext: xpForLevel(2),
  rank: 0,
  reputation: 0,
};

const INITIAL_VEHICLE: IVehicleState = {
  id: 'sedan_basic',
  position: { ...INITIAL_POSITION },
  rotation: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  speed: 0,
  maxSpeed: 200,
  rpm: 800,
  gear: 1,
  health: 100,
  maxHealth: 100,
  fuel: 100,
  isDrifting: false,
  isBoosting: false,
  boostTimer: 0,
  steerAngle: 0,
  slipAngle: 0,
  paintColor: '#e63946',
  accelMult: 1,
  handlingMult: 1,
};

const INITIAL_CONTROLS: Controls = {
  throttle: false,
  brake: false,
  steerLeft: false,
  steerRight: false,
  boost: false,
};

const INITIAL_INPUT_STATE: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
  boost: false,
  interact: false,
  quest: false,
  pause: false,
};

// Fix INITIAL_QUEST_STATS to include ALL categories:
const INITIAL_QUEST_STATS: QuestStats = {
  totalCompleted: 0,
  totalFailed: 0,
  totalDriftDistance: 0,
  totalTopSpeedReached: 0,
  totalPickupsCollected: 0,
  // ✅ Initialize ALL category keys to satisfy Record<QuestCategory, number>
  categoryCompleted: {
    main: 0,
    side: 0,
    daily: 0,
    exploration: 0,
    delivery: 0,
    challenge: 0,
    tour: 0
  },
};

const INITIAL_PERFORMANCE: IPerformanceMetrics = {
  fps: 60,
  frameTime: 16.6,
  memoryUsed: 0,
  drawCalls: 0,
  triangles: 0,
  qualityTier: 'high',
};

// ============================================================================
// STORE INTERFACES
// ============================================================================

export interface GameStoreState {
  // Core state
  profile: IPlayerProfile;
  vehicle: IVehicleState;
  gameMode: GameMode;
  
  // Quest system
  activeQuestId: string | null;
  activeQuest: IQuest | null;
  availableQuests: IQuest[];
  completedQuests: number;
  questStats: QuestStats;
  
  // Player tracking
  playerPosition: IVec3;
  lastCheckpoint: IVec3;
  maxSpeedEver: number;
  totalDriftDistance: number;
  totalCoinsCollected: number;
  longestSurvivalDistance: number;
  totalPurchases: number;
  
  // Input & interaction
  inputState: InputState;
  /** Driving controls consumed by VehiclePhysics each frame. */
  controls: Controls;
  interactionTarget: InteractionTarget | null;

  // Collision feedback (i-frames + near-miss combo)
  /** ms timestamp until which the player ignores collisions (post-hit/respawn). */
  invulnerableUntil: number;
  /** Current near-miss combo count (0 when broken). */
  combo: number;
  /** ms timestamp when the current combo expires if no new near-miss. */
  comboExpiresAt: number;
  /** Police heat 0..5 — rises from crashes/speeding, spawns pursuit. */
  wantedLevel: number;
  
  // UI/Notifications
  notifications: Array<{ id: string; message: string; type: string; timestamp: number }>;
  
  // Performance
  performance: IPerformanceMetrics;
  
  // R3F refs (set via RuntimeManagers)
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
}

export interface GameStoreActions {
  // Profile actions
  setProfileName: (name: string) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addXp: (amount: number) => void;
  addItemToInventory: (itemId: string, count?: number) => void;
  removeItemFromInventory: (itemId: string, count?: number) => void;
  hasItem: (itemId: string) => boolean;
  
  // Vehicle actions
  equipVehicle: (vehicleId: string) => boolean;
  unlockVehicle: (vehicleId: string) => boolean;
  purchaseVehicle: (vehicleId: string) => boolean;
  setPaint: (color: string) => void;
  updateVehicleState: (partial: Partial<IVehicleState>) => void;
  repairVehicle: (amount?: number) => void;
  resetVehicle: () => void;

  // Progression
  addReputation: (amount: number) => void;

  // Police heat
  addWanted: (amount: number) => void;
  clearWanted: () => void;
  
  // Quest actions
  setActiveQuest: (quest: IQuest | null) => void;
  setActiveQuestId: (questId: string | null) => void;
  updateQuestObjectiveProgress: (objectiveId: string, amount: number) => void;
  completeActiveQuest: () => void;
  completeQuest: (questId?: string) => void;
  failActiveQuest: () => void;
  updateQuestStats: (partial: Partial<QuestStats>) => void;
  
  // Mode actions
  setGameMode: (mode: GameMode) => void;
  
  // Input actions
  updateInputState: (partial: Partial<InputState>) => void;
  
  // Interaction actions
  setInteractionTarget: (target: InteractionTarget | null) => void;
  
  // Notification actions
  addNotification: (message: string, type?: string) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Position actions
  setPlayerPosition: (pos: IVec3) => void;
  
  // Performance actions
  updatePerformanceMetrics: (metrics: Partial<IPerformanceMetrics>) => void;
  
  // Persistence
  exportSave: () => any;
  importSave: (data: any) => void;
  resetProfile: () => void;

  setControls: (partial: { throttle?: boolean; brake?: boolean; steerLeft?: boolean; steerRight?: boolean; boost?: boolean }) => void;
}

// ============================================================================
// ZUSTAND STORE CREATION
// ============================================================================

export const useGameStore = create<GameStoreState & GameStoreActions>()((set, get) => ({
  /* ── Initial State ── */
  profile: INITIAL_PROFILE,
  vehicle: INITIAL_VEHICLE,
  gameMode: 'playing',
  
  // Quest system
  activeQuestId: null,
  activeQuest: null,
  availableQuests: [],
  completedQuests: 0,
  questStats: INITIAL_QUEST_STATS,
  
  // Player tracking
  playerPosition: INITIAL_POSITION,
  lastCheckpoint: INITIAL_POSITION,
  maxSpeedEver: 0,
  totalDriftDistance: 0,
  totalCoinsCollected: 0,
  longestSurvivalDistance: 0,
  totalPurchases: 0,
  
  // Input & interaction
  inputState: INITIAL_INPUT_STATE,
  controls: { ...INITIAL_CONTROLS },
  interactionTarget: null,

  // Collision feedback
  invulnerableUntil: 0,
  combo: 0,
  comboExpiresAt: 0,
  wantedLevel: 0,
  
  // UI/Notifications
  notifications: [],
  
  // Performance
  performance: INITIAL_PERFORMANCE,
  
  // R3F refs
  sceneRef: { current: null },
  cameraRef: { current: null },

  /* ── Profile Actions ── */
  setProfileName: (name) => set((state) => ({
    profile: { ...state.profile, name }
  })),

  addCoins: (amount) => set((state) => {
    const newCoins = state.profile.coins + amount;
    const newTotal = state.totalCoinsCollected + amount;
    return {
      profile: { ...state.profile, coins: newCoins },
      totalCoinsCollected: newTotal
    };
  }),

  spendCoins: (amount) => {
    const { profile } = get();
    if (profile.coins < amount) return false;
    set({ profile: { ...profile, coins: profile.coins - amount } });
    return true;
  },

  addXp: (amount) => set((state) => {
    let newXp = state.profile.xp + amount;
    let newLevel = state.profile.level;
    
    while (newLevel < 50) {
      const xpNeeded = xpForLevel(newLevel + 1);
      if (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel += 1;
      } else break;
    }
    
    return {
      profile: { 
        ...state.profile, 
        xp: newXp, 
        level: newLevel, 
        xpToNext: xpForLevel(newLevel + 1) 
      }
    };
  }),

  addItemToInventory: (itemId, count = 1) => set((state) => {
    const newItems = [...state.profile.inventory];
    for (let i = 0; i < count; i++) newItems.push(itemId);
    return { profile: { ...state.profile, inventory: newItems } };
  }),

  removeItemFromInventory: (itemId, count = 1) => set((state) => {
    const items = [...state.profile.inventory];
    for (let i = 0; i < count && items.includes(itemId); i++) {
      const idx = items.indexOf(itemId);
      if (idx > -1) items.splice(idx, 1);
    }
    return { profile: { ...state.profile, inventory: items } };
  }),

  hasItem: (itemId) => get().profile.inventory.includes(itemId),

  /* ── Vehicle Actions ── */
  equipVehicle: (vehicleId) => {
    const { profile } = get();
    if (!profile.unlockedVehicles.includes(vehicleId)) return false;
    // Apply the equipped vehicle's config + owned upgrades to the live vehicle so
    // the car actually drives differently (top speed, acceleration, handling).
    const stats = effectiveVehicleStats(vehicleId, profile.inventory);
    set((s) => ({
      profile: { ...s.profile, equippedVehicle: vehicleId },
      vehicle: {
        ...s.vehicle,
        id: vehicleId,
        maxSpeed: stats.maxSpeed,
        accelMult: stats.accelMult,
        handlingMult: stats.handlingMult,
      },
    }));
    return true;
  },

  unlockVehicle: (vehicleId) => {
    const { profile } = get();
    if (profile.unlockedVehicles.includes(vehicleId)) return true;
    set({ profile: { ...profile, unlockedVehicles: [...profile.unlockedVehicles, vehicleId] } });
    return true;
  },

  purchaseVehicle: (vehicleId) => {
    const cfg = VEHICLE_CONFIG_MAP[vehicleId];
    if (!cfg) return false;
    const { profile } = get();
    if (profile.unlockedVehicles.includes(vehicleId)) return true;
    if (!get().spendCoins(cfg.price)) return false;
    get().unlockVehicle(vehicleId);
    return true;
  },

  setPaint: (color) => set((s) => ({ vehicle: { ...s.vehicle, paintColor: color } })),

  addReputation: (amount) => set((s) => {
    const reputation = Math.max(0, s.profile.reputation + amount);
    const rank = Math.floor(reputation / REP_PER_RANK);
    return { profile: { ...s.profile, reputation, rank } };
  }),

  addWanted: (amount) => set((s) => ({ wantedLevel: Math.max(0, Math.min(5, s.wantedLevel + amount)) })),
  clearWanted: () => set({ wantedLevel: 0 }),

  updateVehicleState: (partial) => set((state) => ({
    vehicle: { ...state.vehicle, ...partial },
    maxSpeedEver: Math.max(state.maxSpeedEver, partial.speed ?? state.vehicle.speed)
  })),

  repairVehicle: (amount = 100) => set((state) => ({
    vehicle: {
      ...state.vehicle,
      health: Math.min(state.vehicle.maxHealth, state.vehicle.health + amount)
    }
  })),

  resetVehicle: () => set({ vehicle: INITIAL_VEHICLE, playerPosition: INITIAL_POSITION }),

  /* ── Quest Actions ── */
  setActiveQuest: (quest) => set({ activeQuestId: quest?.id ?? null, activeQuest: quest }),
  setActiveQuestId: (questId) => set({ activeQuestId: questId }),

  updateQuestObjectiveProgress: (objectiveId, amount) => {
    const { activeQuest } = get();
    if (!activeQuest) return;
    
    const updated = activeQuest.objectives.map(obj => {
      if (obj.id !== objectiveId) return obj;
      const newCurrent = Math.min(obj.target, obj.current + amount);
      return { ...obj, current: newCurrent, isCompleted: newCurrent >= obj.target };
    });
    
    const allDone = updated.every(o => o.isCompleted);
    set({
      activeQuest: { ...activeQuest, objectives: updated },
      questStats: {
        ...get().questStats,
        totalCompleted: allDone ? get().questStats.totalCompleted + 1 : get().questStats.totalCompleted
      }
    });
    
    if (allDone) get().completeQuest();
  },

  completeActiveQuest: () => set((state) => ({
    activeQuestId: null,
    activeQuest: null,
    completedQuests: state.completedQuests + 1,
    profile: { ...state.profile, totalQuestsCompleted: state.profile.totalQuestsCompleted + 1 }
  })),

  completeQuest: (questId?: string) => {
    const state = get();
    const targetQuestId = questId || state.activeQuest?.id;
    
    if (!targetQuestId) return;
    
    // Find and award rewards
    const quest = state.availableQuests.find(q => q.id === targetQuestId) || state.activeQuest;
    if (quest?.rewards) {
      if (quest.rewards.coins) get().addCoins(quest.rewards.coins);
      if (quest.rewards.xp) get().addXp(quest.rewards.xp);
      quest.rewards.items?.forEach(item => get().addItemToInventory(item));
    }
    
    // Update stats and clear
    set({
      completedQuests: state.completedQuests + 1,
      activeQuest: null,
      activeQuestId: null,
      availableQuests: state.availableQuests.filter(q => q.id !== targetQuestId)
    });
  },

  failActiveQuest: () => set({ activeQuestId: null, activeQuest: null }),

  updateQuestStats: (partial) =>
    set((state) => {
      const mergedCategories = { ...state.questStats.categoryCompleted };
      if (partial.categoryCompleted) {
        Object.entries(partial.categoryCompleted).forEach(([key, value]) => {
          if (key in mergedCategories) {
            mergedCategories[key as QuestCategory] = value;
          }
        });
      }
      return {
        questStats: {
          ...state.questStats,
          ...partial,
          categoryCompleted: mergedCategories
        }
      };
    }),

  /* ── Mode Actions ── */
  setGameMode: (mode) => set({ gameMode: mode }),

  /* ── Input Actions ── */
  updateInputState: (partial) => set((state) => ({
    inputState: { ...state.inputState, ...partial }
  })),

  /* ── Interaction Actions ── */
  setInteractionTarget: (target) => set({ interactionTarget: target }),

  /* ── Notification Actions ── */
  addNotification: (message, type = 'info') => set((state) => ({
    notifications: [
      ...state.notifications,
      { id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, message, type, timestamp: Date.now() }
    ].slice(-10)
  })),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  clearNotifications: () => set({ notifications: [] }),

  /* ── Position Actions ── */
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  /* ── Performance Actions ── */
  updatePerformanceMetrics: (metrics) => set((state) => ({
    performance: { ...state.performance, ...metrics }
  })),

  /* ── Persistence ── */
  exportSave: () => {
    const s = get();
    return {
      profile: {
        id: s.profile.id, name: s.profile.name, level: s.profile.level,
        xp: s.profile.xp, coins: s.profile.coins, inventory: s.profile.inventory,
        equippedVehicle: s.profile.equippedVehicle, unlockedVehicles: s.profile.unlockedVehicles,
        totalDistanceTraveled: s.profile.totalDistanceTraveled,
        totalCoinsCollected: s.totalCoinsCollected,
        totalQuestsCompleted: s.profile.totalQuestsCompleted
      },
      vehicle: { speed: s.vehicle.speed, fuel: s.vehicle.fuel, health: s.vehicle.health },
      questStats: s.questStats,
      timestamp: Date.now()
    };
  },

  importSave: (data) => {
    if (!data?.profile) return;
    const p = data.profile;
    const safeProfile: IPlayerProfile = {
      id: String(p.id ?? 'player_01'),
      name: String(p.name ?? 'Racer'),
      level: Math.max(1, Math.min(50, Number(p.level) || 1)),
      xp: Math.max(0, Number(p.xp) || 0),
      coins: Math.max(0, Number(p.coins) || 2000),
      inventory: Array.isArray(p.inventory) ? p.inventory : [],
      equippedVehicle: String(p.equippedVehicle ?? 'sedan_basic'),
      unlockedVehicles: Array.isArray(p.unlockedVehicles) ? p.unlockedVehicles : ['sedan_basic'],
      totalDistanceTraveled: Number(p.totalDistanceTraveled) || 0,
      totalCoinsCollected: Number(p.totalCoinsCollected) || 0,
      totalQuestsCompleted: Number(p.totalQuestsCompleted) || 0,
      xpToNext: xpForLevel((Number(p.level) || 1) + 1),
      rank: Math.max(0, Number(p.rank) || 0),
      reputation: Math.max(0, Number(p.reputation) || 0)
    };
    set({ profile: safeProfile });
    if (data.questStats) set({ questStats: { ...INITIAL_QUEST_STATS, ...data.questStats } });
  },

  resetProfile: () => set({
    profile: INITIAL_PROFILE,
    vehicle: INITIAL_VEHICLE,
    inputState: INITIAL_INPUT_STATE,
    interactionTarget: null,
    activeQuestId: null,
    activeQuest: null,
    availableQuests: [],
    completedQuests: 0,
    questStats: INITIAL_QUEST_STATS,
    playerPosition: INITIAL_POSITION,
    notifications: []
  }),

setControls: (partial) =>
  set((state) => ({
    controls: { ...state.controls, ...partial },
  })),

}));