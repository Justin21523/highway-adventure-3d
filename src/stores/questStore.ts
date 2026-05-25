/**
 * Quest state store.
 *
 * Manages active quests, available quests, world events, and tour progress.
 * Quest generation is handled by the QuestGenerator system; this store
 * tracks logical state only.
 */

import { create } from 'zustand';
import type { EntityId, Vector3Data } from '@/types/core';
import type { Quest, ActiveQuest, Tour, GameEvent, WorldPickup, QuestObjective } from '@/types/quest';
import type { QuestCategory, QuestStatus, ObjectiveType } from '@/types/quest';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Shape of the quest store state */
interface QuestStoreState {
  /** Currently active quests (can have multiple) */
  activeQuests: ActiveQuest[];

  /** Quests available to accept (spawned by world events / NPCs) */
  availableQuests: Quest[];

  /** Active world events (road construction, sales, weather, etc.) */
  worldEvents: GameEvent[];

  /** Currently active tour (if any) */
  activeTour: Tour | null;

  /** World pickups (coins, boosts, health packs, etc.) */
  worldPickups: Map<EntityId, WorldPickup>;

  /** Quest statistics */
  stats: QuestStats;
}

/** Quest statistics tracked across sessions */
interface QuestStats {
  totalCompleted: number;
  totalFailed: number;
  totalDistanceDrifted: number;
  totalTopSpeedReached: number;
  totalPickupsCollected: number;
  categoryCompleted: Record<QuestCategory, number>;
}

/** Shape of the quest store actions */
interface QuestStoreActions {
  /* ── Active Quests ── */
  acceptQuest: (quest: Quest) => void;
  abandonQuest: (questId: string) => void;
  updateObjectiveProgress: (questId: string, objectiveId: string, amount: number) => void;
  completeQuest: (questId: string) => void;
  failQuest: (questId: string) => void;
  getActiveQuest: (questId: string) => ActiveQuest | undefined;
  getActiveQuests: () => ActiveQuest[];

  /* ── Available Quests ── */
  addAvailableQuest: (quest: Quest) => void;
  removeAvailableQuest: (questId: string) => void;
  clearAvailableQuests: () => void;

  /* ── World Events ── */
  spawnEvent: (event: GameEvent) => void;
  expireEvent: (eventId: string) => void;
  getActiveEvents: () => GameEvent[];
  getEventsNearPosition: (position: Vector3Data, radius: number) => GameEvent[];

  /* ── Tours ── */
  startTour: (tour: Tour) => void;
  completeTourWaypoint: (tourId: string, waypointId: string) => void;
  endTour: (tourId: string, completed: boolean) => void;

  /* ── Pickups ── */
  spawnPickup: (pickup: WorldPickup) => void;
  collectPickup: (pickupId: EntityId) => boolean;
  despawnPickup: (pickupId: EntityId) => void;
  getActivePickups: () => WorldPickup[];

  /* ── Statistics ── */
  addStat: (partialStats: Partial<QuestStats>) => void;
  getStats: () => QuestStats;
  resetStats: () => void;

  /* ── Helpers ── */
  getActiveQuestCount: () => number;
  getAvailableQuestCount: () => number;
  getEventsCount: () => number;
  resetQuests: () => void;
}

/* ─────────────────────────────────────────────
 * Initial State
 * ───────────────────────────────────────────── */

const initialStats: QuestStats = {
  totalCompleted: 0,
  totalFailed: 0,
  totalDistanceDrifted: 0,
  totalTopSpeedReached: 0,
  totalPickupsCollected: 0,
  categoryCompleted: {
    main: 0,
    side: 0,
    daily: 0,
    exploration: 0,
    delivery: 0,
    challenge: 0,
    tour: 0,
  },
};

/* ─────────────────────────────────────────────
 * Store
 * ───────────────────────────────────────────── */

