/**
 * BatchRenderingSystem — Centralized batch rendering management.
 *
 * Manages all InstancedMesh batches for the game:
 * - Street lights (poles + lamps)
 * - Road markings (center lines, lane dividers)
 * - Decorations (trees, rocks, signs)
 * - Traffic cars (same model reuse)
 * - Pickups (coins, boost pads)
 *
 * This system coordinates with ChunkStreamer, TrafficAI, and other
 * systems to batch render objects efficiently.
 */

import * as THREE from 'three';
import { BatchManager, createStreetLightBatch, createRoadMarkingBatch, createDecorationBatch } from '@/utils/batchRenderer';
import { WORLD } from '@/constants/world';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Type of batch renderer */
export type BatchType = 'streetLights' | 'roadMarkings' | 'decorations' | 'trafficCars' | 'pickups';

/** Configuration for a batch group */
interface BatchGroupConfig {
  /** Batch type */
  type: BatchType;

  /** Base geometry */
  geometry: THREE.BufferGeometry;

  /** Base material */
  material: THREE.Material;

  /** Maximum number of instances */
  maxCount: number;

  /** Whether instances cast shadows */
  castShadow?: boolean;

  /** Whether instances receive shadows */
  receiveShadow?: boolean;
}

/* ─────────────────────────────────────────────
 * BatchRenderingSystem Singleton
 * ───────────────────────────────────────────── */

export class BatchRenderingSystem {
  private static instance: BatchRenderingSystem | null = null;

  /** All batch managers organized by type and chunk */
  private batches = new Map<string, BatchManager>();

  /** Shared geometries and materials for reuse */
  private sharedResources = new Map<string, any>();

  /** Whether the system is initialized */
  private isInitialized = false;

  private constructor() {}

  static getInstance(): BatchRenderingSystem {
    if (!BatchRenderingSystem.instance) {
      BatchRenderingSystem.instance = new BatchRenderingSystem();
    }
    return BatchRenderingSystem.instance;
  }

  /* ── Initialization ── */

  init(): void {
    if (this.isInitialized) return;

    // Pre-create shared resources
    this.initSharedResources();

    this.isInitialized = true;
  }

