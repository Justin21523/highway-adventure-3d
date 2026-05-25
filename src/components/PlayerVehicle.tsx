/**
 * PlayerVehicle — 3D model of the player's vehicle.
 *
 * Renders the player's car with procedural geometry.
 * Updates position, rotation, and visual state (boost, drift, damage)
 * based on gameStore state.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';

/* ─────────────────────────────────────────────
 * PlayerVehicle Component
 * ───────────────────────────────────────────── */

export function PlayerVehicle() {
  const groupRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const headlightRefs = useRef<THREE.Mesh[]>([]);

  // Vehicle geometry (memoized to prevent recreation)
  const { bodyGeo, cabinGeo, wheelGeo, headlightGeo } = useMemo(() => ({
    bodyGeo: new THREE.BoxGeometry(2, 0.8, 4.5),
    cabinGeo: new THREE.BoxGeometry(1.6, 0.7, 2.2),
    wheelGeo: new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16),
    headlightGeo: new THREE.BoxGeometry(0.4, 0.2, 0.1),
  }), []);

  // Wheel positions
  const wheelPositions = useMemo(() => [
    { x: -0.9, y: -0.3, z: 1.3 },
    { x: 0.9, y: -0.3, z: 1.3 },
    { x: -0.9, y: -0.3, z: -1.3 },
    { x: 0.9, y: -0.3, z: -1.3 },
  ], []);

  // Update position and rotation every frame
  useFrame(() => {
    if (!groupRef.current) return;

    const playerPos = useWorldStore.getState().playerPosition;
    const vehicle = useGameStore.getState().vehicle;

    // Update position
    groupRef.current.position.set(playerPos.x, playerPos.y + 0.5, playerPos.z);

    // Update rotation based on steer angle
    const steerRad = (vehicle.steerAngle / 90) * 0.3;
    groupRef.current.rotation.y = steerRad;

    // Visual boost effect
    if (vehicle.isBoosting) {
      groupRef.current.scale.set(1, 1.05, 1.05);
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }

    // Visual damage effect
    if (vehicle.health < 30) {
      groupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissive?.setHex(0xff0000);
          child.material.emissiveIntensity = (30 - vehicle.health) / 100;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Vehicle body */}
      <mesh geometry={bodyGeo} position={[0, 0, 0]}>
        <meshStandardMaterial color="#e63946" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Vehicle cabin */}
      <mesh geometry={cabinGeo} position={[0, 0.65, -0.2]}>
        <meshStandardMaterial color="#1d3557" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 0.65, 0.9]}>
        <boxGeometry args={[1.4, 0.6, 0.05]} />
        <meshStandardMaterial color="#a8dadc" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, 0.65, -1.3]}>
        <boxGeometry args={[1.4, 0.5, 0.05]} />
        <meshStandardMaterial color="#a8dadc" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>

      {/* Wheels */}
      {wheelPositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) wheelRefs.current[i] = el; }}
          geometry={wheelGeo}
          position={[pos.x, pos.y, pos.z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <meshStandardMaterial color="#2b2d42" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      {/* Headlights */}
      <mesh position={[-0.7, 0, 2.3]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.7, 0, 2.3]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} />
      </mesh>

      {/* Tail lights */}
      <mesh position={[-0.7, 0, -2.3]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshStandardMaterial color="#ef233c" emissive="#ef233c" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.7, 0, -2.3]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshStandardMaterial color="#ef233c" emissive="#ef233c" emissiveIntensity={1} />
      </mesh>

      {/* Boost flame effect */}
      {useGameStore((s) => s.vehicle.isBoosting) && (
        <>
          <mesh position={[-0.5, -0.3, -2.5]}>
            <coneGeometry args={[0.15, 0.8, 8]} />
            <meshStandardMaterial color="#ff6b00" emissive="#ff6b00" emissiveIntensity={3} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0.5, -0.3, -2.5]}>
            <coneGeometry args={[0.15, 0.8, 8]} />
            <meshStandardMaterial color="#ff6b00" emissive="#ff6b00" emissiveIntensity={3} transparent opacity={0.8} />
          </mesh>
        </>
      )}
    </group>
  );
}
