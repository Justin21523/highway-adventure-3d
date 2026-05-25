/**
 * SpeedBoostPads — Speed boost pads on the road.
 *
 * Renders glowing pads that give the player a speed boost when driven over.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';

/* ─────────────────────────────────────────────
 * SpeedBoostPads Component
 * ───────────────────────────────────────────── */

export function SpeedBoostPads() {
  const playerPos = useWorldStore((state) => state.playerPosition);
  const boostPads = useMemo(() => generateBoostPads(playerPos), [playerPos]);

  if (boostPads.length === 0) return null;

  return (
    <group>
      {boostPads.map((pad, i) => (
        <SpeedBoostPad key={i} position={pad} />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Single SpeedBoostPad Component
 * ───────────────────────────────────────────── */

interface SpeedBoostPadProps {
  position: { x: number; y: number; z: number };
}

function SpeedBoostPad({ position }: SpeedBoostPadProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  const geo = useMemo(() => new THREE.BoxGeometry(3, 0.05, 1.5), []);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta * 3;

    // Pulsing glow effect
    const scale = 1 + Math.sin(timeRef.current) * 0.1;
    groupRef.current.scale.set(scale, 1, scale);
  });

  return (
    <group ref={groupRef as React.RefObject<THREE.Group>} position={[position.x, position.y + 0.03, position.z]}>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={1}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Arrow indicator */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Boost Pad Generator
 * ───────────────────────────────────────────── */

function generateBoostPads(playerPos: import('@/types/core').Vector3Data): { x: number; y: number; z: number }[] {
  const pads: { x: number; y: number; z: number }[] = [];
  const spacing = 80;

  // Generate pads ahead of player
  for (let i = 1; i <= 5; i++) {
    const z = playerPos.z - i * spacing;
    const x = playerPos.x + (Math.random() - 0.5) * 10;
    pads.push({ x, y: 0, z });
  }

  return pads;
}
