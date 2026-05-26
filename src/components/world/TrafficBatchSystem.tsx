/**
 * TrafficBatchSystem — Batch-rendered traffic car system using InstancedMesh.
 *
 * This system renders all traffic cars using InstancedMesh for each car part
 * (body, cabin, wheels), dramatically reducing draw calls from O(n*7) to O(7).
 *
 * Features:
 * - InstancedMesh rendering for body, cabin, and wheels
 * - Dynamic instance updates per frame
 * - Automatic spawn/despawn based on player position
 * - Lane changing AI
 * - Color variation per car
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { usePerformanceStore } from '@/stores/performanceStore';

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

// Lane X positions = lane CENTRES (matching HighwayNetworkSystem layout).
// Right side (+X) = same direction as player (+Z), left side (-X) = oncoming (-Z).
const LANES_SAME_DIR  = [4.35, 8.05];   // right inner + right outer lane centres
const LANES_ONCOMING  = [-4.35, -8.05]; // left inner + left outer lane centres
const ALL_LANES = [...LANES_SAME_DIR, ...LANES_ONCOMING];
const SPAWN_RANGE_AHEAD  = 200;  // max distance ahead of player to spawn
const SPAWN_RANGE_BEHIND = 60;   // max distance behind player to spawn (for same-dir overtaking)
const DESPAWN_DISTANCE = 180;
const MAX_TRAFFIC = 24;

const CAR_TYPES = ['sedan', 'truck', 'sports'] as const;
const CAR_COLORS: Record<string, number> = {
  sedan: 0x64748b,
  truck: 0x92400e,
  sports: 0x0ea5e9,
  red: 0xe63946,
  blue: 0x457b9d,
  green: 0x2a9d8f,
  yellow: 0xe9c46a,
  black: 0x1d3557,
};

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

interface TrafficCarData {
  id: string;
  laneX: number;       // world X position of the lane centre
  direction: 1 | -1;  // +1 = same as player (+Z), -1 = oncoming (-Z)
  speed: number;
  zPos: number;
  type: 'sedan' | 'truck' | 'sports';
  color: number;
  bodyLength: number;
  bodyHeight: number;
}

/* ─────────────────────────────────────────────
 * TrafficBatchSystem Component
 * ───────────────────────────────────────────── */

