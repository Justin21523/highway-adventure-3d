/**
 * TrafficAI — NPC vehicle AI system.
 *
 * Manages spawning, updating, and despawning of NPC traffic vehicles.
 * Each traffic car has a state machine (cruising, laneChanging, braking, etc.)
 * and makes decisions based on lane occupancy, following distance, and
 * player position.
 *
 * Reads from trafficStore for state, writes back updates every frame.
 */

import * as THREE from 'three';
import { useTrafficStore } from '@/stores/trafficStore';
import { useWorldStore } from '@/stores/worldStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { GameRuntime } from './GameRuntime';
import { TRAFFIC_CONFIG, TRAFFIC_VEHICLE_TEMPLATES, TRAFFIC_TOTAL_WEIGHT } from '@/constants/traffic';
import type { TrafficCar, TrafficState as TrafficCarState } from '@/types/traffic';
import type { VehicleCategory } from '@/types/vehicle';
import type { GameEventType } from './GameRuntime';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Internal traffic car with extra runtime data */
interface TrafficCarInternal {
  car: TrafficCar;
  spawnTime: number;
  laneChangeTimer: number;
  brakeTimer: number;
}

/* ─────────────────────────────────────────────
 * Seeded Random Helper
 * ───────────────────────────────────────────── */

