/**
 * WorldSyncManager — per-frame glue between the player vehicle, the world stores,
 * and the procedural music engine.
 *
 * Mounted once at the App level (outside the GameScene / shop-interior switch) so
 * it keeps running regardless of which scene is active. Responsibilities:
 *
 *  - Drives MusicManager tempo/intensity from the vehicle's speed & rpm.
 *  - Defensive world sync: VehiclePhysics is the authority for player position,
 *    but if the world position ever becomes non-finite this re-seeds it from the
 *    rendered vehicle Group so streaming/cameras don't get stuck.
 */

import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useWorldStore } from '../../stores/worldStore';
import type { MusicManager } from '../../managers/MusicManager';

interface WorldSyncManagerProps {
  /** The shared player-vehicle Group (also used by GameScene / NPCSpawner). */
  vRef: RefObject<THREE.Group>;
  /** Singleton procedural music engine, adapted to driving speed. */
  musicRef: RefObject<MusicManager>;
}

export function WorldSyncManager({ vRef, musicRef }: WorldSyncManagerProps) {
  useFrame(() => {
    const { vehicle, gameMode } = useGameStore.getState();
    if (gameMode === 'paused' || gameMode === 'crashed') return;

    // Adapt the generative music to how fast the player is going.
    musicRef.current?.updateDynamics(vehicle.speed, vehicle.rpm);

    // Defensive world sync — only steps in if the world position is invalid.
    const group = vRef.current;
    if (group) {
      const wp = useWorldStore.getState().playerPosition;
      if (!Number.isFinite(wp.x) || !Number.isFinite(wp.z)) {
        useWorldStore.getState().setPlayerPosition({
          x: group.position.x,
          y: group.position.y,
          z: group.position.z,
        });
      }
    }
  });

  return null;
}
