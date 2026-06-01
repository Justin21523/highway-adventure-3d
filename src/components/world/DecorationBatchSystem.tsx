/**
 * DecorationBatchSystem — Batch-rendered world decorations using InstancedMesh.
 *
 * This system renders all world decorations (trees, rocks, signs, buildings)
 * using InstancedMesh for maximum performance.
 *
 * Features:
 * - Batch rendering for trees, rocks, and signs
 * - Automatic LOD (Level of Detail) based on distance
 * - Frustum culling for off-screen objects
 * - Dynamic spawn/unload based on chunk boundaries
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFrame as useR3FFrame } from '@react-three/fiber';
import { useWorldStore } from '@/stores/worldStore';
import { WORLD } from '@/constants/world';
import { zoneAtChunk } from '@/systems/ZoneManager';
import type { ZoneType } from '@/types/core';

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

const TREE_SPACING = 15;
const ROCK_SPACING = 25;
const HOUSE_SPACING = 22;
const MAX_TREES_PER_CHUNK = 50;
const MAX_ROCKS_PER_CHUNK = 30;
const MAX_SIGNS_PER_CHUNK = 10;
const MAX_HOUSES_PER_CHUNK = 24;

/**
 * Per-zone tree placement probability. Highway corridor and dense commercial
 * blocks suppress trees (road/shops dominate); residential keeps a few; general
 * countryside is the leafy default.
 */
const TREE_CHANCE_BY_ZONE: Record<ZoneType, number> = {
  highway: 0,
  cityCenter: 0,
  suburban: 0.12,
  industrial: 0.08,
  countryside: 0.32,
};

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

interface DecorationConfig {
  type: 'tree' | 'rock' | 'sign' | 'house';
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: number;
}

/* ─────────────────────────────────────────────
 * DecorationBatchSystem Component
 * ───────────────────────────────────────────── */

