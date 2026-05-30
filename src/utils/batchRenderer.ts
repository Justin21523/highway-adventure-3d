/**
 * BatchRenderer — Instanced rendering utilities for batch object management.
 *
 * Provides helper functions to create and manage InstancedMesh for:
 * - Street lights
 * - Road markings
 * - Decorations (trees, signs, etc.)
 * - Traffic cars (same model reuse)
 *
 * This dramatically reduces draw calls and improves FPS.
 */

import * as THREE from 'three';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Configuration for an instanced mesh batch */
interface BatchConfig {
  /** Base geometry to instance */
  geometry: THREE.BufferGeometry;

  /** Base material to instance */
  material: THREE.Material;

  /** Maximum number of instances */
  maxCount: number;

  /** Whether instances cast shadows */
  castShadow?: boolean;

  /** Whether instances receive shadows */
  receiveShadow?: boolean;
}

/** Instance data with transform and visibility */
interface InstanceData {
  /** Position */
  position: THREE.Vector3;

  /** Rotation (in radians) */
  rotation: THREE.Euler;

  /** Scale */
  scale: THREE.Vector3;

  /** Whether this instance is visible */
  visible: boolean;
}

/** Batch manager for instanced rendering */
export class BatchManager {
  private instancedMesh: THREE.InstancedMesh | null = null;
  private instanceData: InstanceData[] = [];
  private dummy = new THREE.Object3D();
  private tempColor = new THREE.Color();

  /** Get the number of active instances */
  get count(): number {
    return this.instanceData.length;
  }

  /** Check if batch is initialized */
  get isInitialized(): boolean {
    return this.instancedMesh !== null;
  }

  /**
   * Create a new instanced mesh batch
   */
  create(config: BatchConfig): BatchManager {
    // Dispose existing
    if (this.instancedMesh) {
      this.instancedMesh.geometry?.dispose();
      if (Array.isArray(this.instancedMesh.material)) {
        this.instancedMesh.material.forEach((m) => m.dispose());
      } else {
        this.instancedMesh.material.dispose();
      }
    }

    this.instanceData = [];

    this.instancedMesh = new THREE.InstancedMesh(
      config.geometry,
      config.material,
      config.maxCount,
    );

    this.instancedMesh.castShadow = config.castShadow ?? false;
    this.instancedMesh.receiveShadow = config.receiveShadow ?? false;

    // Initialize all instances as invisible
    this.dummy.position.set(0, 0, 0);
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();

    for (let i = 0; i < config.maxCount; i++) {
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;

    return this;
  }

  /**
   * Add an instance with transform
   */
  addInstance(position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)): number {
    const index = this.instanceData.length;

    if (index >= (this.instancedMesh?.count ?? 0)) {
      console.warn('BatchManager: Instance limit reached');
      return -1;
    }

    this.instanceData.push({
      position: position.clone(),
      rotation: rotation.clone(),
      scale: scale.clone(),
      visible: true,
    });

    this.updateInstance(index);

    return index;
  }

