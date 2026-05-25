/**
 * BatchSystem — 批量渲染系統整合入口
 *
 * 這個模組整合了所有 batch rendering 相關系統：
 * - BatchRenderingSystem: 核心批量渲染管理
 * - TrafficBatchSystem: 交通車批量渲染
 * - DecorationBatchSystem: 裝飾物批量渲染
 * - RoadMarkingBatchSystem: 道路標記批量渲染
 * - AssetLoader.batchLoad: 批量資源載入
 *
 * 使用方式：
 * ```typescript
 * import { BatchSystem } from '@/systems/BatchSystem';
 *
 * // 初始化
 * BatchSystem.init();
 *
 * // 批量載入資源
 * const models = await BatchSystem.loadModels([
 *   'assets/models/car.glb',
 *   'assets/models/tree.glb',
 *   'assets/models/building.glb',
 * ]);
 *
 * // 獲取統計資訊
 * const stats = BatchSystem.getStats();
 * console.log(`Draw calls reduced: ${stats.drawCallReduction}`);
 * ```
 */

import { BatchRenderingSystem } from './BatchRenderingSystem';
import { AssetLoader } from '@/assets/AssetLoader';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Batch system statistics */
export interface BatchStats {
  /** Total number of batch managers */
  totalBatches: number;

  /** Total number of instances across all batches */
  totalInstances: number;

  /** Estimated draw call reduction */
  drawCallReduction: number;

  /** Memory usage estimate (bytes) */
  estimatedMemoryUsage: number;
}

/* ─────────────────────────────────────────────
 * BatchSystem Class
 * ───────────────────────────────────────────── */

export class BatchSystem {
  private static initialized = false;

  /**
   * Initialize all batch rendering systems
   */
  static init(): void {
    if (this.initialized) return;

    // Initialize batch rendering system
    const batchSystem = BatchRenderingSystem.getInstance();
    batchSystem.init();

    // Initialize asset loader
    const assetLoader = AssetLoader.getInstance();
    assetLoader.init();

    this.initialized = true;
    console.log('[BatchSystem] Initialized successfully');
  }

  /**
   * Dispose all batch rendering systems
   */
  static dispose(): void {
    const batchSystem = BatchRenderingSystem.getInstance();
    batchSystem.dispose();

    this.initialized = false;
    console.log('[BatchSystem] Disposed');
  }

  /**
   * Check if batch system is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /* ── Batch Loading ── */

  /**
   * Load multiple models in batch
   */
  static async loadModels(
    urls: string[],
    batchId: string,
    onProgress?: (progress: number) => void,
  ): Promise<THREE.Group[]> {
    const assetLoader = AssetLoader.getInstance();
    return assetLoader.loadBatchModels(urls, batchId, onProgress);
  }

  /**
   * Load multiple textures in batch
   */
  static async loadTextures(
    urls: string[],
    batchId: string,
    onProgress?: (progress: number) => void,
  ): Promise<THREE.Texture[]> {
    const assetLoader = AssetLoader.getInstance();
    return assetLoader.loadBatchTextures(urls, batchId, onProgress);
  }

  /**
   * Load mixed assets in batch
   */
  static async loadAssets(
    urls: string[],
    batchId: string,
    onProgress?: (progress: number) => void,
  ): Promise<(THREE.Group | THREE.Texture | AudioBuffer)[]> {
    const assetLoader = AssetLoader.getInstance();
    return assetLoader.loadBatch(urls, batchId, onProgress);
  }

  /**
   * Get batch loading progress
   */
  static getBatchProgress(batchId: string): { loaded: number; total: number; percentage: number } | null {
    const assetLoader = AssetLoader.getInstance();
    return assetLoader.getBatchProgress(batchId);
  }

  /* ── Batch Rendering ── */

  /**
   * Create a batch manager for street lights
   */
  static createStreetLightBatch(chunkId: string, maxCount: number) {
    const batchSystem = BatchRenderingSystem.getInstance();
    return batchSystem.createBatch(chunkId, 'streetLights', maxCount);
  }

  /**
   * Create a batch manager for road markings
   */
  static createRoadMarkingBatch(chunkId: string, maxCount: number) {
    const batchSystem = BatchRenderingSystem.getInstance();
    return batchSystem.createBatch(chunkId, 'roadMarkings', maxCount);
  }

  /**
   * Create a batch manager for decorations
   */
  static createDecorationBatch(chunkId: string, maxCount: number) {
    const batchSystem = BatchRenderingSystem.getInstance();
    return batchSystem.createBatch(chunkId, 'decorations', maxCount);
  }

  /**
   * Dispose all batches for a chunk
   */
  static disposeChunkBatches(chunkId: string) {
    const batchSystem = BatchRenderingSystem.getInstance();
    batchSystem.disposeChunkBatches(chunkId);
  }

  /* ── Statistics ── */

  /**
   * Get comprehensive batch system statistics
   */
  static getStats(): BatchStats {
    const batchSystem = BatchRenderingSystem.getInstance();

    const totalBatches = batchSystem.batchCount;
    const totalInstances = batchSystem.totalInstances;

    // Estimate draw call reduction
    // Without batching: each instance = 1 draw call
    // With batching: all instances of same type = 1 draw call
    const drawCallReduction = totalInstances > 0
      ? Math.round((1 - totalBatches / totalInstances) * 100)
      : 0;

    // Estimate memory usage (rough estimate)
    // Each instance: 16 bytes (matrix) + 12 bytes (color) = 28 bytes
    const estimatedMemoryUsage = totalInstances * 40;

    return {
      totalBatches,
      totalInstances,
      drawCallReduction,
      estimatedMemoryUsage,
    };
  }

  /**
   * Print batch system statistics to console
   */
  static printStats(): void {
    const stats = this.getStats();

    console.log('[BatchSystem Statistics]');
    console.log(`  Total Batches: ${stats.totalBatches}`);
    console.log(`  Total Instances: ${stats.totalInstances}`);
    console.log(`  Draw Call Reduction: ${stats.drawCallReduction}%`);
    console.log(`  Estimated Memory: ${(stats.estimatedMemoryUsage / 1024).toFixed(2)} KB`);
  }
}

// Import THREE for type hints
import * as THREE from 'three';
