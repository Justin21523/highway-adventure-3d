/**
 * VehiclePhysics — Player vehicle physics engine.
 *
 * Handles acceleration, braking, steering, drifting, collision response,
 * and vehicle state management. All physics calculations use delta time
 * for frame-rate independence.
 *
 * Reads from gameStore for vehicle state, writes back updates every frame.
 */

import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import type { VehicleState } from '@/types/core';
import { useWorldStore } from '@/stores/worldStore';
import { useQuestStore } from '@/stores/questStore';
import { GameRuntime } from './GameRuntime';
import { PHYSICS } from '@/constants/physics';
import type { GameEventType } from './GameRuntime';
import { DRIVE_CHUNK_SIZE, sampleDriveSurface } from '@/utils/driveSurface';

/* ─────────────────────────────────────────────
 * VehiclePhysics Singleton
 * ───────────────────────────────────────────── */

export class VehiclePhysics {
  private static instance: VehiclePhysics | null = null;

  /** Reusable vectors for calculations */
  private _velocity = new THREE.Vector3();
  private _acceleration = new THREE.Vector3();

  /** Time accumulators for periodic tasks */
  private fuelTimer = 0;
  private xpTimer = 0;

  /** Whether the system is initialized */
  private isInitialized = false;

  /** Accumulated world-space heading angle (radians, Y-axis rotation) */
  private headingAngle = 0;

  /** Smoothed Y for player to avoid frame-to-frame Y jitter on the ground */
  private smoothedY = 0.5;

  /** Track drift state */
  private driftAngle = 0;
  private driftStartTime = 0;

  /** Track top speed for the current session */
  private sessionTopSpeed = 0;

  private constructor() {}

  static getInstance(): VehiclePhysics {
    if (!VehiclePhysics.instance) {
      VehiclePhysics.instance = new VehiclePhysics();
    }
    return VehiclePhysics.instance;
  }

  /* ── Initialization ── */

  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  /* ── Frame Update ── */

  update(delta: number): void {
    if (!this.isInitialized) return;

    const gameStore = useGameStore.getState();
    const vehicle = gameStore.vehicle;
    const gameMode = gameStore.gameMode;

    // Skip physics if in shop, garage, or pause mode
    if (gameMode === 'shop' || gameMode === 'garage' || gameMode === 'paused') return;

    // Apply physics
    this.updateAcceleration(vehicle, delta);
    this.updateSteering(vehicle, delta);
    this.updateDrifting(vehicle, delta);
    this.updateSpeedBoost(vehicle, delta);
    this.updateCollisionResponse(vehicle, delta);

    // Update player position in world store
    this.updatePlayerPosition(vehicle, delta);

    // Periodic tasks
    this.fuelTimer += delta;
    if (this.fuelTimer >= 1) {
      this.updateFuelTimer(vehicle);
      this.fuelTimer = 0;
    }

    this.xpTimer += delta;
    if (this.xpTimer >= 5) {
      this.updateXpTimer(vehicle);
      this.xpTimer = 0;
    }

    // Track session top speed
    const speedKmh = vehicle.speed;
    if (speedKmh > this.sessionTopSpeed) {
      this.sessionTopSpeed = speedKmh;
    }
  }

  /* ── Acceleration & Braking ── */

  /** Update vehicle acceleration */
  private updateAcceleration(vehicle: VehicleState, delta: number): void {
    const gameStore = useGameStore.getState();
    const controls = gameStore.controls;

    // Acceleration (scaled by the equipped vehicle's acceleration multiplier)
    if (controls.throttle) {
      const accelRate = PHYSICS.ACCELERATION * (vehicle.accelMult ?? 1) * (vehicle.isBoosting ? 1.5 : 1);
      vehicle.speed = Math.min(vehicle.speed + accelRate * delta, vehicle.maxSpeed);
    }

    // Braking
    if (controls.brake) {
      vehicle.speed = Math.max(vehicle.speed - PHYSICS.BRAKING * delta, 0);
    }

    // Natural deceleration (friction)
    if (!controls.throttle && !controls.brake) {
      vehicle.speed = Math.max(vehicle.speed - PHYSICS.FRICTION * delta, 0);
    }

    // Fuel consumption
    if (controls.throttle && vehicle.fuel > 0) {
      vehicle.fuel = Math.max(0, vehicle.fuel - PHYSICS.FUEL_CONSUMPTION * delta);
    }

    // No fuel = no acceleration
    if (vehicle.fuel <= 0 && controls.throttle) {
      vehicle.speed = Math.max(vehicle.speed - PHYSICS.NO_FUEL_DECEL * delta, 0);
    }

    // Write back to store
    gameStore.updateVehicleState({ speed: vehicle.speed, fuel: vehicle.fuel });
  }