  /**
   * Update instance at specific index
   */
  updateInstance(index: number): void {
    if (!this.instancedMesh || index >= this.instanceData.length) return;

    const data = this.instanceData[index];

    if (!data.visible) {
      // Hide instance by scaling to 0
      this.dummy.position.set(0, 0, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
      return;
    }

    this.dummy.position.copy(data.position);
    this.dummy.rotation.copy(data.rotation);
    this.dummy.scale.copy(data.scale);
    this.dummy.updateMatrix();

    this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
  }

  /**
   * Remove instance by swapping with last and removing last
   */
  removeInstance(index: number): void {
    if (!this.instancedMesh || index >= this.instanceData.length) return;

    const lastIndex = this.instanceData.length - 1;

    if (index !== lastIndex) {
      // Swap with last
      this.instanceData[index] = this.instanceData[lastIndex];
      this.updateInstance(index);
    }

    this.instanceData.pop();

    // Hide the last instance
    if (lastIndex < this.instancedMesh.count) {
      this.dummy.position.set(0, 0, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(lastIndex, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Set instance color
   */
  setInstanceColor(index: number, color: THREE.Color): void {
    if (!this.instancedMesh || index >= this.instanceData.length) return;

    this.instancedMesh.setColorAt(index, color);
    if (this.instancedMesh.instanceColor) this.instancedMesh.instanceColor.needsUpdate = true;
  }

  /**
   * Set visibility of an instance
   */
  setInstanceVisible(index: number, visible: boolean): void {
    if (!this.instancedMesh || index >= this.instanceData.length) return;

    this.instanceData[index].visible = visible;
    this.updateInstance(index);
  }

  /**
   * Get the InstancedMesh for adding to scene
   */
  getMesh(): THREE.InstancedMesh | null {
    return this.instancedMesh;
  }

  /**
   * Update all instance matrices (call after batch modifications)
   */
  updateAll(): void {
    if (!this.instancedMesh) return;

    for (let i = 0; i < this.instanceData.length; i++) {
      this.updateInstance(i);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Clear all instances
   */
  clear(): void {
    this.instanceData = [];

    if (this.instancedMesh) {
      this.dummy.position.set(0, 0, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();

      for (let i = 0; i < this.instancedMesh.count; i++) {
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      }

      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.instancedMesh) {
      this.instancedMesh.geometry?.dispose();
      if (Array.isArray(this.instancedMesh.material)) {
        this.instancedMesh.material.forEach((m) => m.dispose());
      } else {
        this.instancedMesh.material.dispose();
      }
      this.instancedMesh = null;
    }

    this.instanceData = [];
  }
}

/* ─────────────────────────────────────────────
 * Factory Functions
 * ───────────────────────────────────────────── */

/**
 * Create a batch manager for street lights
 */
export function createStreetLightBatch(
  poleGeo: THREE.BufferGeometry,
  lampGeo: THREE.BufferGeometry,
  poleMat: THREE.Material,
  lampMat: THREE.Material,
  maxLights: number,
): { poles: BatchManager; lamps: BatchManager } {
  const poles = new BatchManager();
  const lamps = new BatchManager();

  poles.create({
    geometry: poleGeo,
    material: poleMat,
    maxCount: maxLights,
    castShadow: true,
  });

  lamps.create({
    geometry: lampGeo,
    material: lampMat,
    maxCount: maxLights,
  });

  return { poles, lamps };
}

/**
 * Create a batch manager for road markings
 */
export function createRoadMarkingBatch(
  markingGeo: THREE.BufferGeometry,
  markingMat: THREE.Material,
  maxMarkings: number,
): BatchManager {
  const batch = new BatchManager();
  batch.create({
    geometry: markingGeo,
    material: markingMat,
    maxCount: maxMarkings,
    receiveShadow: true,
  });
  return batch;
}

/**
 * Create a batch manager for decorations (trees, rocks, etc.)
 */
export function createDecorationBatch(
  decoGeo: THREE.BufferGeometry,
  decoMat: THREE.Material,
  maxDecos: number,
): BatchManager {
  const batch = new BatchManager();
  batch.create({
    geometry: decoGeo,
    material: decoMat,
    maxCount: maxDecos,
    castShadow: true,
  });
  return batch;
}

/**
 * Create a batch manager for traffic cars (same model)
 */
export function createTrafficCarBatch(
  carGroup: THREE.Group,
  maxCars: number,
): { meshes: THREE.InstancedMesh[]; originalMaterials: Map<THREE.Mesh, THREE.Material> } {
  // Collect all meshes from the car model
  const meshes: THREE.InstancedMesh[] = [];
  const originalMaterials = new Map<THREE.Mesh, THREE.Material>();

  carGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mesh = child as THREE.Mesh;
      originalMaterials.set(mesh, Array.isArray(mesh.material) ? mesh.material[0] : mesh.material);

      // Create instanced version
      const instanced = new THREE.InstancedMesh(
        mesh.geometry,
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
        maxCars,
      );
      instanced.castShadow = mesh.castShadow;
      instanced.receiveShadow = mesh.receiveShadow;

      // Initialize all instances as invisible
      const dummy = new THREE.Object3D();
      dummy.position.set(0, 0, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();

      for (let i = 0; i < maxCars; i++) {
        instanced.setMatrixAt(i, dummy.matrix);
      }

      instanced.instanceMatrix.needsUpdate = true;
      meshes.push(instanced);
    }
  });

  return { meshes, originalMaterials };
}

/* ─────────────────────────────────────────────
 * Utility Functions
 * ───────────────────────────────────────────── */

/**
 * Calculate bounding box for a batch of instances
 */
export function calculateBatchBounds(
  instances: { position: THREE.Vector3 }[],
  extent: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
): THREE.Box3 {
  const box = new THREE.Box3();

  for (const inst of instances) {
    const min = new THREE.Vector3().copy(inst.position).sub(extent);
    const max = new THREE.Vector3().copy(inst.position).add(extent);
    box.expandByPoint(min);
    box.expandByPoint(max);
  }

  return box;
}

/**
 * Frustum culling for instanced meshes
 * Returns array of visible instance indices
 */
export function frustumCullInstances(
  instances: { position: THREE.Vector3 }[],
  frustum: THREE.Frustum,
  projectionMatrix: THREE.Matrix4,
): number[] {
  const visible: number[] = [];
  const tempBox = new THREE.Box3();
  const extent = new THREE.Vector3(2, 2, 4); // Typical car size

  for (let i = 0; i < instances.length; i++) {
    tempBox.setFromCenterAndSize(instances[i].position, extent);

    if (frustum.intersectsBox(tempBox)) {
      visible.push(i);
    }
  }

  return visible;
}
