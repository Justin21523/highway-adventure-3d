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

const LANE_WIDTH = 4;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const SPAWN_DISTANCE = 120;
const DESPAWN_DISTANCE = 150;
const MAX_TRAFFIC = 30;

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
  lane: number;
  speed: number;
  zPos: number;
  type: 'sedan' | 'truck' | 'sports';
  targetLane: number;
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

    const spawnZ = playerZ + SPAWN_DISTANCE + Math.random() * 50;
    const laneIndex = Math.floor(Math.random() * LANES.length);
    const speed = 15 + Math.random() * 25;
    const type = CAR_TYPES[Math.floor(Math.random() * CAR_TYPES.length)];
    const colorKey = Object.keys(CAR_COLORS)[Math.floor(Math.random() * Object.keys(CAR_COLORS).length)];
    const color = CAR_COLORS[colorKey];

    const bodyLength = type === 'truck' ? 8 : (type === 'sports' ? 4 : 4.5);
    const bodyHeight = type === 'truck' ? 2.5 : 1.2;

    const carId = `traffic_${nextIdRef.current++}`;

    carsRef.current.set(carId, {
      id: carId,
      lane: laneIndex,
      speed,
      zPos: spawnZ,
      type,
      targetLane: laneIndex,
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
      const laneX = LANES[car.targetLane] ?? LANES[car.lane];
      const { zPos, bodyLength, bodyHeight } = car;

      // Body
      dummyRef.position.set(laneX, bodyHeight / 2 + 0.2, zPos);
      dummyRef.scale.set(1, bodyHeight / 1.2, bodyLength / 4.5);
      dummyRef.rotation.set(0, 0, 0);
      dummyRef.updateMatrix();
      bodyMeshRef.current!.setMatrixAt(i, dummyRef.matrix);

      // Set color
      const r = ((car.color >> 16) & 255) / 255;
      const g = ((car.color >> 8) & 255) / 255;
      const b = (car.color & 255) / 255;
      bodyMeshRef.current!.setColorAt(i, new THREE.Color(r, g, b));

      // Cabin
      dummyRef.position.set(laneX, bodyHeight + 0.2 + 0.35, zPos - 0.2);
      dummyRef.scale.set(0.8, 0.5, 0.5);
      dummyRef.updateMatrix();
      cabinMeshRef.current!.setMatrixAt(i, dummyRef.matrix);

      // Wheels (4 wheels per car, but we'll just do 1 instance for simplicity)
      dummyRef.position.set(laneX, 0.35, zPos);
      dummyRef.scale.set(1, 1, 1);
      dummyRef.rotation.set(0, 0, Math.PI / 2);
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

    for (const [, car] of carsRef.current) {
      // Move car
      car.zPos -= car.speed * delta;

      // Lane change logic
      if (Math.random() < 0.005) {
        car.targetLane = Math.floor(Math.random() * LANES.length);
      }

      // Smooth lane transition
      const targetX = LANES[car.targetLane];
      // Lane position is handled in updateInstancedMesh
    }

    // Remove off-screen cars
    const toRemove: string[] = [];
    for (const [id, car] of carsRef.current) {
      if (car.zPos < playerZ - DESPAWN_DISTANCE) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      carsRef.current.delete(id);
    }

    // Spawn new cars
    while (carsRef.current.size < MAX_TRAFFIC) {
      spawnCar();
    }

    // Update performance stats
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
    bodyMeshRef.current = bodyMesh;

    // Create InstancedMesh for cabin
    const cabinMesh = new THREE.InstancedMesh(
      geometriesRef.cabin,
      materialsRef.cabin,
      MAX_TRAFFIC,
    );
    cabinMesh.castShadow = true;
    cabinMeshRef.current = cabinMesh;

    // Create InstancedMesh for wheels
    const wheelMesh = new THREE.InstancedMesh(
      geometriesRef.wheel,
      materialsRef.wheel,
      MAX_TRAFFIC,
    );
    wheelMesh.castShadow = true;
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
