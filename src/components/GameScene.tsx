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
import { PostProcessing } from './PostProcessing';
import { TrafficBatchSystem } from './world/TrafficBatchSystem';
import { CollisionManager } from './world/CollisionManager';
import { ChunkRenderer } from './world/ChunkRenderer';
import { HighwayNetworkSystem } from './world/HighwayNetworkSystem';
import { ParallaxScenery } from './world/ParallaxScenery';
import { WorldShopSpawner } from './world/WorldShopSpawner';

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

      {/* ショップ建物 */}
      <WorldShopSpawner />
      <ShopBuildings />

      {/* 障害物 */}
      <Obstacles />

      {/* ピックアップアイテム */}
      <PickupObjects />

      {/* トラフィック (InstancedMesh バッチ) */}
      <TrafficBatchSystem />

      {/* プレイヤー車両 — vehicleRef を渡す */}
      <PlayerVehicle vehicleRef={vehicleRef} />

      {/* カメラリグ — 同じ vehicleRef で車両を追従 */}
      <CameraRig vehicleRef={vehicleRef} />

      {/* 道路・チャンク生成 */}
      <HighwayNetworkSystem />
      <ChunkRenderer />

      {/* 背景スクロール */}
      <ParallaxScenery />

      {/* ポストエフェクト */}
      <PostProcessing />

      {/* 衝突管理 */}
      <CollisionManager />
    </group>
  );
}
