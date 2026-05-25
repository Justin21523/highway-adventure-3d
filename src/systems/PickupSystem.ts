/**
 * PickupSystem — World pickup management.
 *
 * Manages the lifecycle of world pickups (coins, speed boosts, items).
 * Handles spawning, respawning, and visual representation of pickups.
 *
 * Note: This system focuses on the game logic side. Visual rendering
 * is handled by the PickupObjects component.
 */

import * as THREE from 'three';
import { useQuestStore } from '@/stores/questStore';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { GameRuntime } from './GameRuntime';
import { WORLD } from '@/constants/world';
import type { WorldPickup, PickupType } from '@/types/quest';
import type { GameEventType } from './GameRuntime';

/* ─────────────────────────────────────────────
 * PickupSystem Singleton
 * ───────────────────────────────────────────── */

export class PickupSystem {
  private static instance: PickupSystem | null = null;

  /** Reusable vectors for distance calculations */
  private _playerPos = new THREE.Vector3();
  private _pickupPos = new THREE.Vector3();

  /** Time accumulator for periodic tasks */
  private respawnTimer = 0;

  /** Whether the system is initialized */
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PickupSystem {
    if (!PickupSystem.instance) {
      PickupSystem.instance = new PickupSystem();
    }
    return PickupSystem.instance;
  }

  /* ── Initialization ── */

  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  /* ── Frame Update ── */

  update(delta: number): void {
    if (!this.isInitialized) return;

    this.respawnTimer += delta;
    if (this.respawnTimer >= 5) {
      this.processPickupRespawns();
      this.respawnTimer = 0;
    }
  }

  /* ── Pickup Collection ── */

  /**
   * Check if the player has collected any nearby pickups.
   * Called from QuestSystem to handle collection logic.
   */
  checkCollection(): boolean {
    const questStore = useQuestStore.getState();
    const playerPos = useWorldStore.getState().playerPosition;
    this._playerPos.set(playerPos.x, playerPos.y, playerPos.z);

    const activePickups = questStore.getActivePickups();
    let anyCollected = false;

    for (const pickup of activePickups) {
      this._pickupPos.set(pickup.position.x, pickup.position.y, pickup.position.z);
      const dist = this._playerPos.distanceTo(this._pickupPos);

      const collectRadius = this.getCollectRadius(pickup.type);

      if (dist < collectRadius) {
        this.collectPickup(pickup);
        anyCollected = true;
      }
    }

    return anyCollected;
  }

  /** Collect a pickup */
  private collectPickup(pickup: WorldPickup): void {
    const questStore = useQuestStore.getState();
    const gameStore = useGameStore.getState();

    // Mark as collected
    questStore.collectPickup(pickup.id);

    // Apply rewards
    switch (pickup.type) {
      case 'coin':
        gameStore.addCoins(pickup.value);
        GameRuntime.getInstance().dispatchEvent({
          type: 'coin_collected' as GameEventType,
          timestamp: Date.now(),
          data: { amount: pickup.value },
        });
        questStore.addStat({ totalPickupsCollected: 1 });
        break;

      case 'speedBoost':
        gameStore.updateVehicleState({ isBoosting: true });
        break;

      case 'item':
        // Add to inventory
        if (pickup.itemId) {
          gameStore.addItemToInventory(pickup.itemId, 1);
        }
        break;

      case 'fuel':
        gameStore.updateVehicleState({ fuel: Math.min(100, gameStore.vehicle.fuel + pickup.value) });
        break;

      case 'repair':
        gameStore.updateVehicleState({ health: Math.min(100, gameStore.vehicle.health + pickup.value) });
        break;
    }

    // Dispatch pickup collected event
    GameRuntime.getInstance().dispatchEvent({
      type: 'pickup_collected' as GameEventType,
      timestamp: Date.now(),
      data: { pickupId: pickup.id, type: pickup.type },
    });

    // Update quest stats
    questStore.addStat({ totalPickupsCollected: 1 });
  }

