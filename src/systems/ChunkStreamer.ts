/**
 * ChunkStreamer — Chunk lifecycle management with object pooling and batch rendering.
 *
 * Manages the spawn, update, and unload of world chunks based on player position.
 * Uses object pooling to minimize garbage collection.
 * Uses InstancedMesh for batch rendering of street lights, road markings, and decorations.
 *
 * This system reads player position from worldStore and coordinates with
 * WorldGenerator to generate new chunks, and with worldStore to register/unregister them.
 */

import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { useShopStore } from '@/stores/shopStore';
import { useQuestStore } from '@/stores/questStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { GameRuntime } from './GameRuntime';
import { WorldGenerator } from './WorldGenerator';
import { WORLD } from '@/constants/world';
import type { ChunkData, PointOfInterest } from '@/types/world';
import type { GameEventType } from './GameRuntime';
import { roadNetworkRenderer } from './RoadNetworkRenderer';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** A pooled chunk ready for reuse */
interface PooledChunk {
  group: THREE.Group;
  chunkId: string;
  isActive: boolean;
}

/* ─────────────────────────────────────────────
 * ChunkStreamer Singleton
 * ───────────────────────────────────────────── */

export class ChunkStreamer {
  private static instance: ChunkStreamer | null = null;

  /** Object pool of chunk groups */
  private pool: PooledChunk[] = [];

  /** Map of active chunk IDs to their THREE.Group */
  private activeChunkGroups = new Map<string, THREE.Group>();

  /** Current render distance in chunks (adjusted by quality tier) */
  private renderDistance = 4;

  /** Distance at which to unload chunks (chunks beyond this are removed) */
  private unloadDistance = 6;

  /** Whether initialization is complete */
  private isInitialized = false;

  /** Reusable THREE.Vector3 for distance calculations */
  private _playerPos = new THREE.Vector3();
  private _chunkCenter = new THREE.Vector3();

  private constructor() {}

  static getInstance(): ChunkStreamer {
    if (!ChunkStreamer.instance) {
      ChunkStreamer.instance = new ChunkStreamer();
    }
    return ChunkStreamer.instance;
  }

  /* ── Initialization ── */

  init(): void {
    if (this.isInitialized) return;

    // Pre-allocate pool
    const poolSize = (this.unloadDistance * 2 + 1) ** 2;
    for (let i = 0; i < poolSize; i++) {
      const group = new THREE.Group();
      this.pool.push({ group, chunkId: '', isActive: false });
    }

    this.isInitialized = true;
  }

  /** Update render distance based on current quality preset */
  updateRenderDistance(): void {
    const preset = usePerformanceStore.getState().settings;
    this.renderDistance = preset.renderDistance;
    this.unloadDistance = Math.ceil(this.renderDistance + 2);
  }

  /* ── Frame Update ── */

