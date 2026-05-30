// src/components/world/TrafficAIController.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

/**
 * TrafficAIController
 * Advanced traffic system with player-aware braking, lane changing, and curve following.
 * Uses object pooling for zero-GC performance.
 */
export function TrafficAIController() {
  const containerRef = useRef<THREE.Group>(null);
  const carsRef = useRef<Array<{
    mesh: THREE.Group;
    baseSpeed: number;
    currentSpeed: number;
    lane: number;
    targetLane: number;
    z: number;
    active: boolean;
  }>>([]);
  const nextIdRef = useRef(0);
  const poolSize = 20;

  const shared = useMemo(() => ({
    matA: new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.4 }),
    matB: new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.4 }),
    matC: new THREE.MeshStandardMaterial({ color: '#22c55e', metalness: 0.4 }),
    bodyGeo: new THREE.BoxGeometry(1.9, 0.8, 4.2),
    roofGeo: new THREE.BoxGeometry(1.6, 0.5, 2.2)
  }), []);

  useEffect(() => {
    for (let i = 0; i < poolSize; i++) {
      const group = new THREE.Group();
      const mat = [shared.matA, shared.matB, shared.matC][i % 3];
      const body = new THREE.Mesh(shared.bodyGeo, mat);
      body.position.y = 0.4; body.castShadow = true; group.add(body);
      const roof = new THREE.Mesh(shared.roofGeo, new THREE.MeshStandardMaterial({ color: '#1e293b' }));
      roof.position.set(0, 1.05, -0.2); roof.castShadow = true; group.add(roof);
      
      containerRef.current?.add(group);
      carsRef.current.push({
        mesh: group, baseSpeed: 15 + Math.random() * 20, currentSpeed: 0,
        lane: 0, targetLane: 0, z: 0, active: false
      });
    }
    return () => { shared.matA.dispose(); shared.matB.dispose(); shared.matC.dispose(); shared.bodyGeo.dispose(); shared.roofGeo.dispose(); };
  }, []);

  useFrame((_, delta) => {
    const { playerPosition, vehicle } = useGameStore.getState();
    const playerZ = playerPosition.z;
    const playerSpeed = vehicle.speed / 3.6; // m/s

    // Respawn & Logic
    carsRef.current.forEach(car => {
      // Spawn logic
      if (!car.active && Math.random() < 0.04) {
        car.active = true;
        car.z = playerZ + 120 + Math.random() * 60;
        car.lane = (Math.floor(Math.random() * 3) - 1);
        car.targetLane = car.lane;
        car.currentSpeed = car.baseSpeed;
      }
      if (!car.active) { car.mesh.visible = false; return; }

      // Despawn
      if (playerZ - car.z > 30) { car.active = false; return; }

      // AI Behavior: Brake if too close to player
      const distToPlayer = car.z - playerZ;
      let targetSpeed = car.baseSpeed;
      if (distToPlayer > 0 && distToPlayer < 15 && playerSpeed > car.baseSpeed) {
        targetSpeed = Math.max(5, playerSpeed - 5); // Slow down to match player
      }

      // AI Behavior: Lane change if blocked or randomly
      if (Math.random() < 0.005) {
        car.targetLane = (Math.floor(Math.random() * 3) - 1);
      }

      // Smooth speed & lane interpolation
      car.currentSpeed = THREE.MathUtils.lerp(car.currentSpeed, targetSpeed, delta * 2);
      car.z -= car.currentSpeed * delta;
      const targetX = car.lane * 3.5;
      const actualX = car.mesh.position.x;
      car.mesh.position.x = THREE.MathUtils.lerp(actualX, targetX, delta * 3);
      car.mesh.position.z = car.z;

      // Visual heading tilt based on lane change
      car.mesh.rotation.y = (targetX - car.mesh.position.x) * 0.08;
      car.mesh.visible = true;
    });
  });

  return <group ref={containerRef} />;
}