// src/components/world/SpeedBoostSystem.tsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';

export function SpeedBoostSystem() {
  const groupRef = useRef<THREE.Group>(null);
  const padsRef = useRef<Array<{ id: number; position: THREE.Vector3; active: boolean; cooldown: number }>>([]);
  const boostTimerRef = useRef(0);
  const nextIdRef = useRef(0);

  const padGeo = useRef(new THREE.BoxGeometry(3, 0.1, 8));
  const padMat = useRef(new THREE.MeshStandardMaterial({
    color: '#22d3ee', emissive: '#0891b2', emissiveIntensity: 0.5, transparent: true, opacity: 0.7
  }));

  useEffect(() => {
    for (let i = 0; i < 8; i++) {
      padsRef.current.push({ id: nextIdRef.current++, position: new THREE.Vector3(0, -50, 0), active: false, cooldown: 0 });
    }
  }, []);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const pPos = new THREE.Vector3(state.playerPosition.x, state.playerPosition.y, state.playerPosition.z);
    const pVel = state.vehicle.speed;

    for (const pad of padsRef.current) {
      if (!pad.active && pad.cooldown <= 0) {
        const spawnZ = pPos.z + 90 + Math.random() * 50;
        const lane = (Math.floor(Math.random() * 3) - 1) * 4;
        pad.position.set(lane, 0.05, spawnZ);
        pad.active = true;
      }
    }

    for (const pad of padsRef.current) {
      if (!pad.active) {
        pad.cooldown = Math.max(0, pad.cooldown - delta);
        continue;
      }

      const distZ = Math.abs(pad.position.z - pPos.z);
      const distX = Math.abs(pad.position.x - pPos.x);

      if (distZ < 5 && distX < 2 && pVel > 20) {
        useGameStore.getState().updateVehicleState({ isBoosting: true });
        VFXManager.getInstance().spawn('boost', { x: pad.position.x, y: 0.5, z: pad.position.z }, 2.0, 15);
        AudioManager.getInstance().playImpact(0.5);
        boostTimerRef.current = 1.5;
        pad.active = false;
        pad.cooldown = 15;
      }
    }

    if (boostTimerRef.current > 0) {
      boostTimerRef.current -= delta;
      if (boostTimerRef.current <= 0) {
        useGameStore.getState().updateVehicleState({ isBoosting: false });
      }
    }

    const group = groupRef.current;
    if (group) {
      while (group.children.length < padsRef.current.length) {
        group.add(new THREE.Mesh(padGeo.current, padMat.current));
      }
      padsRef.current.forEach((pad, i) => {
        const child = group.children[i] as THREE.Mesh;
        if (pad.active) {
          child.position.copy(pad.position);
          child.visible = true;
          (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
        } else {
          child.visible = false;
          child.position.set(0, -100, 0);
        }
      });
    }
  });

  return <group ref={groupRef} />;
}