  update(_delta: number): void {
    if (!this.isInitialized) return;

    // Check if quality settings changed
    this.updateRenderDistance();

    const { playerPosition } = useWorldStore.getState();
    this._playerPos.set(playerPosition.x, playerPosition.y, playerPosition.z);

    // Determine current chunk grid coordinates
    const currentChunkX = Math.floor(playerPosition.x / WORLD.CHUNK_SIZE);
    const currentChunkZ = Math.floor(playerPosition.z / WORLD.CHUNK_SIZE);

    // Calculate required chunks
    const requiredChunks = new Set<string>();
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        // Circular render distance
        if (dx * dx + dz * dz > this.renderDistance * this.renderDistance + 1) continue;

        const gx = currentChunkX + dx;
        const gz = currentChunkZ + dz;
        requiredChunks.add(`${gx}_${gz}`);
      }
    }

    // 1. Spawn missing chunks
    for (const chunkId of requiredChunks) {
      if (this.activeChunkGroups.has(chunkId)) continue;
      this.spawnChunk(chunkId);
    }

    // 2. Unload distant chunks
    this.unloadDistantChunks(currentChunkX, currentChunkZ);

    // 3. Update performance metrics
    usePerformanceStore.getState().setActiveChunks(this.activeChunkGroups.size);
  }

  /* ── Chunk Spawning ── */

  /** Spawn a chunk at the given ID */
  private spawnChunk(chunkId: string): void {
    // Get or generate chunk data
    const [cxStr, czStr] = chunkId.split('_');
    const cx = Number(cxStr);
    const cz = Number(czStr);

    const generator = WorldGenerator.getInstance();
    const generated = generator.generateChunk(cx, cz);
    const { chunkData, shops, pois } = generated;

    // Get a pooled chunk group
    const pooledChunk = this.pool.find((p) => !p.isActive);
    if (!pooledChunk) {
      // Pool exhausted — create new group (graceful degradation)
      const group = new THREE.Group();
      this.pool.push({ group, chunkId, isActive: true });
      this.activeChunkGroups.set(chunkId, group);
      return;
    }

    // Reset pooled chunk
    pooledChunk.chunkId = chunkId;
    pooledChunk.isActive = true;

    const group = pooledChunk.group;

    // Clear existing children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      // Dispose geometry and materials
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    }

    // Build chunk visual content
    this.buildChunkMeshes(group, chunkData);

    // Position chunk in world space
    group.position.set(cx * WORLD.CHUNK_SIZE, 0, cz * WORLD.CHUNK_SIZE);

    // Add to active chunks
    this.activeChunkGroups.set(chunkId, group);

    // Register chunk in world store
    useWorldStore.getState().registerChunk(chunkId, chunkData);

    // Register shops in shop store
    for (const shop of shops) {
      useShopStore.getState().registerShop(shop);
    }

    // Register POIs in quest store (for discovery)
    for (const poi of pois) {
      // POIs are tracked through worldStore.discoveredPoiIds
    }

    // Dispatch event
    GameRuntime.getInstance().dispatchEvent({
      type: 'chunk_loaded' as GameEventType,
      timestamp: Date.now(),
      data: { chunkId, zone: chunkData.zone },
    });
  }

  /** Build the 3D meshes for a chunk */
  private buildChunkMeshes(group: THREE.Group, chunkData: ChunkData): void {
    // Use the RoadNetworkRenderer to build all road meshes
    roadNetworkRenderer.buildChunkRoads(group, chunkData);

    // Apply elevation offset to entire chunk
    if (chunkData.elevation > 0) {
      group.position.y = chunkData.elevation;
    }
  }

  /* ── Chunk Unloading ── */

  /** Unload chunks that are too far from the player */
  private unloadDistantChunks(currentChunkX: number, currentChunkZ: number): void {
    const chunksToRemove: string[] = [];

    this.activeChunkGroups.forEach((group, chunkId) => {
      const [cxStr, czStr] = chunkId.split('_');
      const cx = Number(cxStr);
      const cz = Number(czStr);

      const dx = cx - currentChunkX;
      const dz = cz - currentChunkZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > this.unloadDistance) {
        chunksToRemove.push(chunkId);
      }
    });

    for (const chunkId of chunksToRemove) {
      this.unloadChunk(chunkId);
    }
  }

  /** Unload a single chunk */
  private unloadChunk(chunkId: string): void {
    const group = this.activeChunkGroups.get(chunkId);
    if (!group) return;

    // Return to pool
    const pooled = this.pool.find((p) => p.chunkId === chunkId);
    if (pooled) {
      pooled.isActive = false;
      pooled.chunkId = '';

      // Clear children
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      }
      group.position.set(0, 0, 0);
    }

    // Remove from active chunks
    this.activeChunkGroups.delete(chunkId);

    // Unregister from world store
    useWorldStore.getState().unregisterChunk(chunkId);

    // Dispatch event
    GameRuntime.getInstance().dispatchEvent({
      type: 'chunk_unloaded' as GameEventType,
      timestamp: Date.now(),
      data: { chunkId },
    });
  }

  /* ── Cleanup ── */

  /** Dispose all chunks and clear the pool */
  dispose(): void {
    for (const pooled of this.pool) {
      const group = pooled.group;
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      }
    }

    this.activeChunkGroups.clear();
    this.pool = [];
  }
}

// Helper to avoid top-level await / import issues
function await_import_constants() {
  const { WORLD, HIGHWAY, DECORATION } = require('@/constants/world');
  return { WORLD, HIGHWAY, DECORATION };
}