/** Simple seeded random for deterministic traffic patterns */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(array: T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/* ─────────────────────────────────────────────
 * TrafficAI Singleton
 * ───────────────────────────────────────────── */

export class TrafficAI {
  private static instance: TrafficAI | null = null;

  /** Internal car data (extends store data with runtime timers) */
  private cars = new Map<string, TrafficCarInternal>();

  /** Reusable vectors for calculations */
  private _playerPos = new THREE.Vector3();
  private _carPos = new THREE.Vector3();

  /** Time since last spawn attempt */
  private spawnAccumulator = 0;

  /** Current time-of-day multiplier for density */
  private densityMultiplier = 1.0;

  /** Whether the system is initialized */
  private isInitialized = false;

  private constructor() {}

  static getInstance(): TrafficAI {
    if (!TrafficAI.instance) {
      TrafficAI.instance = new TrafficAI();
    }
    return TrafficAI.instance;
  }

  /* ── Initialization ── */

  init(): void {
    if (this.isInitialized) return;

    // Seed based on current time for variety
    this.isInitialized = true;

    // Initial spawn
    this.spawnInitialTraffic();
  }

  /** Re-initialize (e.g., after reset) */
  reset(): void {
    this.cars.clear();
    this.spawnAccumulator = 0;
    this.densityMultiplier = 1.0;
    useTrafficStore.getState().despawnAllCars();
  }

  /* ── Frame Update ── */

  update(delta: number): void {
    if (!this.isInitialized) return;

    const store = useTrafficStore.getState();

    // Skip if traffic is disabled
    if (!store.isEnabled) {
      if (store.getActiveCarCount() > 0) {
        store.despawnAllCars();
      }
      return;
    }

    // Check quality settings
    const maxCars = store.spawnConfig.maxCars;
    if (store.getActiveCarCount() >= maxCars) return;

    // Update density multiplier based on time (simplified day/night)
    this.updateDensityMultiplier(delta);

    // Spawn new cars
    this.spawnAccumulator += delta;
    const spawnInterval = this.getSpawnInterval();

    while (this.spawnAccumulator >= spawnInterval && store.getActiveCarCount() < maxCars) {
      this.spawnCar();
      this.spawnAccumulator = 0;
    }

    // Update existing cars
    this.updateCars(delta);

    // Despawn cars behind player
    store.despawnCarsBeyond(this._playerPos.z, store.spawnConfig.despawnDistance);

    // Update performance metrics
    usePerformanceStore.getState().setActiveTrafficCars(store.getActiveCarCount());
  }

  /* ── Traffic Spawning ── */

  /** Spawn initial batch of traffic cars */
  private spawnInitialTraffic(): void {
    const store = useTrafficStore.getState();
    const initialCount = Math.floor(store.spawnConfig.maxCars * 0.4);

    for (let i = 0; i < initialCount; i++) {
      this.spawnCar();
    }
  }

  /** Spawn a single traffic car */
  private spawnCar(): void {
    const store = useTrafficStore.getState();
    const playerZ = this._playerPos.z;

    // Determine spawn side (ahead or behind)
    const spawnAhead = Math.random() > 0.2; // 80% spawn ahead
    const spawnZ = spawnAhead
      ? playerZ + store.spawnConfig.spawnDistance * (0.5 + Math.random() * 0.5)
      : playerZ - store.spawnConfig.despawnDistance * (0.3 + Math.random() * 0.3);

    // Select vehicle template using weighted random
    const template = this.selectVehicleTemplate();
    const color = template.colors[Math.floor(Math.random() * template.colors.length)];

    // Select lane
    const laneIndex = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    const laneX = laneIndex * 4; // 4m per lane

    // Speed
    const speedRange = template.speedRange;
    const speedKmh = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);

    // Create car data
    const car: TrafficCar = {
      id: `traffic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category: template.category,
      color,
      position: { x: laneX, y: 0.5, z: spawnZ },
      rotation: 0,
      speed: speedKmh / 3.6, // Convert to m/s
      targetSpeed: speedKmh / 3.6,
      maxSpeed: speedRange[1] / 3.6,
      laneIndex,
      targetLaneIndex: laneIndex,
      laneChangeProgress: 0,
      state: 'cruising' as TrafficCarState,
      currentEdgeId: null,
      distanceAlongEdge: 0,
      direction: 'forward' as const,
      turnSignalLeft: false,
      turnSignalRight: false,
      brakeLightsOn: false,
      headlightsOn: false,
      bodyLength: template.bodyLength,
      bodyWidth: template.bodyWidth,
      bodyHeight: template.bodyHeight,
      cabinHeight: template.cabinHeight,
    };

    // Store in internal map
    this.cars.set(car.id, {
      car,
      spawnTime: Date.now(),
      laneChangeTimer: Math.random() * 5,
      brakeTimer: 0,
    });

    // Store in Zustand store
    useTrafficStore.getState().spawnCar(car);
  }

  /** Select a vehicle template based on weights */
  private selectVehicleTemplate(): typeof TRAFFIC_VEHICLE_TEMPLATES[0] {
    const roll = Math.random() * TRAFFIC_TOTAL_WEIGHT;
    let cumulative = 0;

    for (const template of TRAFFIC_VEHICLE_TEMPLATES) {
      cumulative += template.weight;
      if (roll <= cumulative) {
        return template;
      }
    }

    return TRAFFIC_VEHICLE_TEMPLATES[0];
  }

  /* ── Traffic Update ── */

  /** Update all active traffic cars */
  private updateCars(delta: number): void {
    const store = useTrafficStore.getState();
    const playerPos = useWorldStore.getState().playerPosition;
    this._playerPos.set(playerPos.x, playerPos.y, playerPos.z);

    for (const [id, internal] of this.cars) {
      const car = internal.car;

      // Skip if already despawned from store
      if (!store.activeCars.has(id)) continue;

      // Update AI state
      this.updateCarAI(car, internal, delta, playerPos);

      // Apply movement
      this.applyCarMovement(car, delta);

      // Update store
      useTrafficStore.getState().updateCarPosition(id, car.position);
      useTrafficStore.getState().updateCarSpeed(id, car.speed * 3.6); // Store in km/h
    }
  }

  /** Update a single car's AI behavior */
  private updateCarAI(car: TrafficCar, internal: TrafficCarInternal, delta: number, playerPos: typeof import('@/types/core').Vector3Data): void {
    const distToPlayer = Math.sqrt(
      Math.pow(car.position.x - playerPos.x, 2) +
      Math.pow(car.position.z - playerPos.z, 2),
    );

    // State machine
    switch (car.state) {
      case 'cruising':
        this.updateCruising(car, internal, delta, distToPlayer);
        break;
      case 'laneChanging':
        this.updateLaneChanging(car, internal, delta);
        break;
      case 'braking':
        this.updateBraking(car, internal, delta, distToPlayer);
        break;
      default:
        car.state = 'cruising';
        this.updateCruising(car, internal, delta, distToPlayer);
    }
  }

  /** Update cruising behavior */
  private updateCruising(car: TrafficCar, internal: TrafficCarInternal, delta: number, distToPlayer: number): void {
    const config = TRAFFIC_CONFIG;

    // Check if there's a car ahead that's too close
    const carAhead = this.findCarAhead(car);
    if (carAhead && carAhead.distance < config.followingDistance) {
      car.state = 'braking';
      internal.brakeTimer = 0;
      return;
    }

    // Random lane change
    internal.laneChangeTimer -= delta;
    if (internal.laneChangeTimer <= 0 && Math.random() < config.laneChangeProbability) {
      this.tryLaneChange(car);
      internal.laneChangeTimer = config.laneChangeDuration + Math.random() * 3;
    }

    // Smoothly approach target speed
    const speedDiff = car.targetSpeed - car.speed;
    car.speed += speedDiff * delta * config.accelerationRate;
  }

  /** Update lane changing behavior */
  private updateLaneChanging(car: TrafficCar, internal: TrafficCarInternal, delta: number): void {
    car.laneChangeProgress += delta / TRAFFIC_CONFIG.laneChangeDuration;

    if (car.laneChangeProgress >= 1) {
      car.laneChangeProgress = 0;
      car.laneIndex = car.targetLaneIndex;
      car.state = 'cruising';
    }
  }

  /** Update braking behavior */
  private updateBraking(car: TrafficCar, internal: TrafficCarInternal, delta: number, distToPlayer: number): void {
    const config = TRAFFIC_CONFIG;
    internal.brakeTimer += delta;

    // Brake deceleration
    car.speed = Math.max(0, car.speed - config.brakingDeceleration * delta);
    car.brakeLightsOn = true;

    // Resume cruising when stopped or timer expires
    if (internal.brakeTimer > 2 || car.speed < 1) {
      car.state = 'cruising';
      car.brakeLightsOn = false;
    }
  }

  /** Find the nearest car ahead of this car */
  private findCarAhead(car: TrafficCar): { distance: number; carId: string } | null {
    let closest: { distance: number; carId: string } | null = null;

    for (const [id, internal] of this.cars) {
      if (id === car.id) continue;

      const other = internal.car;
      const dz = other.position.z - car.position.z;

      // Only consider cars in the same lane and ahead
      if (other.laneIndex === car.laneIndex && dz > 0 && dz < 50) {
        if (!closest || dz < closest.distance) {
          closest = { distance: dz, carId: id };
        }
      }
    }

    return closest;
  }

  /** Attempt to change lanes */
  private tryLaneChange(car: TrafficCar): void {
    const directions = [-1, 1];
    const dir = directions[Math.floor(Math.random() * 2)];
    const newLane = car.laneIndex + dir;

    // Clamp to valid lane range
    if (newLane < -1 || newLane > 1) return;

    // Check if target lane is clear
    const targetX = newLane * 4;
    const isClear = !this.isLaneBlocked(car.position.z, targetX, 8);

    if (isClear) {
      car.targetLaneIndex = newLane;
      car.state = 'laneChanging';
      car.laneChangeProgress = 0;
      car.turnSignalLeft = dir < 0;
      car.turnSignalRight = dir > 0;
    }
  }

  /** Check if a lane position is blocked by another car */
  private isLaneBlocked(z: number, x: number, radius: number): boolean {
    for (const [, internal] of this.cars) {
      const other = internal.car;
      const dx = Math.abs(other.position.x - x);
      const dz = Math.abs(other.position.z - z);
      if (dx < 2.5 && dz < radius) return true;
    }
    return false;
  }

  /** Apply movement to a car based on its speed */
  private applyCarMovement(car: TrafficCar, delta: number): void {
    // Move along Z axis (forward direction)
    car.position.z -= car.speed * delta;

    // Smooth lane transition
    if (car.state === 'laneChanging') {
      const targetX = car.targetLaneIndex * 4;
      const progress = car.laneChangeProgress;
      // Ease in-out for smooth transition
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const currentX = car.laneIndex * 4;
      car.position.x = currentX + (targetX - currentX) * eased;
    } else {
      car.position.x = car.laneIndex * 4;
    }
  }

  /* ── Density Management ── */

  /** Update density multiplier based on simulated time of day */
  private updateDensityMultiplier(delta: number): void {
    // Simulate a 10-minute day cycle
    const dayProgress = (Date.now() % 600000) / 600000;
    const hour = dayProgress * 24;

    // Higher density during "daytime" (6-22), lower at night
    if (hour >= 6 && hour < 22) {
      this.densityMultiplier = 1.0;
    } else if (hour >= 22 && hour < 24) {
      this.densityMultiplier = 0.5;
    } else {
      this.densityMultiplier = 0.3;
    }
  }

  /** Get the current spawn interval based on density */
  private getSpawnInterval(): number {
    const config = TRAFFIC_CONFIG;
    const baseInterval = config.minSpawnInterval +
      (config.maxSpawnInterval - config.minSpawnInterval) * (1 - config.baseDensity);

    return baseInterval / this.densityMultiplier;
  }

  /* ── Cleanup ── */

  dispose(): void {
    this.cars.clear();
    TrafficAI.instance = null;
  }
}
