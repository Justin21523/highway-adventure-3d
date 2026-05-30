// src/components/world/PickupSystem.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';

type PickupType = 'coin' | 'fuel' | 'repair';
const POOL = 20;

export function PickupSystem() {
  const rootRef = useRef<THREE.Group>(null);
  const itemsRef = useRef<Array<{ mesh: THREE.Mesh; type: PickupType; pos: THREE.Vector3; active: boolean }>>([]);

  const coinGeo = useMemo(() => new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12), []);
  const coinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.2, emissive: '#f59e0b', emissiveIntensity: 0.5 }), []);
  const fuelGeo = useMemo(() => new THREE.BoxGeometry(0.4, 0.6, 0.4), []);
  const fuelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#22c55e' }), []);
  const repairGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.3, 0.3), []);
  const repairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b82f6' }), []);

  useMemo(() => {
    for (let i = 0; i < POOL; i++) {
      const type = i % 3 === 0 ? 'fuel' : i % 3 === 1 ? 'repair' : 'coin';
      const geo = type === 'coin' ? coinGeo : type === 'fuel' ? fuelGeo : repairGeo;
      const mat = type === 'coin' ? coinMat : type === 'fuel' ? fuelMat : repairMat;
      const mesh = new THREE.Mesh(geo, mat);
      rootRef.current?.add(mesh);
      itemsRef.current.push({ mesh, type, pos: new THREE.Vector3(), active: false });
    }
  }, []);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const pPos = new THREE.Vector3(state.playerPosition.x, state.playerPosition.y + 0.5, state.playerPosition.z);
    let collected = false;

    itemsRef.current.forEach((item, i) => {
      if (!item.active && Math.random() < 0.04) {
        item.active = true;
        const lane = (Math.floor(Math.random() * 5) - 2) * 2.8;
        item.pos.set(lane, 1 + Math.sin(i) * 0.3, state.playerPosition.z + 60 + Math.random() * 80);
      }
      if (!item.active) { item.mesh.visible = false; return; }

      item.mesh.position.copy(item.pos);
      item.mesh.rotation.y += delta * 2;
      if (item.type !== 'coin') item.mesh.rotation.z = Math.sin(Date.now() * 0.003) * 0.2;

      const dist = pPos.distanceTo(item.pos);
      if (dist < 1.8) {
        item.active = false;
        collected = true;
        if (item.type === 'coin') useGameStore.getState().addCoins(50);
        else if (item.type === 'fuel') useGameStore.getState().updateVehicleState({ fuel: Math.min(100, state.vehicle.fuel + 25) });
        else if (item.type === 'repair') useGameStore.getState().updateVehicleState({ health: Math.min(100, state.vehicle.health + 30) });
        VFXManager.getInstance().spawn('spark', { x: item.pos.x, y: item.pos.y, z: item.pos.z }, 0.8, 6);
        AudioManager.getInstance().playImpact(0.2);
      } else if (pPos.z - item.pos.z > 20) { item.active = false; }
    });
  });

  return <group ref={rootRef} />;
}