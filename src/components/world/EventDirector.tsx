/**
 * EventDirector — lightweight dynamic world events.
 *
 * Periodically drops a treasure crate near the player (any district). Driving over
 * it pays out coins with a spark + toast. Self-contained and pooled (one crate at a
 * time); reschedules after collect, or if the player drives away. No gameMode/snap.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';
import { NotificationManager } from '../../managers/NotificationManager';

export function EventDirector() {
  const crateRef = useRef<THREE.Group>(null);
  const state = useRef({ active: false, x: 0, z: 0, nextAt: 0 });

  useEffect(() => { state.current.nextAt = performance.now() + 6000; }, []);

  useFrame((_, delta) => {
    const now = performance.now();
    const p = useGameStore.getState().playerPosition;
    const s = state.current;
    const crate = crateRef.current;

    if (!s.active) {
      if (now >= s.nextAt) {
        const ang = Math.random() * Math.PI * 2;
        s.x = p.x + Math.cos(ang) * (60 + Math.random() * 50);
        s.z = p.z + Math.sin(ang) * (60 + Math.random() * 50);
        s.active = true;
        if (crate) { crate.position.set(s.x, 1, s.z); crate.visible = true; }
      }
      return;
    }

    if (crate) crate.rotation.y += delta * 1.5;
    const d = Math.hypot(p.x - s.x, p.z - s.z);

    if (d < 4) {
      s.active = false;
      s.nextAt = now + 20000 + Math.random() * 15000;
      if (crate) crate.visible = false;
      const reward = 200 + Math.floor(Math.random() * 300);
      useGameStore.getState().addCoins(reward);
      VFXManager.getInstance().spawn('spark', { x: s.x, y: 1, z: s.z }, 1.0, 14);
      AudioManager.getInstance().playImpact(0.3);
      NotificationManager.getInstance().notify({ title: 'Treasure!', message: `+${reward}🪙`, priority: 'medium', duration: 2000, icon: 'coin' });
    } else if (d > 230) {
      // Player moved on — recycle the crate elsewhere shortly.
      s.active = false;
      s.nextAt = now + 8000;
      if (crate) crate.visible = false;
    }
  });

  return (
    <group ref={crateRef} visible={false}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        <meshStandardMaterial color="#f59e0b" emissive="#b45309" emissiveIntensity={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.35, 0.7, 4]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>
    </group>
  );
}