  /* ── Steering ── */

  /** Update vehicle steering */
  private updateSteering(vehicle: VehicleState, delta: number): void {
    const gameStore = useGameStore.getState();
    const controls = gameStore.controls;

    // Steering only works when moving
    if (vehicle.speed < 1) return;

    // Steering grows with speed but is dampened at high speeds to prevent oversteer.
    const speedFactor = Math.min(vehicle.speed / 30, 1);
    const highSpeedDamp = vehicle.speed > 90 ? 0.55 : 1.0;
    const steerSpeed = PHYSICS.STEER_SPEED * (vehicle.handlingMult ?? 1) * speedFactor * highSpeedDamp;
    const steerAmount = steerSpeed * delta;
    const returnAmount = steerAmount * PHYSICS.STEER_RETURN_MULTIPLIER;

    if (controls.steerLeft) {
      vehicle.steerAngle = Math.min(vehicle.steerAngle + steerAmount, PHYSICS.MAX_STEER_ANGLE);
    } else if (controls.steerRight) {
      vehicle.steerAngle = Math.max(vehicle.steerAngle - steerAmount, -PHYSICS.MAX_STEER_ANGLE);
    } else {
      // Return to center
      if (vehicle.steerAngle > 0) {
        vehicle.steerAngle = Math.max(0, vehicle.steerAngle - returnAmount);
      } else {
        vehicle.steerAngle = Math.min(0, vehicle.steerAngle + returnAmount);
      }
    }

    // Write back to store
    gameStore.updateVehicleState({ steerAngle: vehicle.steerAngle });
  }

  /* ── Drifting ── */

  /** Update vehicle drifting behavior */
  private updateDrifting(vehicle: VehicleState, delta: number): void {
    const gameStore = useGameStore.getState();
    const controls = gameStore.controls;

    // Drifting: brake + steer while at speed
    const isDrifting = controls.brake && controls.steerLeft && vehicle.speed > PHYSICS.DRIFT_SPEED_THRESHOLD;
    const isDriftingRight = controls.brake && controls.steerRight && vehicle.speed > PHYSICS.DRIFT_SPEED_THRESHOLD;

    if (isDrifting || isDriftingRight) {
      if (!vehicle.isDrifting) {
        vehicle.isDrifting = true;
        this.driftStartTime = Date.now();
        gameStore.updateVehicleState({ isDrifting: true });
      }

      // Increase steer angle during drift
      const driftSteerMultiplier = 1.5;
      const maxDriftAngle = PHYSICS.MAX_STEER_ANGLE * driftSteerMultiplier;
      if (isDrifting) {
        vehicle.steerAngle = Math.min(vehicle.steerAngle + PHYSICS.STEER_SPEED * driftSteerMultiplier * delta, maxDriftAngle);
      } else {
        vehicle.steerAngle = Math.max(vehicle.steerAngle - PHYSICS.STEER_SPEED * driftSteerMultiplier * delta, -maxDriftAngle);
      }

      // Reduce speed slightly during drift
      vehicle.speed = Math.max(vehicle.speed - PHYSICS.DRIFT_DECEL * delta, 10);

      // Track drift angle
      this.driftAngle = Math.abs(vehicle.steerAngle);
    } else {
      if (vehicle.isDrifting) {
        // End drift
        const driftDuration = (Date.now() - this.driftStartTime) / 1000;
        const driftScore = this.calculateDriftScore(driftDuration);

        // Award XP for drifting
        useGameStore.getState().addXp(driftScore);

        // Update quest progress
        useQuestStore.getState().addStat({ totalDistanceDrifted: driftScore });

        vehicle.isDrifting = false;
        this.driftAngle = 0;
        gameStore.updateVehicleState({ isDrifting: false });
      }
    }
  }