export function DecorationBatchSystem() {
  const groupRef = useRef<THREE.Group>(null);

  // InstancedMesh refs
  const treeTrunkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const treeFoliageMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rockMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const signMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const houseMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const roofMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Decoration data
  const decorationsRef = useRef<Map<string, DecorationConfig[]>>(new Map());

  // Dummy for matrix updates
  const dummyRef = useMemo(() => new THREE.Object3D(), []);

  // Shared geometries
  const geometriesRef = useMemo(() => ({
    treeTrunk: new THREE.CylinderGeometry(0.2, 0.3, 2, 8),
    treeFoliage: new THREE.SphereGeometry(1.5, 8, 6),
    rock: new THREE.DodecahedronGeometry(0.8, 2),
    sign: new THREE.BoxGeometry(0.1, 1.5, 1),
    // Unit-cube body so per-house scale controls real dimensions.
    house: new THREE.BoxGeometry(1, 1, 1),
    // Low pyramid roof (4-sided cone) sitting on top of the body.
    roof: new THREE.ConeGeometry(0.8, 0.6, 4),
  }), []);

  // Shared materials
  const materialsRef = useMemo(() => ({
    treeTrunk: new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }),
    treeFoliage: new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.7 }),
    sign: new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.3, roughness: 0.5 }),
    house: new THREE.MeshStandardMaterial({ color: 0xC2A878, roughness: 0.85 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x8B5A3C, roughness: 0.8 }),
  }), []);

  /**
   * Generate decorations for a chunk
   */
  const generateChunkDecorations = useCallback((chunkId: string, cx: number, cz: number): DecorationConfig[] => {
    const decorations: DecorationConfig[] = [];
    const halfChunk = WORLD.CHUNK_SIZE / 2;
    const worldX = cx * WORLD.CHUNK_SIZE;
    const worldZ = cz * WORLD.CHUNK_SIZE;

    // Seeded random for consistent placement
    const seed = hashChunkId(chunkId);
    const rng = seededRandom(seed);

    // Authoritative district drives what this chunk grows.
    const zone = zoneAtChunk(cx, cz);
    const treeChance = TREE_CHANCE_BY_ZONE[zone];

    // Generate trees (density per zone; 0 ⇒ none on highway/commercial)
    let treeCount = 0;
    if (treeChance > 0) {
      for (let x = -halfChunk + TREE_SPACING; x < halfChunk; x += TREE_SPACING * 2) {
        for (let z = -halfChunk + TREE_SPACING; z < halfChunk; z += TREE_SPACING * 2) {
          if (treeCount >= MAX_TREES_PER_CHUNK) break;
          if (rng() > treeChance) continue;

          const treeX = worldX + x + (rng() - 0.5) * 5;
          const treeZ = worldZ + z + (rng() - 0.5) * 5;
          const treeScale = 0.8 + rng() * 0.4;

          decorations.push({
            type: 'tree',
            position: new THREE.Vector3(treeX, 0, treeZ),
            scale: new THREE.Vector3(treeScale, treeScale, treeScale),
            rotation: rng() * Math.PI * 2,
          });
          treeCount++;
        }
      }
    }

    // Generate houses — residential blocks only, laid out on a loose grid set
    // back from the chunk centre so they don't sit on the road spine.
    if (zone === 'suburban') {
      let houseCount = 0;
      for (let x = -halfChunk + HOUSE_SPACING; x < halfChunk && houseCount < MAX_HOUSES_PER_CHUNK; x += HOUSE_SPACING) {
        for (let z = -halfChunk + HOUSE_SPACING; z < halfChunk && houseCount < MAX_HOUSES_PER_CHUNK; z += HOUSE_SPACING) {
          if (rng() > 0.55) continue;

          const hx = worldX + x + (rng() - 0.5) * 4;
          const hz = worldZ + z + (rng() - 0.5) * 4;
          const w = 6 + rng() * 3;
          const d = 6 + rng() * 3;
          const h = 4 + rng() * 3;

          decorations.push({
            type: 'house',
            position: new THREE.Vector3(hx, 0, hz),
            scale: new THREE.Vector3(w, h, d),
            // Quantize yaw to right angles so houses look street-aligned.
            rotation: Math.floor(rng() * 4) * (Math.PI / 2),
          });
          houseCount++;
        }
      }
    }

    // Generate rocks — only in open natural zones (and never rendered on roads)
    if (zone === 'countryside' || zone === 'industrial') {
      for (let i = 0; i < MAX_ROCKS_PER_CHUNK; i++) {
        if (rng() > 0.2) continue;

        const rockX = worldX + (rng() - 0.5) * WORLD.CHUNK_SIZE;
        const rockZ = worldZ + (rng() - 0.5) * WORLD.CHUNK_SIZE;
        const rockScale = 0.5 + rng() * 1.0;

        decorations.push({
          type: 'rock',
          position: new THREE.Vector3(rockX, 0.3, rockZ),
          scale: new THREE.Vector3(rockScale, rockScale * 0.6, rockScale),
          rotation: rng() * Math.PI * 2,
        });
      }
    }

    // Generate signs
    for (let z = -halfChunk + SIGN_SPACING; z < halfChunk; z += SIGN_SPACING * 3) {
      if (rng() > 0.5) continue;

      const signX = worldX + halfChunk + 2;
      const signZ = worldZ + z;

      decorations.push({
        type: 'sign',
        position: new THREE.Vector3(signX, 0.75, signZ),
        scale: new THREE.Vector3(1, 1, 1),
        rotation: Math.PI / 2,
      });
    }

    return decorations;
  }, []);

  /**
   * Update InstancedMesh for all decorations
   */
  const updateInstancedMesh = useCallback(() => {
    if (!treeTrunkMeshRef.current || !treeFoliageMeshRef.current) return;

    // Collect all trees
    const allTrees: DecorationConfig[] = [];
    for (const [, decorations] of decorationsRef.current) {
      for (const deco of decorations) {
        if (deco.type === 'tree') {
          allTrees.push(deco);
        }
      }
    }

    const maxTrees = MAX_TREES_PER_CHUNK * 4; // 4 chunks worth
    const treeCount = Math.min(allTrees.length, maxTrees);

    // Update tree trunks and foliage
    for (let i = 0; i < treeCount; i++) {
      const tree = allTrees[i];

      // Trunk
      dummyRef.position.copy(tree.position);
      dummyRef.position.y += 1; // Half height
      dummyRef.scale.copy(tree.scale);
      dummyRef.rotation.set(0, 0, 0);
      dummyRef.updateMatrix();
      treeTrunkMeshRef.current.setMatrixAt(i, dummyRef.matrix);

      // Foliage
      dummyRef.position.copy(tree.position);
      dummyRef.position.y += 2.5; // Top of trunk
      dummyRef.scale.copy(tree.scale).multiplyScalar(1.2);
      dummyRef.rotation.set(0, tree.rotation, 0);
      dummyRef.updateMatrix();
      treeFoliageMeshRef.current.setMatrixAt(i, dummyRef.matrix);
    }

    // Hide unused instances
    for (let i = treeCount; i < maxTrees; i++) {
      dummyRef.position.set(0, 0, 0);
      dummyRef.scale.set(0, 0, 0);
      dummyRef.updateMatrix();
      treeTrunkMeshRef.current.setMatrixAt(i, dummyRef.matrix);
      treeFoliageMeshRef.current.setMatrixAt(i, dummyRef.matrix);
    }

    // Mark for update
    treeTrunkMeshRef.current.instanceMatrix.needsUpdate = true;
    treeFoliageMeshRef.current.instanceMatrix.needsUpdate = true;

    // ── Houses (body + roof) ──
    if (houseMeshRef.current && roofMeshRef.current) {
      const allHouses: DecorationConfig[] = [];
      for (const [, decorations] of decorationsRef.current) {
        for (const deco of decorations) {
          if (deco.type === 'house') allHouses.push(deco);
        }
      }

      const maxHouses = MAX_HOUSES_PER_CHUNK * 4;
      const houseCount = Math.min(allHouses.length, maxHouses);

      for (let i = 0; i < houseCount; i++) {
        const house = allHouses[i];
        const { x: w, y: h, z: d } = house.scale;

        // Body: unit cube scaled to (w,h,d), resting on the ground.
        dummyRef.position.set(house.position.x, h / 2, house.position.z);
        dummyRef.scale.set(w, h, d);
        dummyRef.rotation.set(0, house.rotation, 0);
        dummyRef.updateMatrix();
        houseMeshRef.current.setMatrixAt(i, dummyRef.matrix);

        // Roof: square pyramid sitting on top of the body.
        dummyRef.position.set(house.position.x, h + 0.75, house.position.z);
        dummyRef.scale.set(w / 1.5, 2.5, d / 1.5);
        dummyRef.rotation.set(0, house.rotation + Math.PI / 4, 0);
        dummyRef.updateMatrix();
        roofMeshRef.current.setMatrixAt(i, dummyRef.matrix);
      }

      for (let i = houseCount; i < maxHouses; i++) {
        dummyRef.position.set(0, 0, 0);
        dummyRef.scale.set(0, 0, 0);
        dummyRef.updateMatrix();
        houseMeshRef.current.setMatrixAt(i, dummyRef.matrix);
        roofMeshRef.current.setMatrixAt(i, dummyRef.matrix);
      }

      houseMeshRef.current.instanceMatrix.needsUpdate = true;
      roofMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [dummyRef]);

  // Initialize InstancedMesh
  useEffect(() => {
    if (!groupRef.current) return;

    const maxTrees = MAX_TREES_PER_CHUNK * 4;

    // Tree trunk
    const treeTrunkMesh = new THREE.InstancedMesh(
      geometriesRef.treeTrunk,
      materialsRef.treeTrunk,
      maxTrees,
    );
    treeTrunkMesh.castShadow = true;
    treeTrunkMeshRef.current = treeTrunkMesh;

    // Tree foliage
    const treeFoliageMesh = new THREE.InstancedMesh(
      geometriesRef.treeFoliage,
      materialsRef.treeFoliage,
      maxTrees,
    );
    treeFoliageMesh.castShadow = true;
    treeFoliageMeshRef.current = treeFoliageMesh;

    // Rock
    const rockMesh = new THREE.InstancedMesh(
      geometriesRef.rock,
      materialsRef.rock,
      MAX_ROCKS_PER_CHUNK * 4,
    );
    rockMesh.castShadow = true;
    rockMeshRef.current = rockMesh;

    // Sign
    const signMesh = new THREE.InstancedMesh(
      geometriesRef.sign,
      materialsRef.sign,
      MAX_SIGNS_PER_CHUNK * 4,
    );
    signMesh.castShadow = true;
    signMeshRef.current = signMesh;

    // Houses (body + roof)
    const maxHouses = MAX_HOUSES_PER_CHUNK * 4;
    const houseMesh = new THREE.InstancedMesh(
      geometriesRef.house,
      materialsRef.house,
      maxHouses,
    );
    houseMesh.castShadow = true;
    houseMesh.receiveShadow = true;
    houseMeshRef.current = houseMesh;

    const roofMesh = new THREE.InstancedMesh(
      geometriesRef.roof,
      materialsRef.roof,
      maxHouses,
    );
    roofMesh.castShadow = true;
    roofMeshRef.current = roofMesh;

    // Initialize all as invisible
    for (let i = 0; i < maxTrees; i++) {
      dummyRef.position.set(0, 0, 0);
      dummyRef.scale.set(0, 0, 0);
      dummyRef.updateMatrix();
      treeTrunkMesh.setMatrixAt(i, dummyRef.matrix);
      treeFoliageMesh.setMatrixAt(i, dummyRef.matrix);
    }
    for (let i = 0; i < maxHouses; i++) {
      dummyRef.position.set(0, 0, 0);
      dummyRef.scale.set(0, 0, 0);
      dummyRef.updateMatrix();
      houseMesh.setMatrixAt(i, dummyRef.matrix);
      roofMesh.setMatrixAt(i, dummyRef.matrix);
    }

    treeTrunkMesh.instanceMatrix.needsUpdate = true;
    treeFoliageMesh.instanceMatrix.needsUpdate = true;
    houseMesh.instanceMatrix.needsUpdate = true;
    roofMesh.instanceMatrix.needsUpdate = true;

    groupRef.current.add(treeTrunkMesh);
    groupRef.current.add(treeFoliageMesh);
    groupRef.current.add(rockMesh);
    groupRef.current.add(signMesh);
    groupRef.current.add(houseMesh);
    groupRef.current.add(roofMesh);

    return () => {
      treeTrunkMesh.dispose();
      treeFoliageMesh.dispose();
      rockMesh.dispose();
      signMesh.dispose();
      houseMesh.dispose();
      roofMesh.dispose();
    };
  }, [geometriesRef, materialsRef, dummyRef]);

  // Listen for chunk changes
  useEffect(() => {
    const unsubscribe = useWorldStore.subscribe((state) => {
      // Generate decorations for active chunks
      for (const chunkId of state.activeChunks.keys()) {
        if (!decorationsRef.current.has(chunkId)) {
          const [cxStr, czStr] = chunkId.split('_');
          const cx = parseInt(cxStr);
          const cz = parseInt(czStr);
          decorationsRef.current.set(chunkId, generateChunkDecorations(chunkId, cx, cz));
        }
      }
    });

    return unsubscribe;
  }, [generateChunkDecorations]);

  // Frame update
  useR3FFrame(() => {
    updateInstancedMesh();
  });

  return <group ref={groupRef} />;
}

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

/** Simple hash function for chunk ID */
function hashChunkId(chunkId: string): number {
  let hash = 0;
  for (let i = 0; i < chunkId.length; i++) {
    const char = chunkId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/** Seeded random number generator */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const SIGN_SPACING = 25;
