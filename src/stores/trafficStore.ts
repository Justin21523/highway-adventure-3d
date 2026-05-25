/**
 * Traffic state store.
 *
 * Manages NPC traffic vehicles, spawn configuration, and lane occupancy data.
 * Traffic AI systems read from and write to this store every frame.
 * Rendering is handled separately by the TrafficCar 3D components.
 */

import { create } from 'zustand';
import type { EntityId, Vector3Data } from '@/types/core';
import type { TrafficCar, TrafficConfig, LaneOccupancy } from '@/types/traffic';
import { TRAFFIC_CONFIG } from '@/constants/traffic';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Shape of the traffic store state */
interface TrafficStoreState {
  /** Map of active traffic car IDs to their data */
  activeCars: Map<EntityId, TrafficCar>;

  /** Current spawn configuration (may be adjusted by time of day / zone) */
  spawnConfig: TrafficConfig;

  /** Lane occupancy tracking for AI pathfinding */
  laneOccupancy: Map<string, LaneOccupancy>;

  /** Total number of traffic cars spawned this session */
  totalSpawned: number;

  /** Whether traffic is currently enabled (can be toggled by quality settings) */
  isEnabled: boolean;
}

/** Shape of the traffic store actions */
interface TrafficStoreActions {
  /* ── Car Management ── */
  spawnCar: (car: TrafficCar) => void;
  despawnCar: (carId: EntityId) => void;
  updateCarState: (carId: EntityId, partialState: Partial<TrafficCar>) => boolean;
  updateCarPosition: (carId: EntityId, position: Vector3Data) => void;
  updateCarSpeed: (carId: EntityId, speed: number) => void;

  /* ── Batch Operations ── */
  despawnAllCars: () => void;
  despawnCarsBeyond: (playerZ: number, despawnDistance: number) => number;

  /* ── Configuration ── */
  setSpawnConfig: (partialConfig: Partial<TrafficConfig>) => void;
  setTrafficEnabled: (enabled: boolean) => void;

  /* ── Lane Management ── */
  updateLaneOccupancy: (edgeId: string, laneIndex: number, carIds: EntityId[], averageSpeed: number) => void;
  clearLaneOccupancy: (edgeId: string, laneIndex: number) => void;

  /* ── Helpers ── */
  getActiveCarCount: () => number;
  getCarById: (carId: EntityId) => TrafficCar | undefined;
  getCarsInLane: (edgeId: string, laneIndex: number) => TrafficCar[];
  resetTraffic: () => void;
}

/* ─────────────────────────────────────────────
 * Initial State
 * ───────────────────────────────────────────── */

const initialSpawnConfig: TrafficConfig = {
  maxCars: TRAFFIC_CONFIG.maxCars,
  spawnDistance: TRAFFIC_CONFIG.spawnDistance,
  despawnDistance: TRAFFIC_CONFIG.despawnDistance,
  minSpawnInterval: TRAFFIC_CONFIG.minSpawnInterval,
  maxSpawnInterval: TRAFFIC_CONFIG.maxSpawnInterval,
  baseDensity: TRAFFIC_CONFIG.baseDensity,
  highwayDensityMultiplier: TRAFFIC_CONFIG.highwayDensityMultiplier,
  cityDensityMultiplier: TRAFFIC_CONFIG.cityDensityMultiplier,
  nightDensityMultiplier: TRAFFIC_CONFIG.nightDensityMultiplier,
  minSpeedKmh: TRAFFIC_CONFIG.minSpeedKmh,
  maxSpeedKmh: TRAFFIC_CONFIG.maxSpeedKmh,
  laneChangeProbability: TRAFFIC_CONFIG.laneChangeProbability,
  laneChangeDuration: TRAFFIC_CONFIG.laneChangeDuration,
  followingDistance: TRAFFIC_CONFIG.followingDistance,
  brakingDeceleration: TRAFFIC_CONFIG.brakingDeceleration,
  accelerationRate: TRAFFIC_CONFIG.accelerationRate,
};