  /** Calculate drift score based on duration and speed */
  private calculateDriftScore(duration: number): number {
    const gameStore = useGameStore.getState();
    const baseScore = Math.floor(duration * 10);
    const speedMultiplier = gameStore.vehicle.speed / 50;
    return Math.floor(baseScore * (1 + speedMultiplier));
  }

  /* ── Speed Boost ── */

  /** Update speed boost state */
  private updateSpeedBoost(vehicle: VehicleState, delta: number): void {
    const gameStore = useGameStore.getState();

    if (!vehicle.isBoosting) return;

    vehicle.boostTimer -= delta;

    if (vehicle.boostTimer <= 0) {
      vehicle.isBoosting = false;
      vehicle.boostTimer = 0;
      gameStore.updateVehicleState({ isBoosting: false, boostTimer: 0 });
    } else {
      gameStore.updateVehicleState({ boostTimer: vehicle.boostTimer });
    }
  }

  /* ── Fuel Management ── */

  /** Update fuel consumption timer */
  private updateFuelTimer(vehicle: VehicleState): void {
    // Idle fuel consumption
    const gameStore = useGameStore.getState();
    if (!gameStore.controls.throttle && vehicle.fuel > 0) {
      vehicle.fuel = Math.max(0, vehicle.fuel - PHYSICS.IDLE_FUEL_CONSUMPTION);
      gameStore.updateVehicleState({ fuel: vehicle.fuel });
    }
  }

  /* ── Collision Response ── */

  /** Update collision response */
  private updateCollisionResponse(vehicle: VehicleState, delta: number): void {
    const gameStore = useGameStore.getState();

    // Check collision with traffic
    // Collision detection is handled by the CollisionSystem
    // This method just applies physics response

    // If health is 0, vehicle is disabled
    if (vehicle.health <= 0) {
      vehicle.speed = 0;
      vehicle.isBoosting = false;
      vehicle.isDrifting = false;
      gameStore.updateVehicleState({ speed: 0, isBoosting: false, isDrifting: false });
    }
  }

  /* ── Player Position Update ── */

