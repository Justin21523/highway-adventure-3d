// src/components/world/CollisionManager.tsx

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { CollisionSystem } from '../../physics/CollisionSystem';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';
import { VEHICLE_DEFAULTS } from '../../constants/physics';

export function CollisionManager() {
  const groupRef = useRef<THREE.Group>(null);
  
  const obstaclePool = useMemo(() => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 1.8),
      new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.3, roughness: 0.6 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, []);

  const activeObstacles = useRef<Array<{ id: number; position: THREE.Vector3; active: boolean }>>([]);

  useFrame((_) => {
    const state = useGameStore.getState();
    const pPos = new THREE.Vector3(state.playerPosition.x, state.playerPosition.y, state.playerPosition.z);
    const pVel = new THREE.Vector3(0, 0, state.vehicle.speed / 3.6);
    const playerAABB = CollisionSystem.createAABB(
      { x: pPos.x, y: pPos.y, z: pPos.z },
      { x: 1.0, y: 0.5, z: 2.25 }
    );

    // Procedural Spawning
    if (activeObstacles.current.length < 6 && state.vehicle.speed > 20 && Math.random() < 0.004) {
      const spawnZ = pPos.z + 120 + Math.random() * 40;
      const playerLane = Math.round(pPos.x / 4) * 4;
      const lanes = [-8, -4, 0, 4, 8].filter((lane) => Math.abs(lane - playerLane) > 2);
      const lane = lanes[Math.floor(Math.random() * lanes.length)] ?? 0;
      activeObstacles.current.push({
        id: Math.random(),
        position: new THREE.Vector3(lane, 0.5, spawnZ),
        active: true
      });
    }

    let hitThisFrame = false;

    activeObstacles.current = activeObstacles.current.filter(obs => {
      if (!obs.active) return false;
      if (obs.position.z < pPos.z - 25) {
        obs.active = false;
        return false;
      }

      const obsAABB = CollisionSystem.createAABB(
        { x: obs.position.x, y: obs.position.y, z: obs.position.z },
        { x: 0.9, y: 0.5, z: 0.9 }
      );
      const overlap = CollisionSystem.checkAABB(playerAABB, obsAABB);

      if (overlap && !hitThisFrame) {
        hitThisFrame = true;
        const response = CollisionSystem.applyResponse(
          { x: pVel.x, y: pVel.y, z: pVel.z },
          { x: overlap.x, y: overlap.y, z: overlap.z },
          VEHICLE_DEFAULTS.MASS,
          8
        );

        const damage = Math.min(12, response.damage);
        useGameStore.setState(s => ({
          vehicle: {
            ...s.vehicle,
            speed: Math.max(0, Math.min(s.vehicle.speed, Math.abs(response.newVelocity.z) * 3.6)),
            isDrifting: true,
            health: Math.max(5, s.vehicle.health - damage)
          }
        }));

        VFXManager.getInstance().spawn('spark', { x: obs.position.x, y: obs.position.y + 0.5, z: obs.position.z }, 1.5, 12);
        VFXManager.getInstance().spawn('smoke', { x: obs.position.x, y: obs.position.y, z: obs.position.z }, 1.0, 6);
        AudioManager.getInstance().playImpact(0.8);
        
        obs.active = false;
        return false;
      }
      return true;
    });

    // Visual Sync (Direct manipulation to avoid React overhead)
    if (groupRef.current) {
      while (groupRef.current.children.length < 15) {
        groupRef.current.add(obstaclePool.clone());
      }
      for (let i = 0; i < groupRef.current.children.length; i++) {
        const child = groupRef.current.children[i];
        const obs = activeObstacles.current[i];
        if (obs && obs.active) {
          child.position.copy(obs.position);
          child.visible = true;
        } else {
          child.visible = false;
          child.position.set(0, -10, 0);
        }
      }
    }
  });

  return <group ref={groupRef} />;
}
