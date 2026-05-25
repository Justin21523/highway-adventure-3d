/**
 * RoadNetworkRenderer — 完整的道路系統視覺化渲染器
 *
 * 這個系統負責將 WorldGenerator 生成的邏輯道路數據轉換為 3D 網格模型。
 * 支援以下道路類型：
 * - 高速公路 (Highway): 3 車道，高架橋，護欄
 * - 城市道路 (City Road): 網格狀，有十字路口
 * - 郊區道路 (Suburban): 2 車道，簡單交叉口
 * - 工業區道路 (Industrial): 寬闊道路，服務區
 * - 鄉間道路 (Countryside): 單車道，簡單
 * - 交流道 (Ramp): 高速公路分岔路
 *
 * 使用 InstancedMesh 批量渲染以提升效能。
 */

import * as THREE from 'three';
import { WorldGenerator } from './WorldGenerator';
import { WORLD, ROAD, HIGHWAY, DECORATION } from '@/constants/world';
import { useWorldStore } from '@/stores/worldStore';
import type { ChunkData, RoadSegment, RoadType } from '@/types/world';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Road surface material cache key */
interface MaterialKey {
  zone: string;
  isElevated: boolean;
}

/* ─────────────────────────────────────────────
 * RoadNetworkRenderer Class
 * ───────────────────────────────────────────── */

export class RoadNetworkRenderer {
  /** Cache for materials to avoid recreation */
  private materialCache = new Map<string, THREE.Material>();

  /** Cache for geometries */
  private geometryCache = new Map<string, THREE.BufferGeometry>();

  /**
   * Get or create a cached material
   */
  private getMaterial(key: string, creator: () => THREE.Material): THREE.Material {
    if (!this.materialCache.has(key)) {
      this.materialCache.set(key, creator());
    }
    return this.materialCache.get(key)!;
  }

  /**
   * Get or create a cached geometry
   */
  private getGeometry(key: string, creator: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (!this.geometryCache.has(key)) {
      this.geometryCache.set(key, creator());
    }
    return this.geometryCache.get(key)!;
  }

  /**
   * Build 3D road meshes for a chunk
   * This is the main entry point called by ChunkStreamer
   */
  buildChunkRoads(group: THREE.Group, chunkData: ChunkData): void {
    

    // Build road surface
    this.buildRoadSurface(group, chunkData);

    // Build lane markings
    if (chunkData.roads.length > 0) {
      this.buildLaneMarkings(group, chunkData.roads, chunkData.elevation);
    }

    // Build barriers for highways
    for (const road of chunkData.roads) {
      if (road.hasBarrier) {
        this.buildBarriers(group, road, chunkData.elevation);
      }
    }

    // Build street lights
    for (const road of chunkData.roads) {
      if (road.hasStreetLights) {
        this.buildStreetLights(group, road, chunkData.elevation);
      }
    }

    // Build service area for highway
    if (chunkData.hasServiceArea) {
      this.buildServiceArea(group, chunkData);
    }

    // Build intersection markings
    if (chunkData.hasIntersection) {
      this.buildIntersectionMarkings(group, chunkData.elevation);
    }
  }

  /**
   * Build road surface geometry
   */
  private buildRoadSurface(group: THREE.Group, chunkData: ChunkData): void {
    

    // Main road surface
    const roadGeo = this.getGeometry('road_surface', () =>
      new THREE.PlaneGeometry(WORLD.CHUNK_SIZE, WORLD.CHUNK_SIZE),
    );

    const roadMat = this.getMaterial(`road_${chunkData.zone}`, () =>
      new THREE.MeshStandardMaterial({
        color: chunkData.zone === 'highway' ? 0x2a2a2a : 0x333333,
        roughness: 0.8,
        metalness: 0.1,
      }),
    );

    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = chunkData.elevation;
    road.receiveShadow = true;
    group.add(road);

    // Add elevated support structure if needed
    if (chunkData.elevation > 0) {
      this.buildElevatedSupport(group, chunkData);
    }
  }

