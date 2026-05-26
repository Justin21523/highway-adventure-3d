// src/components/world/ParallaxScenery.tsx

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

const PARALLAX_RADIUS = 400;
const SCENERY_COUNT = 16;

export function ParallaxScenery() {
  const containerRef = useRef<THREE.Group>(null);
  const sceneryRef = useRef<Array<{ mesh: THREE.Group; distance: number; angle: number; height: number }>>([]);
  const lastPosRef = useRef(new THREE.Vector3());

  const shared = useMemo(() => {
    const mountainGeo = new THREE.ConeGeometry(15, 25, 5);
    const mountainMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 1, flatShading: true });
    const towerGeo = new THREE.BoxGeometry(4, 40, 4);
    const towerMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.3, roughness: 0.6 });
    const cityBlockGeo = new THREE.BoxGeometry(20, 12, 10);
    const cityBlockMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 });

    return { mountainGeo, mountainMat, towerGeo, towerMat, cityBlockGeo, cityBlockMat };
  }, []);

  useEffect(() => {
    for (let i = 0; i < SCENERY_COUNT; i++) {
      const group = new THREE.Group();
      const type = i % 3;
      let mesh: THREE.Mesh;

      if (type === 0) {
        mesh = new THREE.Mesh(shared.mountainGeo, shared.mountainMat);
        mesh.scale.set(1 + Math.random() * 0.5, 0.8 + Math.random() * 0.6, 1 + Math.random() * 0.5);
      } else if (type === 1) {
        mesh = new THREE.Mesh(shared.towerGeo, shared.towerMat);
        mesh.position.y = -5;
      } else {
        mesh = new THREE.Mesh(shared.cityBlockGeo, shared.cityBlockMat);
        mesh.position.y = -3;
        mesh.rotation.y = Math.random() * Math.PI;
      }

      mesh.castShadow = true;
      group.add(mesh);

      const angle = (i / SCENERY_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const distance = PARALLAX_RADIUS * 0.6 + Math.random() * PARALLAX_RADIUS * 0.4;
      
      group.position.set(Math.cos(angle) * distance, 10 + Math.random() * 15, Math.sin(angle) * distance);
      containerRef.current?.add(group);

      sceneryRef.current.push({ mesh: group, distance, angle, height: group.position.y });
    }
  }, [shared]);

  useFrame(() => {
    const { playerPosition, vehicle } = useGameStore.getState();
    const currentPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    
    // Calculate player movement delta this frame
    const deltaPos = new THREE.Vector3().subVectors(currentPos, lastPosRef.current);
    lastPosRef.current.copy(currentPos);

    // Only move if car is actually moving
    if (vehicle.speed < 1) return;

    const deltaLen = deltaPos.length();
    const moveDir = deltaPos.normalize();

    sceneryRef.current.forEach(obj => {
      // Parallax formula: movement decays with distance
      const parallaxFactor = Math.max(0, 1.0 - (obj.distance / PARALLAX_RADIUS));
      const moveAmount = deltaLen * parallaxFactor;

      // Move opposite to player direction to create forward illusion
      obj.mesh.position.x -= moveDir.x * moveAmount;
      obj.mesh.position.z -= moveDir.z * moveAmount;

      // Wrap around logic to keep scenery in a persistent ring
      const distToPlayer = Math.sqrt(
        Math.pow(obj.mesh.position.x - playerPosition.x, 2) +
        Math.pow(obj.mesh.position.z - playerPosition.z, 2)
      );

      if (distToPlayer > PARALLAX_RADIUS * 1.2) {
        // Teleport to the opposite side of the player
        const wrapAngle = Math.atan2(obj.mesh.position.z - playerPosition.z, obj.mesh.position.x - playerPosition.x) + Math.PI;
        obj.mesh.position.x = playerPosition.x + Math.cos(wrapAngle) * obj.distance;
        obj.mesh.position.z = playerPosition.z + Math.sin(wrapAngle) * obj.distance;
      }
    });
  });

  return <group ref={containerRef} />;
}