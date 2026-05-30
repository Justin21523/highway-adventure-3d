/**
 * GameScene — Main 3D scene component.
 *
 * Usage:
 *   <Canvas>
 *     <GameScene />
 *   </Canvas>
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameLoop } from '@/hooks/useGameLoop';
import { PlayerVehicle } from './PlayerVehicle';
import { CameraRig } from './CameraRig';
import { ShopBuildings } from './ShopBuildings';
import { PickupObjects } from './PickupObjects';
import { EnvironmentLights } from './EnvironmentLights';
import { Obstacles } from './Obstacles';
import { TrafficBatchSystem } from './world/TrafficBatchSystem';
import { ChunkRenderer } from './world/ChunkRenderer';
import { HighwayNetworkSystem } from './world/HighwayNetworkSystem';
import { ParallaxScenery } from './world/ParallaxScenery';
import { WorldShopSpawner } from './world/WorldShopSpawner';
import { ParallaxBackground } from './world/ParallaxBackground';
import { LightingController } from './world/LightingController';
import { PickupSystem as WorldPickupSystem } from './world/PickupSystem';
import { CheckpointSystem } from './world/CheckpointSystem';
import { RoadSignSystem } from './world/RoadSignSystem';
import { QuestProgressTracker } from './world/QuestProgressTracker';
import { GarageZone } from './world/GarageZone';
import { TrafficAIController } from './world/TrafficAIController';
import { DecorationBatchSystem } from './world/DecorationBatchSystem';
import { RoadMarkingBatchSystem } from './world/RoadMarkingBatchSystem';
import { ShopInteraction } from '@/ui/ShopInteraction';

/* ─────────────────────────────────────────────
 * GameScene Component
 * ───────────────────────────────────────────── */

export function GameScene() {
  useGameLoop();

  // 共有車両 ref — PlayerVehicle と CameraRig で同じ Group を参照する
  const vehicleRef = useRef<THREE.Group>(null);

  return (
    <group>
      {/* 環境照明 */}
      <EnvironmentLights />
      <LightingController />

      {/* ショップ建物 */}
      <WorldShopSpawner />
      <ShopBuildings />

      {/* 障害物 */}
      <Obstacles />

      {/* ピックアップアイテム */}
      <PickupObjects />
      <WorldPickupSystem />

      {/* トラフィック (InstancedMesh バッチ) */}
      <TrafficBatchSystem />
      <TrafficAIController />

      {/* プレイヤー車両 — vehicleRef を渡す */}
      <PlayerVehicle vehicleRef={vehicleRef} />

      {/* カメラリグ — 同じ vehicleRef で車両を追従 */}
      <CameraRig vehicleRef={vehicleRef} />

      {/* 道路・チャンク生成 */}
      <HighwayNetworkSystem />
      <ChunkRenderer />
      <RoadMarkingBatchSystem />
      <DecorationBatchSystem />
      <CheckpointSystem />
      <RoadSignSystem />
      <GarageZone vehicleRef={vehicleRef} />
      <ShopInteraction vehicleRef={vehicleRef} />

      {/* 背景スクロール */}
      <ParallaxScenery />
      <ParallaxBackground />

      <QuestProgressTracker />
    </group>
  );
}
