/**
 * ActivityRunner — drives the activity engine in the scene and renders the live
 * checkpoint marker. Also lets the player start a highway race by pressing R while
 * in the highway corridor (key-gated; never auto-triggers, never freezes the car).
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useActivityStore, buildRace, buildTour } from '../../stores/activityStore';
import { zoneAtWorld } from '../../systems/ZoneManager';

export function ActivityRunner() {
  const beaconRef = useRef<THREE.Group>(null);

  // Press R in the highway corridor to start a sprint (if nothing is running).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k !== 'r' && k !== 't') return;
      const gs = useGameStore.getState();
      if (gs.gameMode !== 'playing' && gs.gameMode !== 'exploration') return;
      if (useActivityStore.getState().active) return;
      const p = gs.playerPosition;
      const zone = zoneAtWorld(p.x, p.z);
      // R = highway sprint; T = countryside scenic tour.
      if (k === 'r' && zone === 'highway') {
        useActivityStore.getState().startActivity(buildRace(p.x, p.z, gs.profile.level));
      } else if (k === 't' && (zone === 'countryside' || zone === 'industrial')) {
        useActivityStore.getState().startActivity(buildTour(p.x, p.z, gs.profile.level));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame((_, delta) => {
    const { playerPosition } = useGameStore.getState();
    useActivityStore.getState().tick(delta, playerPosition.x, playerPosition.z);

    const active = useActivityStore.getState().active;
    const beacon = beaconRef.current;
    if (!beacon) return;

    const cp = active?.checkpoints[active.current];
    if (cp) {
      beacon.visible = true;
      beacon.position.set(cp.x, 0, cp.z);
      // Gentle pulse + spin so it reads as a live objective.
      const t = performance.now() * 0.003;
      const s = 1 + Math.sin(t) * 0.15;
      beacon.scale.set(s, 1, s);
      beacon.rotation.y = t;
    } else {
      beacon.visible = false;
    }
  });

  return (
    <group ref={beaconRef} visible={false}>
      {/* Light pillar */}
      <mesh position={[0, 14, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 28, 16, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Ground ring */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5, 6.5, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
