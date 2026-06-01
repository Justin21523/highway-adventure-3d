/**
 * GameScene — Main 3D scene component.
 *
 * Usage:
 *   <Canvas>
 *     <GameScene />
 *   </Canvas>
 */
import { useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { useGameLoop } from '@/hooks/useGameLoop';
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
import { GarageZone } from './world/GarageZone';
import { TrafficAIController } from './world/TrafficAIController';
import { DecorationBatchSystem } from './world/DecorationBatchSystem';
import { CityStreetSystem } from './world/CityStreetSystem';
import { VFXLayer } from './world/VFXLayer';
import { ActivityRunner } from './world/ActivityRunner';
import { PoliceSystem } from './world/PoliceSystem';
import { EventDirector } from './world/EventDirector';
import { POISystem } from './world/POISystem';
import { RoadMarkingBatchSystem } from './world/RoadMarkingBatchSystem';
import { ShopInteraction } from '@/ui/ShopInteraction';

/* ─────────────────────────────────────────────
 * GameScene Component
 * ───────────────────────────────────────────── */

export function GameScene({ vehicleRef: externalVehicleRef }: { vehicleRef?: RefObject<THREE.Group> } = {}) {
  useGameLoop();

  // 車両 ref は App から共有される（PlayerVehicle / CameraRig / QuestProgressTracker は
  // App 側で一度だけマウントされる）。ここでは GarageZone / ShopInteraction が
  // 同じ車両を追従するために使う。App から渡されなければ内部 ref をフォールバック。
  const internalVehicleRef = useRef<THREE.Group>(null);
  const vehicleRef = externalVehicleRef ?? internalVehicleRef;

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

      {/* プレイヤー車両・カメラリグ・QuestProgressTracker は App 側でマウント
          （二重マウント防止）。GameScene は世界システムと相互作用系のみ。 */}

      {/* 道路・チャンク生成 */}
      <HighwayNetworkSystem />
      <CityStreetSystem />
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

      {/* パーティクル（衝突火花・ドリフト煙など） */}
      <VFXLayer />

      {/* 分區活動（競速/送貨/載客）的 checkpoint 與引擎 */}
      <ActivityRunner />

      {/* 活的世界：警匪追逐 + 動態事件（寶箱） + 景點探索 */}
      <PoliceSystem />
      <EventDirector />
      <POISystem />
    </group>
  );
}