/* ─────────────────────────────────────────────
 * Store
 * ───────────────────────────────────────────── */

export const useTrafficStore = create<TrafficStoreState & TrafficStoreActions>()((set, get) => ({
  /* ── State ── */
  activeCars: new Map(),
  spawnConfig: initialSpawnConfig,
  laneOccupancy: new Map(),
  totalSpawned: 0,
  isEnabled: true,

  /* ── Car Management Actions ── */

  spawnCar: (car) =>
    set((state) => {
      const newCars = new Map(state.activeCars);
      newCars.set(car.id, car);
      return {
        activeCars: newCars,
        totalSpawned: state.totalSpawned + 1,
      };
    }),

  despawnCar: (carId) =>
    set((state) => {
      const newCars = new Map(state.activeCars);
      newCars.delete(carId);
      return { activeCars: newCars };
    }),

  updateCarState: (carId, partialState) => {
    set((state) => {
      const car = state.activeCars.get(carId);
      if (!car) return {};
      const newCars = new Map(state.activeCars);
      newCars.set(carId, { ...car, ...partialState });
      return { activeCars: newCars };
    });
    return true;
  },

  updateCarPosition: (carId, position) => {
    set((state) => {
      const car = state.activeCars.get(carId);
      if (!car) return {};
      const newCars = new Map(state.activeCars);
      newCars.set(carId, { ...car, position });
      return { activeCars: newCars };
    });
  },

  updateCarSpeed: (carId, speed) => {
    set((state) => {
      const car = state.activeCars.get(carId);
      if (!car) return {};
      const newCars = new Map(state.activeCars);
      newCars.set(carId, { ...car, speed, targetSpeed: speed });
      return { activeCars: newCars };
    });
  },

  /* ── Batch Operations ── */

  despawnAllCars: () => set({ activeCars: new Map() }),

  despawnCarsBeyond: (playerZ, despawnDistance) =>
    set((state) => {
      const threshold = playerZ - despawnDistance;
      const newCars = new Map(state.activeCars);
      let removed = 0;

      for (const [id, car] of newCars) {
        if (car.position.z < threshold) {
          newCars.delete(id);
          removed++;
        }
      }

      return removed > 0 ? { activeCars: newCars } : {};
    }),

  /* ── Configuration Actions ── */

  setSpawnConfig: (partialConfig) =>
    set((state) => ({
      spawnConfig: { ...state.spawnConfig, ...partialConfig },
    })),

  setTrafficEnabled: (enabled) => set({ isEnabled: enabled }),

  /* ── Lane Management Actions ── */

  updateLaneOccupancy: (edgeId, laneIndex, carIds, averageSpeed) =>
    set((state) => {
      const key = `${edgeId}_${laneIndex}`;
      const newOccupancy = new Map(state.laneOccupancy);
      newOccupancy.set(key, {
        edgeId,
        laneIndex,
        carIds,
        averageSpeed,
        isBlocked: carIds.length > 2 && averageSpeed < 20,
      });
      return { laneOccupancy: newOccupancy };
    }),

  clearLaneOccupancy: (edgeId, laneIndex) =>
    set((state) => {
      const newOccupancy = new Map(state.laneOccupancy);
      newOccupancy.delete(`${edgeId}_${laneIndex}`);
      return { laneOccupancy: newOccupancy };
    }),

  /* ── Helper Actions ── */

  getActiveCarCount: () => get().activeCars.size,

  getCarById: (carId) => get().activeCars.get(carId),

  getCarsInLane: (edgeId, laneIndex) => {
    const key = `${edgeId}_${laneIndex}`;
    const lane = get().laneOccupancy.get(key);
    if (!lane) return [];

    return lane.carIds
      .map((id) => get().activeCars.get(id))
      .filter((car): car is TrafficCar => car !== undefined);
  },

  /* ── Reset ── */

  resetTraffic: () =>
    set({
      activeCars: new Map(),
      laneOccupancy: new Map(),
      totalSpawned: 0,
    }),
}));