  /** Initialize shared geometries and materials */
  private initSharedResources(): void {
    // Street light resources
    this.sharedResources.set('streetLightPoleGeo', new THREE.CylinderGeometry(0.08, 0.1, 7, 8));
    this.sharedResources.set('streetLightLampGeo', new THREE.BoxGeometry(0.5, 0.1, 0.2));
    this.sharedResources.set('streetLightPoleMat', new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.5,
      roughness: 0.5,
    }));
    this.sharedResources.set('streetLightLampMat', new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fef08a',
      emissiveIntensity: 2,
    }));

    // Road marking resources
    this.sharedResources.set('roadMarkingGeo', new THREE.PlaneGeometry(0.15, 3));
    this.sharedResources.set('roadMarkingMat', new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#94a3b8',
      emissiveIntensity: 0.2,
    }));

    // Decoration resources
    this.sharedResources.set('treeTrunkGeo', new THREE.CylinderGeometry(0.2, 0.3, 2, 8));
    this.sharedResources.set('treeFoliageGeo', new THREE.SphereGeometry(1.5, 8, 6));
    this.sharedResources.set('treeTrunkMat', new THREE.MeshStandardMaterial({
      color: '#8B4513',
      roughness: 0.9,
    }));
    this.sharedResources.set('treeFoliageMat', new THREE.MeshStandardMaterial({
      color: '#228B22',
      roughness: 0.8,
    }));

    // Pickup resources
    this.sharedResources.set('coinGeo', new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16));
    this.sharedResources.set('coinMat', new THREE.MeshStandardMaterial({
      color: '#FFD700',
      metalness: 0.8,
      roughness: 0.2,
      emissive: '#FFD700',
      emissiveIntensity: 0.3,
    }));
  }

  /* ── Batch Creation ── */

  /**
   * Create a batch manager for a specific chunk
   */
  createBatch(chunkId: string, type: BatchType, maxCount: number): BatchManager {
    const key = `${chunkId}_${type}`;

    if (this.batches.has(key)) {
      console.warn(`BatchRenderingSystem: Batch ${key} already exists`);
      return this.batches.get(key)!;
    }

    let batch: BatchManager;

    switch (type) {
      case 'streetLights':
        batch = this.createStreetLightBatch(maxCount);
        break;

      case 'roadMarkings':
        batch = this.createRoadMarkingBatch(maxCount);
        break;

      case 'decorations':
        batch = this.createDecorationBatch(maxCount);
        break;

      case 'pickups':
        batch = this.createPickupBatch(maxCount);
        break;

      default:
        console.warn(`BatchRenderingSystem: Unknown batch type ${type}`);
        return new BatchManager();
    }

    this.batches.set(key, batch);
    return batch;
  }

  /**
   * Create street light batch
   */
  private createStreetLightBatch(maxCount: number): BatchManager {
    const poleGeo = this.sharedResources.get('streetLightPoleGeo');
    const lampGeo = this.sharedResources.get('streetLightLampGeo');
    const poleMat = this.sharedResources.get('streetLightPoleMat');
    const lampMat = this.sharedResources.get('streetLightLampMat');

    // Create two batches: one for poles, one for lamps
    const poleBatch = new BatchManager();
    poleBatch.create({
      geometry: poleGeo,
      material: poleMat,
      maxCount,
      castShadow: true,
    });

    const lampBatch = new BatchManager();
    lampBatch.create({
      geometry: lampGeo,
      material: lampMat,
      maxCount,
    });

    // Store both with special keys
    const poleKey = `pole_${this.batches.size}`;
    const lampKey = `lamp_${this.batches.size}`;
    this.batches.set(poleKey, poleBatch);
    this.batches.set(lampKey, lampBatch);

    return poleBatch; // Return pole batch as primary
  }

  /**
   * Create road marking batch
   */
  private createRoadMarkingBatch(maxCount: number): BatchManager {
    const markingGeo = this.sharedResources.get('roadMarkingGeo');
    const markingMat = this.sharedResources.get('roadMarkingMat');

    const batch = new BatchManager();
    batch.create({
      geometry: markingGeo,
      material: markingMat,
      maxCount,
      receiveShadow: true,
    });

    return batch;
  }

  /**
   * Create decoration batch (trees, rocks, etc.)
   */
  private createDecorationBatch(maxCount: number): BatchManager {
    const decoGeo = this.sharedResources.get('treeFoliageGeo');
    const decoMat = this.sharedResources.get('treeFoliageMat');

    const batch = new BatchManager();
    batch.create({
      geometry: decoGeo,
      material: decoMat,
      maxCount,
      castShadow: true,
    });

    return batch;
  }

  /**
   * Create pickup batch (coins, boost pads)
   */
  private createPickupBatch(maxCount: number): BatchManager {
    const coinGeo = this.sharedResources.get('coinGeo');
    const coinMat = this.sharedResources.get('coinMat');

    const batch = new BatchManager();
    batch.create({
      geometry: coinGeo,
      material: coinMat,
      maxCount,
    });

    return batch;
  }

  /* ── Batch Management ── */

  /**
   * Add an instance to a batch
   */
  addInstance(chunkId: string, type: BatchType, position: THREE.Vector3, rotation?: THREE.Euler): number {
    const key = `${chunkId}_${type}`;
    const batch = this.batches.get(key);

    if (!batch) {
      console.warn(`BatchRenderingSystem: Batch ${key} not found`);
      return -1;
    }

    return batch.addInstance(position, rotation || new THREE.Euler(0, 0, 0));
  }

  /**
   * Remove an instance from a batch
   */
  removeInstance(chunkId: string, type: BatchType, index: number): void {
    const key = `${chunkId}_${type}`;
    const batch = this.batches.get(key);

    if (!batch) return;

    batch.removeInstance(index);
  }

  /**
   * Get all batches for a chunk
   */
  getChunkBatches(chunkId: string): Map<string, BatchManager> {
    const chunkBatches = new Map<string, BatchManager>();

    for (const [key, batch] of this.batches) {
      if (key.startsWith(`${chunkId}_`)) {
        chunkBatches.set(key, batch);
      }
    }

    return chunkBatches;
  }

  /**
   * Dispose all batches for a chunk
   */
  disposeChunkBatches(chunkId: string): void {
    for (const [key, batch] of this.getChunkBatches(chunkId)) {
      batch.dispose();
      this.batches.delete(key);
    }
  }

  /**
   * Dispose all batches
   */
  disposeAll(): void {
    for (const batch of this.batches.values()) {
      batch.dispose();
    }
    this.batches.clear();
  }

  /* ── Statistics ── */

  /** Get total number of batches */
  get batchCount(): number {
    return this.batches.size;
  }

  /** Get total number of instances across all batches */
  get totalInstances(): number {
    let count = 0;
    for (const batch of this.batches.values()) {
      count += batch.count;
    }
    return count;
  }

  /* ── Cleanup ── */

  dispose(): void {
    this.disposeAll();
    this.sharedResources.clear();
    this.isInitialized = false;
  }
}
