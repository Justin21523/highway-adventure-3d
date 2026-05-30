// src/components/world/GarageZone.tsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

/**
 * GarageZone
 * Physical location where players can enter garage mode for vehicle customization.
 * Features: proximity detection, camera transition, visual indicator, and entry trigger.
 * Spawns at predefined Z intervals (every 2000m) for progression gating.
 */
export function GarageZone({ vehicleRef }: { vehicleRef: React.RefObject<THREE.Group> }) {
  const zoneRef = useRef<THREE.Mesh>(null);
  const { gameMode, setGameMode, playerPosition } = useGameStore();
  const isInsideRef = useRef(false);
  
  // Garage spawns at Z = 2000, 4000, 6000... (every 2000m)
  const garageZ = Math.round(playerPosition.z / 2000) * 2000 + 1000;
  const garagePos = new THREE.Vector3(0, 0, garageZ);

  useFrame(() => {
    if (!vehicleRef.current) return;
    
    const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    const dist = playerPos.distanceTo(garagePos);
    
    // Entry detection
    if (dist < 12 && !isInsideRef.current && (gameMode === 'playing' || gameMode === 'exploration')) {
      isInsideRef.current = true;
      setGameMode('garage');
      // Snap vehicle to garage bay
      vehicleRef.current.position.set(0, 0.5, garageZ - 5);
      vehicleRef.current.rotation.set(0, 0, 0);
      useGameStore.getState().updateVehicleState({ speed: 0 });
    }
    // Exit detection (player moved away or mode changed externally)
    else if ((dist > 20 || gameMode !== 'garage') && isInsideRef.current) {
      isInsideRef.current = false;
      if (gameMode === 'garage') setGameMode('playing');
    }
  });

  // Visual garage structure (procedural fallback)
  return (
    <group position={garagePos}>
      {/* Main building */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 8, 14]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Garage door opening */}
      <mesh position={[0, 2, 7.1]}>
        <boxGeometry args={[10, 4, 0.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Roof with overhang */}
      <mesh position={[0, 8.5, 0]} castShadow>
        <boxGeometry args={[20, 1, 18]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Signage */}
      <mesh position={[0, 6, 7.2]}>
        <planeGeometry args={[8, 2]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>
      {/* Entry trigger zone (invisible cylinder) */}
      <mesh ref={zoneRef} visible={false} position={[0, 0.05, 0]}>
        <cylinderGeometry args={[12, 12, 0.1, 24]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Visual indicator when nearby */}
      {new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z).distanceTo(garagePos) < 40 && (
        <>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[11, 13, 32]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.7} />
          </mesh>
          {/* Floating text indicator */}
          <Html distanceFactor={15} position={[0, 5, 8]}>
            <div className="bg-black/80 px-3 py-1 rounded text-xs font-bold text-green-400 whitespace-nowrap border border-green-500/50">
              GARAGE - Press G to Enter
            </div>
          </Html>
        </>
      )}
    </group>
  );
}
