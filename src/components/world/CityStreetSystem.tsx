/**
 * CityStreetSystem — orthogonal local street grid for commercial/residential
 * districts.
 *
 * The highway corridor is handled by HighwayNetworkSystem; off-corridor city and
 * suburban chunks (per the authoritative ZoneManager) get a real little street
 * network here instead of buildings scattered on bare terrain. Streets are laid
 * out deterministically on a fixed sub-grid of each 100m chunk and batch-rendered
 * with InstancedMesh (asphalt strips + centre-line markings), mirroring the
 * pooling/hide-unused-instance pattern used by DecorationBatchSystem.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { WORLD } from '@/constants/world';
import { zoneAtChunk } from '@/systems/ZoneManager';

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

const STREET_WIDTH = 6;
const STREET_Y = 0.03;       // just above the terrain plane
const MARKING_Y = 0.05;      // just above the asphalt
const MARKING_WIDTH = 0.3;

// Street centre-lines as a fraction of the chunk, giving a 3×3 block grid.
const STREET_DIVS = [-1 / 3, 0, 1 / 3];
const SEGMENTS_PER_CHUNK = STREET_DIVS.length * 2; // X-running + Z-running
const MAX_CITY_CHUNKS = 64;
const MAX_SEGMENTS = MAX_CITY_CHUNKS * SEGMENTS_PER_CHUNK;

/* ─────────────────────────────────────────────
 * Types & helpers
 * ───────────────────────────────────────────── */

interface StreetSegment {
  x: number;
  z: number;
  sx: number;
  sz: number;
  horiz: boolean; // long axis runs along X
}

/** Does this chunk get a city street grid? */
function isStreetZone(cx: number, cz: number): boolean {
  const zone = zoneAtChunk(cx, cz);
  return zone === 'cityCenter' || zone === 'suburban';
}

/** Deterministic street segments for one chunk (centred on cx*100). */
function chunkStreets(cx: number, cz: number): StreetSegment[] {
  const size = WORLD.CHUNK_SIZE;
  const ox = cx * size;
  const oz = cz * size;
  const segs: StreetSegment[] = [];
  for (const f of STREET_DIVS) {
    // X-running street (spans the chunk in X)
    segs.push({ x: ox, z: oz + f * size, sx: size, sz: STREET_WIDTH, horiz: true });
    // Z-running street (spans the chunk in Z)
    segs.push({ x: ox + f * size, z: oz, sx: STREET_WIDTH, sz: size, horiz: false });
  }
  return segs;
}

/* ─────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────── */

export function CityStreetSystem() {
  const groupRef = useRef<THREE.Group>(null);
  const streetMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const markingMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Per-chunk street data, keyed by chunkId.
  const streetsRef = useRef<Map<string, StreetSegment[]>>(new Map());

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const geometries = useMemo(() => ({
    // Unit plane-ish box; per-instance scale sets real dimensions.
    street: new THREE.BoxGeometry(1, 0.04, 1),
    marking: new THREE.BoxGeometry(1, 0.04, 1),
  }), []);

  const materials = useMemo(() => ({
    street: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.95 }),
    marking: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.15,
      roughness: 0.6,
    }),
  }), []);

  // Initialize instanced meshes.
  useEffect(() => {
    if (!groupRef.current) return;

    const streetMesh = new THREE.InstancedMesh(geometries.street, materials.street, MAX_SEGMENTS);
    streetMesh.receiveShadow = true;
    streetMeshRef.current = streetMesh;

    const markingMesh = new THREE.InstancedMesh(geometries.marking, materials.marking, MAX_SEGMENTS);
    markingMeshRef.current = markingMesh;

    // Start hidden.
    dummy.position.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      streetMesh.setMatrixAt(i, dummy.matrix);
      markingMesh.setMatrixAt(i, dummy.matrix);
    }
    streetMesh.instanceMatrix.needsUpdate = true;
    markingMesh.instanceMatrix.needsUpdate = true;

    groupRef.current.add(streetMesh);
    groupRef.current.add(markingMesh);

    return () => {
      streetMesh.dispose();
      markingMesh.dispose();
    };
  }, [geometries, materials, dummy]);

  // Generate street data for newly active city/suburban chunks.
  useEffect(() => {
    const unsubscribe = useWorldStore.subscribe((state) => {
      for (const chunkId of state.activeChunks.keys()) {
        if (streetsRef.current.has(chunkId)) continue;
        const [cxStr, czStr] = chunkId.split('_');
        const cx = parseInt(cxStr);
        const cz = parseInt(czStr);
        streetsRef.current.set(chunkId, isStreetZone(cx, cz) ? chunkStreets(cx, cz) : []);
      }
      // Drop streets for chunks that have unloaded.
      for (const chunkId of streetsRef.current.keys()) {
        if (!state.activeChunks.has(chunkId)) streetsRef.current.delete(chunkId);
      }
    });
    return unsubscribe;
  }, []);

  // Write all current segments into the instanced meshes each frame.
  useFrame(() => {
    const streetMesh = streetMeshRef.current;
    const markingMesh = markingMeshRef.current;
    if (!streetMesh || !markingMesh) return;

    let i = 0;
    for (const segs of streetsRef.current.values()) {
      for (const seg of segs) {
        if (i >= MAX_SEGMENTS) break;

        // Asphalt strip.
        dummy.position.set(seg.x, STREET_Y, seg.z);
        dummy.scale.set(seg.sx, 1, seg.sz);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        streetMesh.setMatrixAt(i, dummy.matrix);

        // Centre-line marking (thin along the cross axis).
        dummy.position.set(seg.x, MARKING_Y, seg.z);
        dummy.scale.set(seg.horiz ? seg.sx : MARKING_WIDTH, 1, seg.horiz ? MARKING_WIDTH : seg.sz);
        dummy.updateMatrix();
        markingMesh.setMatrixAt(i, dummy.matrix);

        i++;
      }
      if (i >= MAX_SEGMENTS) break;
    }

    // Hide any leftover instances from previously-loaded chunks.
    dummy.position.set(0, 0, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let j = i; j < MAX_SEGMENTS; j++) {
      streetMesh.setMatrixAt(j, dummy.matrix);
      markingMesh.setMatrixAt(j, dummy.matrix);
    }

    streetMesh.instanceMatrix.needsUpdate = true;
    markingMesh.instanceMatrix.needsUpdate = true;
  });

  return <group ref={groupRef} />;
}
