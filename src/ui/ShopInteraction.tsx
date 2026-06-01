// src/components/ui/ShopInteraction.tsx
import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';

/**
 * ShopInteraction
 * Handles entering/exiting shop zones with smooth camera transition.
 * When player enters shop zone: pauses physics, switches to UI camera, shows ShopModal.
 * When exiting: restores gameplay camera and resumes physics.
 */
export function ShopInteraction({ vehicleRef }: { vehicleRef: React.RefObject<THREE.Group> }) {
  const shopZoneRef = useRef<THREE.Mesh>(null);
  const { gameMode, setGameMode, playerPosition } = useGameStore();
  const originalCameraState = useRef({ position: new THREE.Vector3(), lookAt: new THREE.Vector3(), fov: 60 });
  const isInsideRef = useRef(false);

  // Shop zone position (spawns at specific Z intervals)
  const shopPosition = new THREE.Vector3(0, 0, 1500); // First shop at Z=1500

  // NOTE: This legacy hard-coded shop no longer auto-enters on proximity.
  // Driving within range used to fire setGameMode('shop') + snap the car + speed 0,
  // which froze the vehicle (physics is disabled in 'shop' mode and the car was
  // parked inside the trigger radius, so it could never auto-exit). Real shopping is
  // handled by the world shop system: WorldShopSpawner registers shops, ShopSystem
  // tracks the nearest one, and pressing E (App keydown) opens the ShopInteriorScene.
  // This component now only renders the landmark building below.

  // Visual shop building (procedural fallback)
  return (
    <group position={shopPosition}>
      {/* Shop building exterior */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 6, 10]} />
        <meshStandardMaterial color="#475569" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 6.5, 0]} castShadow>
        <boxGeometry args={[14, 1, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Entrance sign */}
      <mesh position={[0, 4.5, 5.1]}>
        <planeGeometry args={[8, 2]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>
      {/* Shop zone trigger (invisible) */}
      <mesh ref={shopZoneRef} visible={false}>
        <cylinderGeometry args={[15, 15, 0.1, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Visual indicator when near */}
      {isInsideRef.current || (new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z).distanceTo(shopPosition) < 30) && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[14, 15.5, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