  /** Get the collection radius for a pickup type */
  private getCollectRadius(type: PickupType): number {
    switch (type) {
      case 'coin': return 2.5;
      case 'speedBoost': return 3;
      case 'item': return 3;
      case 'fuel': return 3;
      case 'repair': return 3;
      default: return 2.5;
    }
  }

  /* ── Pickup Spawning ── */

  /** Spawn a coin pickup at a specific location */
  spawnCoin(x: number, y: number, z: number, value: number = 50): WorldPickup {
    const pickup: WorldPickup = {
      id: `pickup_coin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'coin',
      position: { x, y, z },
      value,
      chunkId: `${Math.floor(x / WORLD.CHUNK_SIZE)}_${Math.floor(z / WORLD.CHUNK_SIZE)}`,
      collected: false,
      collectedAt: 0,
      respawnTime: 30,
    };

    useQuestStore.getState().spawnPickup(pickup);
    return pickup;
  }

  /** Spawn a speed boost pickup at a specific location */
  spawnSpeedBoost(x: number, y: number, z: number): WorldPickup {
    const pickup: WorldPickup = {
      id: `pickup_boost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'speedBoost',
      position: { x, y, z },
      value: 1,
      chunkId: `${Math.floor(x / WORLD.CHUNK_SIZE)}_${Math.floor(z / WORLD.CHUNK_SIZE)}`,
      collected: false,
      collectedAt: 0,
      respawnTime: 60,
    };

    useQuestStore.getState().spawnPickup(pickup);
    return pickup;
  }

  /** Spawn an item pickup at a specific location */
  spawnItem(x: number, y: number, z: number, itemId: string): WorldPickup {
    const pickup: WorldPickup = {
      id: `pickup_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'item',
      position: { x, y, z },
      value: 1,
      itemId,
      chunkId: `${Math.floor(x / WORLD.CHUNK_SIZE)}_${Math.floor(z / WORLD.CHUNK_SIZE)}`,
      collected: false,
      collectedAt: 0,
      respawnTime: 120,
    };

    useQuestStore.getState().spawnPickup(pickup);
    return pickup;
  }

  /** Spawn a fuel pickup at a specific location */
  spawnFuel(x: number, y: number, z: number, value: number = 25): WorldPickup {
    const pickup: WorldPickup = {
      id: `pickup_fuel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'fuel',
      position: { x, y, z },
      value,
      chunkId: `${Math.floor(x / WORLD.CHUNK_SIZE)}_${Math.floor(z / WORLD.CHUNK_SIZE)}`,
      collected: false,
      collectedAt: 0,
      respawnTime: 45,
    };

    useQuestStore.getState().spawnPickup(pickup);
    return pickup;
  }

  /** Spawn a repair pickup at a specific location */
  spawnRepair(x: number, y: number, z: number, value: number = 20): WorldPickup {
    const pickup: WorldPickup = {
      id: `pickup_repair_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'repair',
      position: { x, y, z },
      value,
      chunkId: `${Math.floor(x / WORLD.CHUNK_SIZE)}_${Math.floor(z / WORLD.CHUNK_SIZE)}`,
      collected: false,
      collectedAt: 0,
      respawnTime: 60,
    };

    useQuestStore.getState().spawnPickup(pickup);
    return pickup;
  }

  /* ── Respawn Management ── */

  /** Process pickups that need respawning */
  private processPickupRespawns(): void {
    const questStore = useQuestStore.getState();
    const now = Date.now();

    for (const pickup of questStore.worldPickups.values()) {
      if (!pickup.collected || pickup.collectedAt === 0) continue;

      const elapsed = (now - pickup.collectedAt) / 1000;
      if (elapsed >= pickup.respawnTime) {
        // Respawn the pickup
        pickup.collected = false;
        pickup.collectedAt = 0;
      }
    }
  }

  /* ── Cleanup ── */

  dispose(): void {
    PickupSystem.instance = null;
  }
}
