// src/components/world/DynamicObstacles.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { CollisionSystem } from '../../physics/CollisionSystem';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';
import { VEHICLE } from '../../constants/physics';
import type { IVec3 } from '../../types/core';

const POOL_SIZE = 15;
const ROAD_W = 14;
const SPAWN_DIST = 100;

export function DynamicObstacles() {
  const groupRef = useRef<THREE.Group>(null);
  const obstacles = useRef<Array<{ mesh: THREE.Mesh; active: boolean; pos: IVec3; size: IVec3 }>>([]);
  const playerPosRef = useRef(new THREE.Vector3());

  const coneGeo = useMemo(() => new THREE.ConeGeometry(0.3, 0.8, 8), []);
  const coneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#f59e0b', emissiveIntensity: 0.3 }), []);
  const barrelGeo = useMemo(() => new THREE.CylinderGeometry(0.4, 0.4, 1, 8), []);
  const barrelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f3f46', metalness: 0.6 }), []);

  useMemo(() => {
    for (let i = 0; i < POOL_SIZE; i++) {
      const type = i % 3;
      const geo = type === 0 ? coneGeo : barrelGeo;
      const mat = type === 0 ? coneMat : barrelMat;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      groupRef.current?.add(mesh);
      obstacles.current.push({ mesh, active: false, pos: { x: 0, y: 0.4, z: 0 }, size: { x: 0.4, y: 0.4, z: 0.4 } });
    }
  }, []);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const pz = state.playerPosition.z;
    const pPos = state.playerPosition;
    playerPosRef.current.set(pPos.x, pPos.y, pPos.z);

    let hit = false;
    const playerAABB = CollisionSystem.createAABB(pPos, { x: 0.9, y: 0.4, z: 2.1 });

    for (let i = 0; i < POOL_SIZE; i++) {
      const obs = obstacles.current[i];
      if (!obs.active && state.vehicle.speed > 20 && Math.random() < 0.003) {
        obs.active = true;
        const playerLane = Math.round(pPos.x / (ROAD_W / 3)) * (ROAD_W / 3);
        const lanes = [-2, -1, 0, 1, 2]
          .map((lane) => lane * (ROAD_W / 3))
          .filter((lane) => Math.abs(lane - playerLane) > 2);
        const lane = lanes[Math.floor(Math.random() * lanes.length)] ?? 0;
        obs.pos = { x: lane, y: 0.4, z: pz + SPAWN_DIST + Math.random() * 40 };
      }

      if (!obs.active) { obs.mesh.visible = false; continue; }
      
      obs.mesh.position.set(obs.pos.x, obs.pos.y, obs.pos.z);
      if (obs.mesh.rotation.y) obs.mesh.rotation.y += delta * 0.5;

      const distZ = Math.abs(obs.pos.z - pz);
      if (distZ > 30) { obs.active = false; continue; }

      if (!hit) {
        const obsAABB = CollisionSystem.createAABB(obs.pos, obs.size);
        const { overlaps, overlapVec } = CollisionSystem.checkOverlap(playerAABB, obsAABB);
        if (overlaps && state.vehicle.speed > 10) {
          hit = true;
          const normal = { x: Math.sign(overlapVec.x), y: Math.sign(overlapVec.y), z: Math.sign(overlapVec.z) };
          const { newVelocity, damage } = CollisionSystem.resolveArcadeImpact(
            { x: 0, y: 0, z: state.vehicle.speed / 3.6 }, normal, VEHICLE.MASS, 0.2, 5
          );
          
          const cappedDamage = Math.min(10, damage);
          useGameStore.setState(s => ({
            vehicle: { ...s.vehicle, speed: Math.max(0, Math.min(s.vehicle.speed, Math.abs(newVelocity.z) * 3.6)), health: Math.max(5, s.vehicle.health - cappedDamage) }
          }));
          VFXManager.getInstance().spawn('smoke', obs.pos, 0.6, 4);
          AudioManager.getInstance().playImpact(0.5);
          obs.active = false;
        }
      }
    }
  });

  return <group ref={groupRef} />;
}
