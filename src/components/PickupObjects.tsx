/**
 * PickupObjects — Renders world pickups (coins, boosts, items).
 *
 * Displays pickups with animations (rotation, bobbing) and
 * visual effects (glow, particles).
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useQuestStore } from '@/stores/questStore';
import * as THREE from 'three';

/* ─────────────────────────────────────────────
 * PickupObjects Component
 * ───────────────────────────────────────────── */

export function PickupObjects() {
  const activePickups = useQuestStore((state) => state.getActivePickups());

  const pickupEntries = useMemo(() => activePickups.filter((p) => !p.collected), [activePickups]);

  if (pickupEntries.length === 0) return null;

  return (
    <group>
      {pickupEntries.map((pickup) => (
        <PickupObject key={pickup.id} pickup={pickup} />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Single PickupObject Component
 * ───────────────────────────────────────────── */

interface PickupObjectProps {
  pickup: import('@/types/quest').WorldPickup;
}

function PickupObject({ pickup }: PickupObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  // Animation
  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta * 2;

    // Bobbing animation
    groupRef.current.position.y = pickup.position.y + Math.sin(timeRef.current) * 0.3;

    // Rotation animation
    groupRef.current.rotation.y += delta * 2;
  });

  // Render based on pickup type
  switch (pickup.type) {
    case 'coin':
      return <CoinPickup ref={groupRef as React.RefObject<THREE.Group>} position={pickup.position} value={pickup.value} />;
    case 'speedBoost':
      return <SpeedBoostPickup ref={groupRef as React.RefObject<THREE.Group>} position={pickup.position} />;
    case 'fuel':
      return <FuelPickup ref={groupRef as React.RefObject<THREE.Group>} position={pickup.position} value={pickup.value} />;
    case 'repair':
      return <RepairPickup ref={groupRef as React.RefObject<THREE.Group>} position={pickup.position} value={pickup.value} />;
    case 'item':
      return <ItemPickup ref={groupRef as React.RefObject<THREE.Group>} position={pickup.position} itemId={pickup.itemId || 'default'} />;
    default:
      return null;
  }
}

/* ─────────────────────────────────────────────
 * Coin Pickup
 * ───────────────────────────────────────────── */

function CoinPickup({ position, value }: { position: import('@/types/core').Vector3Data; value: number }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), []);

  return (
    <group ref={useRef<THREE.Group>()} position={[position.x, position.y, position.z]}>
      <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Glow effect */}
      <mesh geometry={geo} scale={1.5}>
        <meshStandardMaterial color="#fbbf24" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Speed Boost Pickup
 * ───────────────────────────────────────────── */

function SpeedBoostPickup({ position }: { position: import('@/types/core').Vector3Data }) {
  const geo = useMemo(() => new THREE.BoxGeometry(0.6, 0.6, 0.6), []);

  return (
    <group ref={useRef<THREE.Group>()} position={[position.x, position.y, position.z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1} transparent opacity={0.8} />
      </mesh>
      {/* Lightning bolt symbol */}
      <mesh position={[0, 0, 0.31]}>
        <boxGeometry args={[0.15, 0.5, 0.05]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Fuel Pickup
 * ───────────────────────────────────────────── */

function FuelPickup({ position, value }: { position: import('@/types/core').Vector3Data; value: number }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8), []);

  return (
    <group ref={useRef<THREE.Group>()} position={[position.x, position.y, position.z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.5} />
      </mesh>
      {/* Fuel drop symbol */}
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Repair Pickup
 * ───────────────────────────────────────────── */

function RepairPickup({ position, value }: { position: import('@/types/core').Vector3Data; value: number }) {
  const geo = useMemo(() => new THREE.BoxGeometry(0.5, 0.5, 0.5), []);

  return (
    <group ref={useRef<THREE.Group>()} position={[position.x, position.y, position.z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>
      {/* Cross symbol */}
      <mesh position={[0, 0, 0.26]}>
        <boxGeometry args={[0.35, 0.1, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.26]}>
        <boxGeometry args={[0.1, 0.35, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Item Pickup
 * ───────────────────────────────────────────── */

function ItemPickup({ position, itemId }: { position: import('@/types/core').Vector3Data; itemId: string }) {
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.4, 0), []);

  return (
    <group ref={useRef<THREE.Group>()} position={[position.x, position.y, position.z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.8} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
