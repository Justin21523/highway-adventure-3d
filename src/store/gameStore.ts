// src/store/gameStore.ts
import { create } from 'zustand';
import {
  IPlayerProfile,
  IQuest,
  IVehicleState,
  IPerformanceMetrics,
  GameMode,
  IVec3,
} from '@/types/core';

/* ── State & Actions Interfaces ── */

export interface GameStoreState {
  profile: IPlayerProfile;
  vehicle: IVehicleState;
  gameMode: GameMode;
  activeQuest: IQuest | null;
  availableQuests: IQuest[];
  performance: IPerformanceMetrics;
  currentChunkId: string;
  playerPosition: IVec3;
}

export interface GameStoreActions {
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addXp: (amount: number) => void;
  addItemToInventory: (itemId: string) => void;
  updateVehicleState: (partialState: Partial<IVehicleState>) => void;
  setGameMode: (mode: GameMode) => void;
  startQuest: (questId: string) => void;
  updateQuestProgress: (objectiveId: string, amount: number) => void;
  completeQuest: (questId: string) => void;
  updatePerformanceMetrics: (metrics: Partial<IPerformanceMetrics>) => void;
  setCurrentChunk: (chunkId: string) => void;
  setPlayerPosition: (pos: IVec3) => void;
}

/* ── Initial State ── */

const initialProfile: IPlayerProfile = {
  id: 'player_01',
  name: 'Racer',
  level: 1,
  xp: 0,
  coins: 1000,
  inventory: ['item_repair_kit', 'item_boost_fuel'],
  equippedVehicle: 'veh_sports_01',
  unlockedVehicles: ['veh_sedan_01', 'veh_sports_01'],
};

const initialVehicle: IVehicleState = {
  id: 'veh_sports_01',
  position: { x: 0, y: 0.5, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  speed: 0,
  rpm: 800,
  gear: 1,
  health: 100,
  maxHealth: 100,
  fuel: 100,
  isDrifting: false,
  isBoosting: false,
  slipAngle: 0,
};

const initialPerformance: IPerformanceMetrics = {
  fps: 60,
  frameTime: 16.6,
  memoryUsed: 0,
  drawCalls: 0,
  triangles: 0,
  qualityTier: 'high',
};

/* ── Store ── */

export const useGameStore = create<GameStoreState & GameStoreActions>()((set, get) => ({
  profile: initialProfile,
  vehicle: initialVehicle,
  gameMode: 'exploration',
  activeQuest: null,
  availableQuests: [],
  performance: initialPerformance,
  currentChunkId: 'chunk_0_0',
  playerPosition: { x: 0, y: 0.5, z: 0 },

  addCoins: (amount) =>
    set((state) => ({
      profile: { ...state.profile, coins: state.profile.coins + amount },
    })),

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
      const XP_PER_LEVEL = 1000;
      while (newXp >= XP_PER_LEVEL) {
        newXp -= XP_PER_LEVEL;
        newLevel += 1;
      }
      return { profile: { ...state.profile, xp: newXp, level: newLevel } };
    }),

  addItemToInventory: (itemId) =>
    set((state) => ({
      profile: { ...state.profile, inventory: [...state.profile.inventory, itemId] },
    })),

  updateVehicleState: (partialState) =>
    set((state) => ({
      vehicle: { ...state.vehicle, ...partialState },
    })),

  setGameMode: (mode) => set({ gameMode: mode }),

  startQuest: (questId) => {
    const quest = get().availableQuests.find((q) => q.id === questId);
    if (quest) {
      set({
        activeQuest: { ...quest, status: 'active' as const },
        availableQuests: get().availableQuests.filter((q) => q.id !== questId),
        gameMode: 'quest' as GameMode,
      });
    }
  },

  updateQuestProgress: (objectiveId, amount) =>
    set((state) => {
      if (!state.activeQuest) return {};

      const objectives = state.activeQuest.objectives.map((obj) => {
        if (obj.id === objectiveId && !obj.isCompleted) {
          const newCurrent = obj.current + amount;
          return {
            ...obj,
            current: newCurrent,
            isCompleted: newCurrent >= obj.target,
          };
        }
        return obj;
      });

      const allCompleted = objectives.every((obj) => obj.isCompleted);

      return {
        activeQuest: {
          ...state.activeQuest,
          objectives,
          status: allCompleted ? 'completed' as const : 'active' as const,
        },
      };
    }),

  completeQuest: (questId) => {
    const { activeQuest } = get();
    if (activeQuest && activeQuest.id === questId && activeQuest.status === 'completed') {
      get().addCoins(activeQuest.reward.coins);
      get().addXp(activeQuest.reward.xp);
      activeQuest.reward.items.forEach((itemId) => get().addItemToInventory(itemId));
      set({ activeQuest: null, gameMode: 'exploration' as GameMode });
    }
  },

  updatePerformanceMetrics: (metrics) =>
    set((state) => ({
      performance: { ...state.performance, ...metrics },
    })),

  setCurrentChunk: (chunkId) => set({ currentChunkId: chunkId }),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),
}));
