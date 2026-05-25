// src/components/world/TrafficSystem.tsx

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { useWorldStore } from '../../stores/worldStore';

const LANE_WIDTH = 4;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const SPAWN_DISTANCE = 120;
const DESPAWN_DISTANCE = 150;
const MAX_TRAFFIC = 30;

interface TrafficCar {
  id: number;
  mesh: THREE.Group;
  lane: number;
  speed: number;
  zPos: number;
  type: 'sedan' | 'truck' | 'sports';
  targetLane: number;
}

const CAR_COLORS: Record<string, string> = {
  sedan: '#64748b',
  truck: '#92400e',
  sports: '#0ea5e9'
};

export function TrafficSystem() {
  const groupRef = useRef(new THREE.Group());
  const carsRef = useRef<TrafficCar[]>([]);
  const nextIdRef = useRef(0);

  const spawnCar = useCallback(() => {
    const worldState = useWorldStore.getState();
    const playerZ = worldState.playerPosition.z;
    
    const spawnZ = playerZ + SPAWN_DISTANCE + Math.random() * 50;
    const laneIndex = Math.floor(Math.random() * LANES.length);
    const laneX = LANES[laneIndex];
    const speed = 15 + Math.random() * 25; // m/s
    const type = Math.random() > 0.7 ? 'truck' : (Math.random() > 0.5 ? 'sports' : 'sedan');

    const mesh = new THREE.Group();
    const length = type === 'truck' ? 8 : (type === 'sports' ? 4 : 4.5);
    const height = type === 'truck' ? 2.5 : 1.2;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, height, length),
      new THREE.MeshStandardMaterial({ color: CAR_COLORS[type], metalness: 0.4, roughness: 0.5 })
    );
    body.position.y = height / 2 + 0.2;
    body.castShadow = true;
    mesh.add(body);

    mesh.position.set(laneX, 0, spawnZ);
    groupRef.current.add(mesh);

    carsRef.current.push({
      id: nextIdRef.current++,
      mesh,
      lane: laneIndex,
      speed,
      zPos: spawnZ,
      type,
      targetLane: laneIndex
    });
  }, []);

  useEffect(() => {
    // Initial spawn
    for (let i = 0; i < 10; i++) spawnCar();
  }, [spawnCar]);

  useFrame((_, delta) => {
    const worldState = useWorldStore.getState();
    const playerZ = worldState.playerPosition.z;
    const cars = carsRef.current;

    // 1. Remove off-screen cars
    const toRemove: number[] = [];
    for (let i = cars.length - 1; i >= 0; i--) {
      if (cars[i].zPos < playerZ - DESPAWN_DISTANCE) {
        groupRef.current.remove(cars[i].mesh);
        cars[i].mesh.children.forEach(c => {
          const m = c as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
          else m.material?.dispose();
        });
        toRemove.push(i);
      }
    }
    toRemove.forEach(i => cars.splice(i, 1));

    // 2. Spawn new cars
    while (cars.length < MAX_TRAFFIC) {
      spawnCar();
    }

    // 3. Update traffic positions & simple AI
    for (const car of cars) {
      car.zPos -= (car.speed * delta);
      car.mesh.position.z = car.zPos;

      // Simple lane change logic (periodic)
      if (Math.random() < 0.005) {
        car.targetLane = Math.floor(Math.random() * LANES.length);
      }
      
      // Smooth lane transition
      const targetX = LANES[car.targetLane];
      car.mesh.position.x = THREE.MathUtils.lerp(car.mesh.position.x, targetX, delta * 2.0);
      car.lane = car.targetLane;
      
      // Visual tilt during lane change
      const steerAngle = (car.mesh.position.x - targetX) * 0.05;
      car.mesh.rotation.y = -steerAngle;
    }
  });

  return <primitive object={groupRef.current} />;
}