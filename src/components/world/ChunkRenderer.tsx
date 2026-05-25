// src/components/world/ChunkRenderer.tsx

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { useWorldStore } from '../../stores/worldStore';
import { useQuestStore } from '../../stores/questStore';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';

const POOL_SIZE = 120;
const SPAWN_RADIUS = 80;
const DESPAWN_RADIUS = 110;
const COLLECT_RADIUS = 2.5;

export function ChunkRenderer() {
  const groupRef = useRef<THREE.Group>(null);
  const poolRef = useRef<Array<{ mesh: THREE.Group; type: string; position: THREE.Vector3; active: boolean }>>([]);

  const coinGeo = useMemo(() => new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), []);
  const coinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.3, emissive: '#f59e0b', emissiveIntensity: 0.4 }), []);
  const lightGeo = useMemo(() => new THREE.BoxGeometry(0.2, 0.6, 0.2), []);
  const lightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.5, roughness: 0.5 }), []);

  useMemo(() => {
    for (let i = 0; i < POOL_SIZE; i++) {
      const group = new THREE.Group();
      poolRef.current.push({ mesh: group, type: 'none', position: new THREE.Vector3(0, -50, 0), active: false });
    }
  }, [coinGeo, coinMat, lightGeo, lightMat]);

  const spawnProp = (x: number, y: number, z: number, type: string) => {
    const slot = poolRef.current.find(p => !p.active);
    if (!slot) return;

    slot.type = type;
    slot.active = true;
    slot.position.set(x, y, z);
    slot.mesh.position.copy(slot.position);
    slot.mesh.visible = true;
    slot.mesh.clear();

    if (type === 'coin') {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.rotation.x = Math.PI / 2;
      coin.castShadow = true;
      slot.mesh.add(coin);
    } else if (type === 'light') {
      const pole = new THREE.Mesh(lightGeo, lightMat);
      pole.position.y = 2.5;
      pole.castShadow = true;
      slot.mesh.add(pole);
      
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.15, 0.3),
        new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 2 })
      );
      lamp.position.set(0.4, 3.8, 0);
      slot.mesh.add(lamp);
    }
  };

  useFrame((_, delta) => {
    const worldState = useWorldStore.getState();
    const pPos = new THREE.Vector3(
      worldState.playerPosition.x,
      worldState.playerPosition.y,
      worldState.playerPosition.z
    );

    // Spawn logic
    poolRef.current.forEach(slot => {
      if (!slot.active && Math.random() < 0.02) {
        const angle = Math.random() * Math.PI * 2;
        const dist = SPAWN_RADIUS * (0.8 + Math.random() * 0.2);
        const x = pPos.x + Math.cos(angle) * dist;
        const z = pPos.z + Math.sin(angle) * dist;
        const y = 1.2;
        const type = Math.random() > 0.7 ? 'coin' : 'light';
        spawnProp(x, y, z, type);
      }
    });

    let collected = false;

    // Update & Collect logic
    for (const slot of poolRef.current) {
      if (!slot.active) {
        slot.mesh.visible = false;
        continue;
      }

      const distToPlayer = slot.position.distanceTo(pPos);
      if (distToPlayer > DESPAWN_RADIUS) {
        slot.active = false;
        slot.mesh.visible = false;
        continue;
      }

      // Coin rotation & collection
      if (slot.type === 'coin') {
        slot.mesh.children[0]?.rotateZ(delta * 3);
        if (distToPlayer < COLLECT_RADIUS) {
          slot.active = false;
          slot.mesh.visible = false;
          VFXManager.getInstance().spawn('spark', { x: slot.position.x, y: slot.position.y, z: slot.position.z }, 0.5, 8);
          collected = true;
        }
      }
    }

    if (collected) {
      useGameStore.getState().addCoins(50);
      AudioManager.getInstance().playImpact(0.3);
      useQuestStore.getState().addStat({ totalPickupsCollected: 1 });
    }
  });

  return <group ref={groupRef} />;
}