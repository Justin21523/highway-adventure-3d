/**
 * POISystem — discoverable landmarks (makes the previously-dead POI data live).
 *
 * Deterministically places a scenic landmark in some countryside/suburban chunks.
 * Driving close discovers it (worldStore.discoverPoi) and pays a one-time reward
 * with a spark + toast. Markers are pooled and only shown for nearby, undiscovered
 * POIs. Purely additive — no gameMode/snap.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useWorldStore } from '../../stores/worldStore';
import { zoneAtChunk } from '../../systems/ZoneManager';
import { WORLD } from '../../constants/world';
import { VFXManager } from '../../managers/VFXManager';
import { NotificationManager } from '../../managers/NotificationManager';
import { useDailyStore } from '../../stores/dailyStore';

const MAX_MARKERS = 9;
const SCAN_RADIUS = 3; // chunks around the player

function hash01(cx: number, cz: number, salt: number): number {
  let h = (cx * 73856093) ^ (cz * 19349663) ^ (salt * 83492791);
  h = h >>> 0;
  return (h % 100000) / 100000;
}

/** Deterministic POI for a chunk, or null. Countryside/suburban only. */
function poiAt(cx: number, cz: number): { id: string; x: number; z: number } | null {
  const zone = zoneAtChunk(cx, cz);
  if (zone !== 'countryside' && zone !== 'suburban') return null;
  if (hash01(cx, cz, 7) >= 0.14) return null;
  const ox = (hash01(cx, cz, 11) - 0.5) * 60;
  const oz = (hash01(cx, cz, 13) - 0.5) * 60;
  return { id: `poi_${cx}_${cz}`, x: cx * WORLD.CHUNK_SIZE + ox, z: cz * WORLD.CHUNK_SIZE + oz };
}

export function POISystem() {
  const groupRef = useRef<THREE.Group>(null);
  const markersRef = useRef<THREE.Group[]>([]);

  const shared = useMemo(() => ({
    pylon: new THREE.CylinderGeometry(0.3, 0.5, 6, 6),
    pylonMat: new THREE.MeshStandardMaterial({ color: '#0ea5e9', emissive: '#0369a1', emissiveIntensity: 0.4 }),
    gem: new THREE.OctahedronGeometry(1.0, 0),
    gemMat: new THREE.MeshBasicMaterial({ color: '#fde047' }),
  }), []);

  useEffect(() => {
    for (let i = 0; i < MAX_MARKERS; i++) {
      const g = new THREE.Group();
      const pylon = new THREE.Mesh(shared.pylon, shared.pylonMat); pylon.position.y = 3; g.add(pylon);
      const gem = new THREE.Mesh(shared.gem, shared.gemMat); gem.position.y = 7; g.add(gem);
      g.visible = false;
      groupRef.current?.add(g);
      markersRef.current.push(g);
    }
    return () => { for (const v of Object.values(shared)) (v as THREE.BufferGeometry | THREE.Material).dispose?.(); };
  }, [shared]);

  useFrame((_, delta) => {
    const ws = useWorldStore.getState();
    const p = ws.playerPosition;
    const pcx = Math.round(p.x / WORLD.CHUNK_SIZE);
    const pcz = Math.round(p.z / WORLD.CHUNK_SIZE);

    let m = 0;
    for (let cx = pcx - SCAN_RADIUS; cx <= pcx + SCAN_RADIUS && m < MAX_MARKERS; cx++) {
      for (let cz = pcz - SCAN_RADIUS; cz <= pcz + SCAN_RADIUS && m < MAX_MARKERS; cz++) {
        const poi = poiAt(cx, cz);
        if (!poi || ws.isPoiDiscovered(poi.id)) continue;

        const dist = Math.hypot(p.x - poi.x, p.z - poi.z);
        if (dist < 9) {
          // Discover it.
          ws.discoverPoi(poi.id);
          const gs = useGameStore.getState();
          gs.addCoins(120);
          gs.addXp(40);
          gs.addReputation(5);
          useDailyStore.getState().bump('poi');
          VFXManager.getInstance().spawn('spark', { x: poi.x, y: 6, z: poi.z }, 1.2, 16);
          NotificationManager.getInstance().notify({ title: '景點發現！', message: '+120🪙 +40XP', priority: 'medium', duration: 2200, icon: 'success' });
          continue;
        }

        const marker = markersRef.current[m++];
        marker.visible = true;
        marker.position.set(poi.x, 0, poi.z);
        marker.children[1].rotation.y += delta * 1.2;
      }
    }
    for (; m < MAX_MARKERS; m++) markersRef.current[m].visible = false;
  });

  return <group ref={groupRef} />;
}