  /** Update player position in world store based on vehicle state */
  private updatePlayerPosition(vehicle: VehicleState, delta: number): void {
    const worldStore = useWorldStore.getState();
    const gameStore = useGameStore.getState();
    const currentPos = worldStore.playerPosition;

    const speedMs = vehicle.speed / 3.6; // km/h → m/s
    const moveDistance = speedMs * delta;

    // Accumulate heading from steering input.
    // Chase camera right vector = world -X (camera behind car, looking +Z).
    // So positive Y rotation (heading increases) → car front → world +X → screen LEFT = left turn.
    // steerLeft → positive steerAngle → positive steerFactor → heading increases → left turn. ✓
    const steerFactor = vehicle.steerAngle / PHYSICS.MAX_STEER_ANGLE;
    const speedGain = Math.min(speedMs / 22, 1);
    const turnAmount = steerFactor * PHYSICS.TURN_AMOUNT_SCALE * speedGain * delta;
    this.headingAngle += turnAmount;

    // Car front faces +Z at heading=0. Movement direction = (sin, 0, cos).
    let newX = currentPos.x + Math.sin(this.headingAngle) * moveDistance;
    let newZ = currentPos.z + Math.cos(this.headingAngle) * moveDistance;

    if (!Number.isFinite(newX) || !Number.isFinite(newZ) || !Number.isFinite(this.headingAngle)) {
      this.headingAngle = 0;
      newX = 4.35;
      newZ = Number.isFinite(currentPos.z) ? currentPos.z : 0;
      vehicle.speed = 0;
      gameStore.updateVehicleState({ speed: 0, steerAngle: 0, headingAngle: 0 });
    }

    // Lateral world bounds — generous so the player can freely roam across every
    // district (central highway corridor → commercial / residential bands →
    // countryside). The world is streamed in 2D (HighwayNetworkSystem / ChunkStreamer
    // load a square area around the player), so there is no unrendered space to fall
    // into. We only clamp position at the far edge; we never kill momentum or force a
    // heading change — that previously made the car feel like it hit an invisible wall
    // and got stuck.
    const MAX_DRIVE_X = 700; // ≈ chunk cx ±7: covers highway, city, suburb, countryside
    newX = THREE.MathUtils.clamp(newX, -MAX_DRIVE_X, MAX_DRIVE_X);

    // Only the central highway corridor has elevated decks / ramps. Every other
    // district is flat, drivable ground, so the car can never snag on phantom
    // elevated geometry once it leaves the highway.
    const HIGHWAY_CORRIDOR_HALF = 60; // meters — captures the deck + on/off ramps
    const surface = Math.abs(newX) <= HIGHWAY_CORRIDOR_HALF
      ? sampleDriveSurface(newX, newZ, worldStore.isElevated)
      : { playerY: 0.5, elevation: 0, isElevated: false };

    // Smooth Y transitions so ramps and surface changes don't snap the camera/vehicle.
    // - Small differences (< 0.1m): snap immediately. Prevents tiny floating-point
    //   ripple from the surface sampler from registering as motion frame-to-frame.
    // - Medium differences (0.1–2m): fast ease (used on shallow ramps).
    // - Big differences (>2m): slower ease so big jumps don't snap the camera.
    const yDelta = surface.playerY - this.smoothedY;
    const absDelta = Math.abs(yDelta);
    if (absDelta < 0.1) {
      this.smoothedY = surface.playerY;
    } else {
      const easing = absDelta > 2 ? 1 - Math.exp(-7 * delta) : 1 - Math.exp(-12 * delta);
      this.smoothedY += yDelta * easing;
    }

    worldStore.setPlayerPosition({ x: newX, y: this.smoothedY, z: newZ });
    worldStore.setElevation(surface.elevation, surface.isElevated);
    gameStore.setPlayerPosition({ x: newX, y: this.smoothedY, z: newZ });

    // Expose heading to game store so PlayerVehicle can rotate the mesh correctly
    gameStore.updateVehicleState({ headingAngle: this.headingAngle });

    // Update current chunk ID
    const chunkX = Math.floor(newX / DRIVE_CHUNK_SIZE);
    const chunkZ = Math.floor(newZ / DRIVE_CHUNK_SIZE);
    const chunkId = `${chunkX}_${chunkZ}`;
    if (worldStore.currentChunkId !== chunkId) {
      worldStore.setCurrentChunk(chunkId);
    }
  }

  /* ── XP Generation ── */

  /** Update XP timer for distance-based XP */
  private updateXpTimer(vehicle: VehicleState): void {
    if (vehicle.speed < 5) return;

    // Award XP for driving
    const xpPerSecond = Math.floor(vehicle.speed / 20);
    useGameStore.getState().addXp(xpPerSecond);

    // Update quest progress for distance
    useQuestStore.getState().addStat({ totalDistanceDrifted: vehicle.speed / 3.6 * 5 });
  }

  /* ── Reset ── */

  /** Reset vehicle to initial state */
  reset(): void {
    const gameStore = useGameStore.getState();
    gameStore.updateVehicleState({
      speed: 0,
      fuel: 100,
      health: 100,
      isDrifting: false,
      isBoosting: false,
      boostTimer: 0,
      steerAngle: 0,
    });

    this.headingAngle = 0;
    this.smoothedY = 0.5;
    this.driftAngle = 0;
    this.driftStartTime = 0;
    this.sessionTopSpeed = 0;
  }

  /* ── Cleanup ── */

  dispose(): void {
    VehiclePhysics.instance = null;
  }
}
