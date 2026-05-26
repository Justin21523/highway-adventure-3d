// src/components/world/ParallaxBackground.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

const RADIUS = 350;
const COUNT = 24;

export function ParallaxBackground() {
  const groupRef = useRef<THREE.Group>(null);
  const itemsRef = useRef<Array<{ mesh: THREE.Mesh; dist: number; angle: number }>>([]);
  const lastPosRef = useRef(new THREE.Vector3());

  const shared = useMemo(() => {
    const m1 = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 1, flatShading: true });
    const m2 = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 1, flatShading: true });
    return [m1, m2];
  }, []);

  useEffect(() => {
    for (let i = 0; i < COUNT; i++) {
      const geo = i % 2 === 0 
        ? new THREE.ConeGeometry(8 + Math.random() * 12, 20 + Math.random() * 30, 5)
        : new THREE.BoxGeometry(6 + Math.random() * 8, 15 + Math.random() * 25, 6 + Math.random() * 8);
      const mat = shared[i % 2];
      const mesh = new THREE.Mesh(geo, mat);
      
      const angle = (i / COUNT) * Math.PI * 2;
      const dist = RADIUS * 0.7 + Math.random() * RADIUS * 0.3;
      mesh.position.set(Math.cos(angle) * dist, -5 + Math.random() * 10, Math.sin(angle) * dist);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.castShadow = true;
      groupRef.current?.add(mesh);
      itemsRef.current.push({ mesh, dist, angle });
    }
  }, [shared]);

  useFrame(() => {
    const { playerPosition, vehicle } = useGameStore.getState();
    const curr = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    const delta = curr.clone().sub(lastPosRef.current);
    lastPosRef.current.copy(curr);

    if (vehicle.speed < 2) return;

    const dir = delta.normalize();
    const moveAmt = delta.length();

    itemsRef.current.forEach(item => {
      const factor = Math.max(0, 1 - item.dist / RADIUS);
      item.mesh.position.x -= dir.x * moveAmt * factor;
      item.mesh.position.z -= dir.z * moveAmt * factor;

      // Wrap around
      const d = Math.sqrt(Math.pow(item.mesh.position.x - playerPosition.x, 2) + Math.pow(item.mesh.position.z - playerPosition.z, 2));
      if (d > RADIUS * 1.3) {
        const a = Math.atan2(item.mesh.position.z - playerPosition.z, item.mesh.position.x - playerPosition.x) + Math.PI;
        item.mesh.position.x = playerPosition.x + Math.cos(a) * item.dist;
        item.mesh.position.z = playerPosition.z + Math.sin(a) * item.dist;
      }
    });
  });

  return <group ref={groupRef} />;
}