export const useQuestStore = create<QuestStoreState & QuestStoreActions>()((set, get) => ({
  /* ── State ── */
  activeQuests: [],
  availableQuests: [],
  worldEvents: [],
  activeTour: null,
  worldPickups: new Map(),
  stats: initialStats,

  /* ── Active Quest Actions ── */

  acceptQuest: (quest) =>
    set((state) => {
      const active: ActiveQuest = {
        questId: quest.id,
        objectives: quest.objectives.map((obj) => ({ ...obj, current: 0, isCompleted: false })),
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'active' as QuestStatus,
      };

      const newAvailable = state.availableQuests.filter((q) => q.id !== quest.id);
      return {
        activeQuests: [...state.activeQuests, active],
        availableQuests: newAvailable,
      };
    }),

  abandonQuest: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests.filter((q) => q.questId !== questId),
    })),

  updateObjectiveProgress: (questId, objectiveId, amount) =>
    set((state) => ({
      activeQuests: state.activeQuests.map((quest) => {
        if (quest.questId !== questId) return quest;

        const updatedObjectives = quest.objectives.map((obj) => {
          if (obj.id !== objectiveId || obj.isCompleted) return obj;
          const newCurrent = Math.min(obj.current + amount, obj.target);
          return { ...obj, current: newCurrent, isCompleted: newCurrent >= obj.target };
        });

        const allCompleted = updatedObjectives.every((obj) => obj.isCompleted);
        return {
          ...quest,
          objectives: updatedObjectives,
          status: allCompleted ? 'completed' : 'active',
        };
      }),
    })),

  completeQuest: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests
        .filter((q) => q.questId !== questId)
        .map((quest) => {
          if (quest.questId !== questId) return quest;
          return { ...quest, status: 'completed' as QuestStatus };
        }),
    })),

  failQuest: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests
        .filter((q) => q.questId !== questId)
        .map((quest) => {
          if (quest.questId !== questId) return quest;
          return { ...quest, status: 'failed' as QuestStatus };
        }),
    })),

  getActiveQuest: (questId) => get().activeQuests.find((q) => q.questId === questId),

  getActiveQuests: () => get().activeQuests.filter((q) => q.status === 'active'),

  /* ── Available Quest Actions ── */

  addAvailableQuest: (quest) =>
    set((state) => ({
      availableQuests: [...state.availableQuests, quest],
    })),

  removeAvailableQuest: (questId) =>
    set((state) => ({
      availableQuests: state.availableQuests.filter((q) => q.id !== questId),
    })),

  clearAvailableQuests: () => set({ availableQuests: [] }),

  /* ── World Event Actions ── */

  spawnEvent: (event) =>
    set((state) => ({
      worldEvents: [...state.worldEvents, event],
    })),

  expireEvent: (eventId) =>
    set((state) => ({
      worldEvents: state.worldEvents.filter((e) => e.id !== eventId),
    })),

  getActiveEvents: () => get().worldEvents.filter((e) => e.isActive),

  getEventsNearPosition: (position, radius) => {
    const events = get().activeEvents();
    return events.filter((event) => {
      if (!event.position) return false;
      const dx = event.position.x - position.x;
      const dz = event.position.z - position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const effectiveRadius = (event.radius ?? 50) + 20;
      return dist <= effectiveRadius;
    });
  },

  /* ── Tour Actions ── */

  startTour: (tour) => set({ activeTour: { ...tour, waypoints: tour.waypoints.map((wp) => ({ ...wp, visited: false })) } }),

  completeTourWaypoint: (tourId, waypointId) =>
    set((state) => {
      const tour = state.activeTour;
      if (!tour || tour.id !== tourId) return {};

      const updatedWaypoints = tour.waypoints.map((wp) =>
        wp.id === waypointId ? { ...wp, visited: true } : wp,
      );
      const allVisited = updatedWaypoints.every((wp) => wp.visited);

      return {
        activeTour: { ...tour, waypoints: updatedWaypoints },
      };
    }),

  endTour: (tourId, completed) =>
    set((state) => {
      if (state.activeTour?.id !== tourId) return {};
      return { activeTour: completed ? null : state.activeTour };
    }),

  /* ── Pickup Actions ── */

  spawnPickup: (pickup) =>
    set((state) => {
      const newPickups = new Map(state.worldPickups);
      newPickups.set(pickup.id, pickup);
      return { worldPickups: newPickups };
    }),

  collectPickup: (pickupId) => {
    const pickup = get().worldPickups.get(pickupId);
    if (!pickup || pickup.collected) return false;

    set((state) => {
      const newPickups = new Map(state.worldPickups);
      const collected = new Map(newPickups);
      const p = collected.get(pickupId);
      if (p) {
        collected.set(pickupId, { ...p, collected: true });
      }
      return { worldPickups: collected };
    });

    return true;
  },

  despawnPickup: (pickupId) =>
    set((state) => {
      const newPickups = new Map(state.worldPickups);
      newPickups.delete(pickupId);
      return { worldPickups: newPickups };
    }),

  getActivePickups: () =>
    Array.from(get().worldPickups.values()).filter((p) => !p.collected),

  /* ── Statistics Actions ── */

  addStat: (partialStats) =>
    set((state) => {
      const newStats = { ...state.stats };

      if (partialStats.totalCompleted !== undefined) newStats.totalCompleted += partialStats.totalCompleted;
      if (partialStats.totalFailed !== undefined) newStats.totalFailed += partialStats.totalFailed;
      if (partialStats.totalDistanceDrifted !== undefined) newStats.totalDistanceDrifted += partialStats.totalDistanceDrifted;
      if (partialStats.totalTopSpeedReached !== undefined) newStats.totalTopSpeedReached = Math.max(newStats.totalTopSpeedReached, partialStats.totalTopSpeedReached);
      if (partialStats.totalPickupsCollected !== undefined) newStats.totalPickupsCollected += partialStats.totalPickupsCollected;

      if (partialStats.categoryCompleted) {
        newStats.categoryCompleted = { ...newStats.categoryCompleted };
        for (const [category, count] of Object.entries(partialStats.categoryCompleted)) {
          if (count > 0) {
            newStats.categoryCompleted[category as QuestCategory] =
              (newStats.categoryCompleted[category as QuestCategory] ?? 0) + count;
          }
        }
      }

      return { stats: newStats };
    }),

  getStats: () => get().stats,

  resetStats: () => set({ stats: { ...initialStats } }),

  /* ── Helper Actions ── */

  getActiveQuestCount: () => get().activeQuests.filter((q) => q.status === 'active').length,

  getAvailableQuestCount: () => get().availableQuests.length,

  getEventsCount: () => get().worldEvents.filter((e) => e.isActive).length,

  /* ── Reset ── */

  resetQuests: () =>
    set({
      activeQuests: [],
      availableQuests: [],
      worldEvents: [],
      activeTour: null,
      worldPickups: new Map(),
    }),
}));
