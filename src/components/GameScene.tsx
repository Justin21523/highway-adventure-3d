/**
 * GameScene — Main 3D scene component.
 *
 * This is the root component that assembles all 3D elements:
 * - Player vehicle and camera
 * - World chunks (procedural streaming)
 * - Traffic cars (NPC vehicles)
 * - Shop buildings
 * - Pickup objects
 * - Environment lighting and effects
 *
 * Usage:
 *   <Canvas>
 *     <GameScene />
 *   </Canvas>
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameLoop } from '@/hooks/useGameLoop';
import { PlayerVehicle } from './PlayerVehicle';
import { CameraRig } from './CameraRig';
import { WorldChunks } from './WorldChunks';
import { TrafficCars } from './TrafficCars';
import { ShopBuildings } from './ShopBuildings';
import { PickupObjects } from './PickupObjects';
import { EnvironmentLights } from './EnvironmentLights';
import { SpeedBoostPads } from './SpeedBoostPads';
import { Obstacles } from './Obstacles';
import { PostProcessing } from './PostProcessing';
import { TrafficBatchSystem } from './world/TrafficBatchSystem';
import { DecorationBatchSystem } from './world/DecorationBatchSystem';
import { RoadMarkingBatchSystem } from './world/RoadMarkingBatchSystem';

/* ─────────────────────────────────────────────
 * GameScene Component
 * ───────────────────────────────────────────── */

export function GameScene() {
  const sceneRef = useRef<THREE.Scene>(null);

  // Initialize game loop
  useGameLoop();

  // Set up scene reference for environment system
  useEffect(() => {
    if (sceneRef.current) {
      // Scene is already available through R3F context
    }
  }, []);

  return (
    <group>
      {/* Environment lighting and effects */}
      <EnvironmentLights />

      {/* World chunks (procedural streaming with road network) */}
      <WorldChunks />

      {/* Road markings (batch rendered) */}
      <RoadMarkingBatchSystem />

      {/* Decorations - trees, rocks, signs (batch rendered) */}
      <DecorationBatchSystem />

      {/* Shop buildings */}
      <ShopBuildings />

      {/* Speed boost pads */}
      <SpeedBoostPads />

      {/* Obstacles */}
      <Obstacles />

      {/* Pickup objects (coins, boosts, items) */}
      <PickupObjects />

      {/* Traffic cars (batch rendered with InstancedMesh) */}
      <TrafficBatchSystem />

      {/* Player vehicle */}
      <PlayerVehicle />

      {/* Camera rig */}
      <CameraRig />

      {/* Post-processing effects */}
      <PostProcessing />
    </group>
  );
}
