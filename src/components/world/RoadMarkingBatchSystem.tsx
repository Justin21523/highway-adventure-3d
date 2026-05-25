/**
 * RoadMarkingBatchSystem — Batch-rendered road markings using InstancedMesh.
 *
 * This system renders all road markings (center lines, lane dividers, edge lines,
 * crosswalks, arrows) using InstancedMesh for optimal performance.
 *
 * Features:
 * - Batch rendering for all road marking types
 * - Dashed lines using scale animation
 * - Different marking styles (solid, dashed, double)
 * - Automatic generation based on road configuration
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { WORLD } from '@/constants/world';

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

const CENTER_LINE_DASH_LENGTH = 3.0;
const CENTER_LINE_GAP_LENGTH = 4.0;
const CENTER_LINE_TOTAL_LENGTH = CENTER_LINE_DASH_LENGTH + CENTER_LINE_GAP_LENGTH;
const MAX_MARKINGS_PER_CHUNK = 100;

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Type of road marking */
export type MarkingType = 'centerLine' | 'laneDivider' | 'edgeLine' | 'crosswalk' | 'arrow';

/** Road marking configuration */
interface RoadMarking {
  type: MarkingType;
  position: THREE.Vector3;
  rotation: number;
  scale: THREE.Vector3;
  color: number;
}

/* ─────────────────────────────────────────────
 * RoadMarkingBatchSystem Component
 * ───────────────────────────────────────────── */