export function TrafficBatchSystem() {
  const groupRef = useRef<THREE.Group>(null);
  const carsRef = useRef<Map<string, TrafficCarData>>(new Map());
  const nextIdRef = useRef(0);

  // InstancedMesh refs for each car part
  const bodyMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const cabinMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const wheelMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Color buffer for instances
  const colorArrayRef = useMemo(() => {
    const colors = new Float32Array(MAX_TRAFFIC * 3);
    return colors;
  }, []);

  // Dummy object for matrix updates
  const dummyRef = useMemo(() => new THREE.Object3D(), []);

  // Shared geometry (memoized)
  const geometriesRef = useMemo(() => ({
    body: new THREE.BoxGeometry(2, 1, 4.5),
    cabin: new THREE.BoxGeometry(1.6, 0.7, 2.2),
    wheel: new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16),
  }), []);

  // Shared materials (memoized)
  const materialsRef = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.5 }),
    cabin: new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.3 }),
    wheel: new THREE.MeshStandardMaterial({ color: 0x2b2d42, metalness: 0.3, roughness: 0.7 }),
  }), []);

  /**
   * Spawn a new traffic car
   */
  const spawnCar = useCallback(() => {
    const worldState = useWorldStore.getState();
    const playerZ = worldState.playerPosition?.z ?? 0;

    // Pick a random lane (lane centres)
    const laneX = ALL_LANES[Math.floor(Math.random() * ALL_LANES.length)];
    const direction: 1 | -1 = laneX > 0 ? 1 : -1;

    let spawnZ: number;
    if (direction === 1) {
      // Same-direction: mix of ahead (50-200) and just behind (-60 to -10).
      // Behind-spawns let traffic overtake the player visually.
      if (Math.random() < 0.7) {
        spawnZ = playerZ + 50 + Math.random() * (SPAWN_RANGE_AHEAD - 50);
      } else {
        spawnZ = playerZ - 10 - Math.random() * SPAWN_RANGE_BEHIND;
      }
    } else {
      // Oncoming: always spawn ahead so they approach the player from +Z
      spawnZ = playerZ + 80 + Math.random() * (SPAWN_RANGE_AHEAD - 80);
    }

    const baseSpeed = 18 + Math.random() * 22;
    const type = CAR_TYPES[Math.floor(Math.random() * CAR_TYPES.length)];
    const colorKey = Object.keys(CAR_COLORS)[Math.floor(Math.random() * Object.keys(CAR_COLORS).length)];
    const color = CAR_COLORS[colorKey];

    const bodyLength = type === 'truck' ? 8 : (type === 'sports' ? 4 : 4.5);
    const bodyHeight = type === 'truck' ? 2.5 : 1.2;

    const carId = `traffic_${nextIdRef.current++}`;

    carsRef.current.set(carId, {
      id: carId,
      laneX,
      direction,
      speed: baseSpeed,
      zPos: spawnZ,
      type,
      color,
      bodyLength,
      bodyHeight,
    });
  }, []);

  /**
   * Update InstancedMesh for all cars
   */
  const updateInstancedMesh = useCallback(() => {
    if (!bodyMeshRef.current || !cabinMeshRef.current || !wheelMeshRef.current) return;

    const cars = Array.from(carsRef.current.values());
    const count = Math.min(cars.length, MAX_TRAFFIC);

    // Update matrices and colors
    for (let i = 0; i < count; i++) {
      const car = cars[i];
      const { laneX, zPos, bodyLength, bodyHeight, direction } = car;
      // Oncoming cars face -Z (rotation.y = Math.PI); same-dir face +Z (rotation.y = 0)
      const yRot = direction === -1 ? Math.PI : 0;

      // Body
      dummyRef.position.set(laneX, bodyHeight / 2 + 0.2, zPos);
      dummyRef.scale.set(1, bodyHeight / 1.2, bodyLength / 4.5);
      dummyRef.rotation.set(0, yRot, 0);
      dummyRef.updateMatrix();
      bodyMeshRef.current!.setMatrixAt(i, dummyRef.matrix);

      // Set color
      const r = ((car.color >> 16) & 255) / 255;
      const g = ((car.color >> 8) & 255) / 255;
      const b = (car.color & 255) / 255;
      bodyMeshRef.current!.setColorAt(i, new THREE.Color(r, g, b));

      // Cabin (centred, slightly elevated and offset back)
      dummyRef.position.set(laneX, bodyHeight + 0.2 + 0.35, zPos - 0.2 * direction);
      dummyRef.scale.set(0.8, 0.5, 0.5);
      dummyRef.rotation.set(0, yRot, 0);
      dummyRef.updateMatrix();
      cabinMeshRef.current!.setMatrixAt(i, dummyRef.matrix);

      // Wheel
      dummyRef.position.set(laneX, 0.35, zPos);
      dummyRef.scale.set(1, 1, 1);
      dummyRef.rotation.set(0, yRot, Math.PI / 2);
      dummyRef.updateMatrix();
      wheelMeshRef.current!.setMatrixAt(i, dummyRef.matrix);
    }

    // Hide unused instances
    for (let i = count; i < MAX_TRAFFIC; i++) {
      dummyRef.position.set(0, 0, 0);
      dummyRef.scale.set(0, 0, 0);
      dummyRef.updateMatrix();
      bodyMeshRef.current!.setMatrixAt(i, dummyRef.matrix);
      cabinMeshRef.current!.setMatrixAt(i, dummyRef.matrix);
      wheelMeshRef.current!.setMatrixAt(i, dummyRef.matrix);
    }

    // Mark for update
    bodyMeshRef.current.instanceMatrix.needsUpdate = true;
    if (bodyMeshRef.current.instanceColor) {
      bodyMeshRef.current.instanceColor.needsUpdate = true;
    }
    cabinMeshRef.current.instanceMatrix.needsUpdate = true;
    wheelMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummyRef]);

  /**
   * Update traffic AI
   */
  const updateTrafficAI = useCallback((delta: number) => {
    const worldState = useWorldStore.getState();
    if (!worldState.playerPosition) return;
    const playerZ = worldState.playerPosition.z;

    // Move each car along its travel direction
    for (const [, car] of carsRef.current) {
      car.zPos += car.direction * car.speed * delta;
    }

    // Despawn cars far behind OR far ahead of the player (keeps density even
    // when the player drives slowly — same-direction cars that drift too far
    // ahead are removed and re-spawned closer).
    const toRemove: string[] = [];
    for (const [id, car] of carsRef.current) {
      const rel = car.zPos - playerZ;
      if (rel < -DESPAWN_DISTANCE || rel > DESPAWN_DISTANCE + 80) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      carsRef.current.delete(id);
    }

    // Spawn at most 2 new cars per frame so they appear staggered, not all at once
    let spawnsThisFrame = 0;
    while (carsRef.current.size < MAX_TRAFFIC && spawnsThisFrame < 2) {
      spawnCar();
      spawnsThisFrame++;
    }

    usePerformanceStore.getState().setActiveTrafficCars(carsRef.current.size);
  }, [spawnCar]);

  // Initialize InstancedMesh
  useEffect(() => {
    if (!groupRef.current) return;

    // Create InstancedMesh for body
    const bodyMesh = new THREE.InstancedMesh(
      geometriesRef.body,
      materialsRef.body,
      MAX_TRAFFIC,
    );
    bodyMesh.castShadow = true;
    // Disable frustum culling: the InstancedMesh's bounding sphere is computed
    // from initial instance positions (all at origin), so once the player
    // moves away from origin, the mesh's bounds no longer cover the actual
    // instance positions and the whole mesh gets culled. Without this fix,
    // all cars vanish as soon as the player moves.
    bodyMesh.frustumCulled = false;
    bodyMeshRef.current = bodyMesh;

    // Create InstancedMesh for cabin
    const cabinMesh = new THREE.InstancedMesh(
      geometriesRef.cabin,
      materialsRef.cabin,
      MAX_TRAFFIC,
    );
    cabinMesh.castShadow = true;
    cabinMesh.frustumCulled = false;
    cabinMeshRef.current = cabinMesh;

    // Create InstancedMesh for wheels
    const wheelMesh = new THREE.InstancedMesh(
      geometriesRef.wheel,
      materialsRef.wheel,
      MAX_TRAFFIC,
    );
    wheelMesh.castShadow = true;
    wheelMesh.frustumCulled = false;
    wheelMeshRef.current = wheelMesh;

    // Initialize all instances as invisible
    for (let i = 0; i < MAX_TRAFFIC; i++) {
      dummyRef.position.set(0, 0, 0);
      dummyRef.scale.set(0, 0, 0);
      dummyRef.updateMatrix();

      bodyMesh.setMatrixAt(i, dummyRef.matrix);
      cabinMesh.setMatrixAt(i, dummyRef.matrix);
      wheelMesh.setMatrixAt(i, dummyRef.matrix);
    }

    bodyMesh.instanceMatrix.needsUpdate = true;
    cabinMesh.instanceMatrix.needsUpdate = true;
    wheelMesh.instanceMatrix.needsUpdate = true;

    groupRef.current.add(bodyMesh);
    groupRef.current.add(cabinMesh);
    groupRef.current.add(wheelMesh);

    return () => {
      bodyMesh.dispose();
      cabinMesh.dispose();
      wheelMesh.dispose();
      carsRef.current.clear();
    };
  }, [geometriesRef, materialsRef, dummyRef]);

  // Frame update
  useFrame((_, delta) => {
    if (delta > 0) {
      updateTrafficAI(delta);
      updateInstancedMesh();
    }
  });

  return <group ref={groupRef} />;
}