  /**
   * Build elevated bridge support structure
   */
  private buildElevatedSupport(group: THREE.Group, chunkData: ChunkData): void {
    

    // Bridge deck
    const bridgeGeo = new THREE.BoxGeometry(WORLD.CHUNK_SIZE, 0.3, WORLD.CHUNK_SIZE);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9,
    });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.y = chunkData.elevation - 0.15;
    bridge.receiveShadow = true;
    bridge.castShadow = true;
    group.add(bridge);

    // Support pillars
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, HIGHWAY.ELEVATED_HEIGHT, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.7,
    });

    const pillarPositions = [
      { x: -WORLD.CHUNK_SIZE / 2 + 5, z: -WORLD.CHUNK_SIZE / 2 + 5 },
      { x: WORLD.CHUNK_SIZE / 2 - 5, z: -WORLD.CHUNK_SIZE / 2 + 5 },
      { x: -WORLD.CHUNK_SIZE / 2 + 5, z: WORLD.CHUNK_SIZE / 2 - 5 },
      { x: WORLD.CHUNK_SIZE / 2 - 5, z: WORLD.CHUNK_SIZE / 2 - 5 },
    ];

    for (const pos of pillarPositions) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(pos.x, chunkData.elevation / 2, pos.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);
    }
  }

  /**
   * Build lane markings (center line, lane dividers, edge lines)
   */
  private buildLaneMarkings(group: THREE.Group, roads: RoadSegment[], elevation: number): void {
    

    const markingMat = this.getMaterial('marking_white', () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x94a3b8,
        emissiveIntensity: 0.2,
      }),
    );

    const yellowMat = this.getMaterial('marking_yellow', () =>
      new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0x94a3b8,
        emissiveIntensity: 0.2,
      }),
    );

    // Center line (dashed yellow)
    const centerLineGeo = this.getGeometry('center_line', () =>
      new THREE.PlaneGeometry(0.15, WORLD.CHUNK_SIZE * 0.8),
    );
    const centerLine = new THREE.Mesh(centerLineGeo, yellowMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = elevation + 0.01;
    group.add(centerLine);

    // Lane dividers (dashed white)
    for (let lane = -1; lane <= 1; lane += 2) {
      const dividerGeo = this.getGeometry('lane_divider', () =>
        new THREE.PlaneGeometry(0.1, WORLD.CHUNK_SIZE * 0.6),
      );
      const divider = new THREE.Mesh(dividerGeo, markingMat);
      divider.rotation.x = -Math.PI / 2;
      divider.position.set(lane * 2, elevation + 0.01, 0);
      group.add(divider);
    }

    // Edge lines (solid white/yellow)
    const halfChunk = WORLD.CHUNK_SIZE / 2 - 2;
    const edgeGeo = this.getGeometry('edge_line', () =>
      new THREE.PlaneGeometry(0.12, WORLD.CHUNK_SIZE * 0.9),
    );

    for (let side = -1; side <= 1; side += 2) {
      const edge = new THREE.Mesh(edgeGeo, side === -1 ? yellowMat : markingMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(side * halfChunk, elevation + 0.01, 0);
      group.add(edge);
    }
  }

  /**
   * Build intersection markings (crosswalk, stop lines)
   */
  private buildIntersectionMarkings(group: THREE.Group, elevation: number): void {
    const markingMat = this.getMaterial('marking_white', () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x94a3b8,
        emissiveIntensity: 0.2,
      }),
    );

    // Crosswalk stripes
    const stripeGeo = new THREE.PlaneGeometry(3.5, 0.3);
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(stripeGeo, markingMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i * 1.5, elevation + 0.01, 0);
      group.add(stripe);
    }
  }

  /**
   * Build highway barriers
   */
  private buildBarriers(group: THREE.Group, road: RoadSegment, elevation: number): void {
    

    const barrierMat = this.getMaterial('barrier', () =>
      new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.5,
        metalness: 0.3,
      }),
    );

    const barrierGeo = this.getGeometry('barrier', () =>
      new THREE.BoxGeometry(0.3, HIGHWAY.BARRIER_HEIGHT, WORLD.CHUNK_SIZE),
    );

    const halfChunk = WORLD.CHUNK_SIZE / 2;

    // Left barrier
    const barrierLeft = new THREE.Mesh(barrierGeo, barrierMat);
    barrierLeft.position.set(-halfChunk, elevation + HIGHWAY.BARRIER_HEIGHT / 2, 0);
    barrierLeft.castShadow = true;
    group.add(barrierLeft);

    // Right barrier
    const barrierRight = new THREE.Mesh(barrierGeo, barrierMat);
    barrierRight.position.set(halfChunk, elevation + HIGHWAY.BARRIER_HEIGHT / 2, 0);
    barrierRight.castShadow = true;
    group.add(barrierRight);
  }

  /**
   * Build street lights using InstancedMesh for batch rendering
   */
  private buildStreetLights(group: THREE.Group, road: RoadSegment, elevation: number): void {
    

    const poleMat = this.getMaterial('pole', () =>
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.5,
        roughness: 0.5,
      }),
    );

    const lampMat = this.getMaterial('lamp', () =>
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfef08a,
        emissiveIntensity: 2,
      }),
    );

    const poleGeo = this.getGeometry('pole', () =>
      new THREE.CylinderGeometry(0.08, 0.1, DECORATION.STREET_LIGHT_HEIGHT, 8),
    );

    const lampGeo = this.getGeometry('lamp', () =>
      new THREE.BoxGeometry(0.5, 0.1, 0.2),
    );

    const spacing = DECORATION.STREET_LIGHT_SPACING;
    const halfChunk = WORLD.CHUNK_SIZE / 2;

    // Use InstancedMesh for batch rendering
    const poleCount = Math.floor(WORLD.CHUNK_SIZE / spacing) * 2;
    const lampCount = Math.floor(WORLD.CHUNK_SIZE / spacing) * 2;

    const poleInstanced = new THREE.InstancedMesh(poleGeo, poleMat, poleCount);
    const lampInstanced = new THREE.InstancedMesh(lampGeo, lampMat, lampCount);

    poleInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    let poleIndex = 0;
    let lampIndex = 0;

    for (let z = -halfChunk + spacing; z < halfChunk; z += spacing) {
      // Left side
      if (poleIndex < poleCount) {
        dummy.position.set(-halfChunk - 1, elevation + DECORATION.STREET_LIGHT_HEIGHT / 2, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poleInstanced.setMatrixAt(poleIndex, dummy.matrix);
        poleIndex++;

        dummy.position.set(-halfChunk - 0.5, elevation + DECORATION.STREET_LIGHT_HEIGHT, z);
        dummy.updateMatrix();
        lampInstanced.setMatrixAt(lampIndex, dummy.matrix);
        lampIndex++;
      }

      // Right side
      if (poleIndex < poleCount) {
        dummy.position.set(halfChunk + 1, elevation + DECORATION.STREET_LIGHT_HEIGHT / 2, z);
        dummy.updateMatrix();
        poleInstanced.setMatrixAt(poleIndex, dummy.matrix);
        poleIndex++;

        dummy.position.set(halfChunk + 0.5, elevation + DECORATION.STREET_LIGHT_HEIGHT, z);
        dummy.updateMatrix();
        lampInstanced.setMatrixAt(lampIndex, dummy.matrix);
        lampIndex++;
      }
    }

    poleInstanced.instanceMatrix.needsUpdate = true;
    lampInstanced.instanceMatrix.needsUpdate = true;

    group.add(poleInstanced);
    group.add(lampInstanced);
  }

  /**
   * Build service area for highway chunks
   */
  private buildServiceArea(group: THREE.Group, chunkData: ChunkData): void {
    

    const serviceMat = this.getMaterial('service_area', () =>
      new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.9,
      }),
    );

    // Service road
    const serviceGeo = new THREE.BoxGeometry(15, 0.2, WORLD.CHUNK_SIZE * 0.6);
    const service = new THREE.Mesh(serviceGeo, serviceMat);
    service.position.set(WORLD.CHUNK_SIZE / 2 + 7.5, chunkData.elevation, 0);
    service.receiveShadow = true;
    group.add(service);

    // Parking area
    const parkingGeo = new THREE.BoxGeometry(20, 0.1, 30);
    const parking = new THREE.Mesh(parkingGeo, serviceMat);
    parking.position.set(WORLD.CHUNK_SIZE / 2 + 25, chunkData.elevation, 0);
    parking.receiveShadow = true;
    group.add(parking);
  }

  /**
   * Dispose all cached resources
   */
  dispose(): void {
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    this.materialCache.clear();
    this.geometryCache.clear();
  }
}

// Export singleton instance
export const roadNetworkRenderer = new RoadNetworkRenderer();