export function RoadMarkingBatchSystem() {
  const groupRef = useRef<THREE.Group>(null);

  // InstancedMesh refs for each marking type
  const centerLineMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const laneDividerMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const edgeLineMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const crosswalkMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Marking data per chunk
  const markingsRef = useRef<Map<string, RoadMarking[]>>(new Map());

  // Dummy for matrix updates
  const dummyRef = useMemo(() => new THREE.Object3D(), []);

  // Shared geometries
  const geometriesRef = useMemo(() => ({
    centerLine: new THREE.PlaneGeometry(0.15, CENTER_LINE_DASH_LENGTH),
    laneDivider: new THREE.PlaneGeometry(0.1, CENTER_LINE_DASH_LENGTH),
    edgeLine: new THREE.PlaneGeometry(0.12, 5),
    crosswalk: new THREE.PlaneGeometry(3.5, 0.3),
  }), []);

  // Shared materials
  const materialsRef = useMemo(() => ({
    centerLine: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
    laneDivider: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
    edgeLine: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
    crosswalk: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
  }), []);

  /**
   * Generate road markings for a chunk
   */
  const generateChunkMarkings = useCallback((chunkId: string, cx: number, cz: number): RoadMarking[] => {
    const markings: RoadMarking[] = [];
    const halfChunk = WORLD.CHUNK_SIZE / 2;
    const worldX = cx * WORLD.CHUNK_SIZE;
    const worldZ = cz * WORLD.CHUNK_SIZE;

    // Center line (dashed)
    for (let z = -halfChunk; z < halfChunk; z += CENTER_LINE_TOTAL_LENGTH) {
      markings.push({
        type: 'centerLine',
        position: new THREE.Vector3(worldX, 0.01, worldZ + z + CENTER_LINE_DASH_LENGTH / 2),
        rotation: 0,
        scale: new THREE.Vector3(1, 1, 1),
        color: 0xffffff,
      });
    }

    // Lane dividers (dashed)
    for (let lane = -1; lane <= 1; lane += 2) {
      const laneX = worldX + lane * 4; // 4m per lane
      for (let z = -halfChunk; z < halfChunk; z += CENTER_LINE_TOTAL_LENGTH) {
        markings.push({
          type: 'laneDivider',
          position: new THREE.Vector3(laneX, 0.01, worldZ + z + CENTER_LINE_DASH_LENGTH / 2),
          rotation: 0,
          scale: new THREE.Vector3(1, 1, 1),
          color: 0xffffff,
        });
      }
    }

    // Edge lines (solid)
    for (let side = -1; side <= 1; side += 2) {
      const edgeX = worldX + side * (WORLD.CHUNK_SIZE / 2 - 2);
      markings.push({
        type: 'edgeLine',
        position: new THREE.Vector3(edgeX, 0.01, worldZ),
        rotation: 0,
        scale: new THREE.Vector3(1, 1, 1),
        color: 0xffff00, // Yellow for edge
      });
    }

    // Crosswalks (periodic)
    const crosswalkSpacing = 50;
    for (let z = -halfChunk; z < halfChunk; z += crosswalkSpacing) {
      markings.push({
        type: 'crosswalk',
        position: new THREE.Vector3(worldX, 0.01, worldZ + z + crosswalkSpacing / 2),
        rotation: 0,
        scale: new THREE.Vector3(1, 1, 1),
        color: 0xffffff,
      });
    }

    return markings;
  }, []);

  /**
   * Update InstancedMesh for all markings
   */
  const updateInstancedMesh = useCallback(() => {
    if (!centerLineMeshRef.current || !laneDividerMeshRef.current) return;

    // Collect all markings by type
    const centerLines: RoadMarking[] = [];
    const laneDividers: RoadMarking[] = [];
    const edgeLines: RoadMarking[] = [];
    const crosswalks: RoadMarking[] = [];

    for (const [, markings] of markingsRef.current) {
      for (const marking of markings) {
        switch (marking.type) {
          case 'centerLine':
            centerLines.push(marking);
            break;
          case 'laneDivider':
            laneDividers.push(marking);
            break;
          case 'edgeLine':
            edgeLines.push(marking);
            break;
          case 'crosswalk':
            crosswalks.push(marking);
            break;
        }
      }
    }

    // Update center lines
    const maxCenterLines = MAX_MARKINGS_PER_CHUNK * 4;
    for (let i = 0; i < Math.min(centerLines.length, maxCenterLines); i++) {
      const marking = centerLines[i];
      dummyRef.position.copy(marking.position);
      dummyRef.rotation.set(0, marking.rotation, 0);
      dummyRef.scale.copy(marking.scale);
      dummyRef.updateMatrix();
      centerLineMeshRef.current.setMatrixAt(i, dummyRef.matrix);
    }

    // Hide unused
    for (let i = centerLines.length; i < maxCenterLines; i++) {
      dummyRef.position.set(0, 0, 0);
      dummyRef.scale.set(0, 0, 0);
      dummyRef.updateMatrix();
      centerLineMeshRef.current.setMatrixAt(i, dummyRef.matrix);
    }

    centerLineMeshRef.current.instanceMatrix.needsUpdate = true;

    // Update lane dividers
    const maxLaneDividers = MAX_MARKINGS_PER_CHUNK * 4;
    for (let i = 0; i < Math.min(laneDividers.length, maxLaneDividers); i++) {
      const marking = laneDividers[i];
      dummyRef.position.copy(marking.position);
      dummyRef.rotation.set(0, marking.rotation, 0);
      dummyRef.scale.copy(marking.scale);
      dummyRef.updateMatrix();
      laneDividerMeshRef.current.setMatrixAt(i, dummyRef.matrix);
    }

    laneDividerMeshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  // Initialize InstancedMesh
  useEffect(() => {
    if (!groupRef.current) return;

    const maxMarkings = MAX_MARKINGS_PER_CHUNK * 4;

    // Center line
    const centerLineMesh = new THREE.InstancedMesh(
      geometriesRef.centerLine,
      materialsRef.centerLine,
      maxMarkings,
    );
    centerLineMesh.receiveShadow = true;
    centerLineMeshRef.current = centerLineMesh;

    // Lane divider
    const laneDividerMesh = new THREE.InstancedMesh(
      geometriesRef.laneDivider,
      materialsRef.laneDivider,
      maxMarkings,
    );
    laneDividerMesh.receiveShadow = true;
    laneDividerMeshRef.current = laneDividerMesh;

    // Edge line
    const edgeLineMesh = new THREE.InstancedMesh(
      geometriesRef.edgeLine,
      materialsRef.edgeLine,
      maxMarkings,
    );
    edgeLineMesh.receiveShadow = true;
    edgeLineMeshRef.current = edgeLineMesh;

    // Crosswalk
    const crosswalkMesh = new THREE.InstancedMesh(
      geometriesRef.crosswalk,
      materialsRef.crosswalk,
      maxMarkings,
    );
    crosswalkMesh.receiveShadow = true;
    crosswalkMeshRef.current = crosswalkMesh;

    // Initialize all as invisible
    for (let i = 0; i < maxMarkings; i++) {
      dummyRef.position.set(0, 0, 0);
      dummyRef.scale.set(0, 0, 0);
      dummyRef.updateMatrix();
      centerLineMesh.setMatrixAt(i, dummyRef.matrix);
      laneDividerMesh.setMatrixAt(i, dummyRef.matrix);
      edgeLineMesh.setMatrixAt(i, dummyRef.matrix);
      crosswalkMesh.setMatrixAt(i, dummyRef.matrix);
    }

    centerLineMesh.instanceMatrix.needsUpdate = true;
    laneDividerMesh.instanceMatrix.needsUpdate = true;
    edgeLineMesh.instanceMatrix.needsUpdate = true;
    crosswalkMesh.instanceMatrix.needsUpdate = true;

    groupRef.current.add(centerLineMesh);
    groupRef.current.add(laneDividerMesh);
    groupRef.current.add(edgeLineMesh);
    groupRef.current.add(crosswalkMesh);

    return () => {
      centerLineMesh.dispose();
      laneDividerMesh.dispose();
      edgeLineMesh.dispose();
      crosswalkMesh.dispose();
    };
  }, [geometriesRef, materialsRef, dummyRef]);

  // Listen for chunk changes
  useEffect(() => {
    const unsubscribe = useWorldStore.subscribe((state) => {
      // Generate markings for active chunks
      for (const chunkId of state.activeChunks.keys()) {
        if (!markingsRef.current.has(chunkId)) {
          const [cxStr, czStr] = chunkId.split('_');
          const cx = parseInt(cxStr);
          const cz = parseInt(czStr);
          markingsRef.current.set(chunkId, generateChunkMarkings(chunkId, cx, cz));
        }
      }
    });

    return unsubscribe;
  }, [generateChunkMarkings]);

  // Frame update
  useFrame(() => {
    updateInstancedMesh();
  });

  return <group ref={groupRef} />;
}
