// src/components/world/WorldStreamManager.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

const CHUNK_LEN = 60;
const ROAD_W = 14;
const LANE_W = 3.5;
const CURVE_FREQ = 0.06;
const CURVE_AMP = 18;
const LOAD_AHEAD = 8;
const UNLOAD_BEHIND = 5;

export function WorldStreamManager() {
  const rootRef = useRef<THREE.Group>(null);
  const chunkMap = useRef<Map<number, THREE.Group>>(new Map());
  const trafficRef = useRef<Array<{ id: number; mesh: THREE.Mesh; zSpeed: number; lane: number; chunkIdx: number }>>([]);
  const lastChunkRef = useRef(-999);
  const nextIdRef = useRef(0);

  const shared = useMemo(() => {
    const roadMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.95 });
    const lineMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#cbd5e1', emissiveIntensity: 0.2 });
    const curbMat = new THREE.MeshStandardMaterial({ color: '#52525b', roughness: 0.6 });
    const lightMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', metalness: 0.6 });
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 4 });
    const carMatA = new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.5 });
    const carMatB = new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.5 });
    const carMatC = new THREE.MeshStandardMaterial({ color: '#22c55e', metalness: 0.5 });

    return {
      road: new THREE.BoxGeometry(CHUNK_LEN, 0.1, ROAD_W),
      line: new THREE.BoxGeometry(CHUNK_LEN * 0.8, 0.02, 0.2),
      curb: new THREE.BoxGeometry(CHUNK_LEN, 0.15, 0.3),
      pole: new THREE.CylinderGeometry(0.04, 0.04, 5.5, 6),
      lamp: new THREE.BoxGeometry(0.8, 0.1, 0.25),
      car: new THREE.BoxGeometry(2, 0.8, 4.5),
      mats: [roadMat, lineMat, curbMat, lightMat, lampMat, carMatA, carMatB, carMatC]
    };
  }, []);

  const getRoadTransform = (idx: number) => {
    const angle = idx * CURVE_FREQ;
    const x = Math.sin(angle) * CURVE_AMP;
    const z = idx * CHUNK_LEN;
    const yRot = Math.asin(Math.cos(angle) * CURVE_AMP * CURVE_FREQ); // Tangent heading
    return { x, z, yRot };
  };

  useFrame((_, delta) => {
    const pZ = useGameStore.getState().playerPosition.z;
    const targetChunk = Math.floor(pZ / CHUNK_LEN);
    if (targetChunk === lastChunkRef.current) {
      // Still update traffic even if chunks haven't changed
      trafficRef.current.forEach(t => {
        t.mesh.position.z += t.zSpeed * delta;
        // Follow road curve
        const tIdx = t.chunkIdx;
        const curveX = Math.sin(tIdx * CURVE_FREQ) * CURVE_AMP;
        t.mesh.position.x = curveX + (t.lane * LANE_W);
        t.mesh.rotation.y = Math.asin(Math.cos(tIdx * CURVE_FREQ) * CURVE_AMP * CURVE_FREQ);
      });
      return;
    }
    lastChunkRef.current = targetChunk;

    const start = targetChunk - UNLOAD_BEHIND;
    const end = targetChunk + LOAD_AHEAD;

    // Spawn/Update chunks
    for (let i = start; i <= end; i++) {
      if (chunkMap.current.has(i)) continue;
      
      const { x, z, yRot } = getRoadTransform(i);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = yRot;

      // Road
      const road = new THREE.Mesh(shared.road, shared.mats[0]);
      road.receiveShadow = true;
      group.add(road);

      // Lines & Curb
      for (let l = -1; l <= 1; l += 2) {
        const line = new THREE.Mesh(shared.line, shared.mats[1]);
        line.position.set(l * LANE_W, 0.02, 0);
        group.add(line);
        const curb = new THREE.Mesh(shared.curb, shared.mats[2]);
        curb.position.set(l * (ROAD_W / 2 + 0.1), 0.08, 0);
        group.add(curb);
      }

      // Streetlights (every 3rd chunk)
      if (i % 3 === 0) {
        for (let s of [-1, 1]) {
          const pole = new THREE.Mesh(shared.pole, shared.mats[3]);
          pole.position.set(s * (ROAD_W / 2 + 2), 2.75, 0);
          pole.castShadow = true;
          group.add(pole);
          const lamp = new THREE.Mesh(shared.lamp, shared.mats[4]);
          lamp.position.set(s * (ROAD_W / 2 + 2.5), 5.5, 0);
          group.add(lamp);
        }
      }

      // Spawn Traffic for this chunk
      if (Math.random() < 0.7) {
        const lane = (Math.floor(Math.random() * 3) - 1);
        const speed = 12 + Math.random() * 18;
        const car = new THREE.Mesh(shared.car, shared.mats[5 + Math.floor(Math.random() * 3)]);
        car.position.set(lane * LANE_W, 0.5, -20);
        car.castShadow = true;
        group.add(car);

        trafficRef.current.push({ id: nextIdRef.current++, mesh: car, zSpeed: speed, lane, chunkIdx: i });
      }

      chunkMap.current.set(i, group);
      rootRef.current?.add(group);
    }

    // Unload & Clean
    const toRemove: number[] = [];
    chunkMap.current.forEach((chunk, idx) => {
      if (idx < start - 2 || idx > end + 2) {
        rootRef.current?.remove(chunk);
        // Dispose geometries/materials of removed chunks
        chunk.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).geometry?.dispose();
            const m = (c as THREE.Mesh).material as THREE.Material;
            if (m) m.dispose();
          }
        });
        toRemove.push(idx);
      }
    });
    toRemove.forEach(i => chunkMap.current.delete(i));

    // Remove distant traffic
    trafficRef.current = trafficRef.current.filter(t => {
      if (t.chunkIdx < start - 1 || t.chunkIdx > end + 1) {
        t.mesh.geometry?.dispose();
        const m = t.mesh.material as THREE.Material;
        m.dispose();
        return false;
      }
      return true;
    });
  });

  useEffect(() => () => {
    chunkMap.current.forEach(c => c.traverse(o => {
      if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).geometry?.dispose(); ((o as THREE.Mesh).material as THREE.Material)?.dispose(); }
    }));
    chunkMap.current.clear();
    trafficRef.current = [];
  }, []);

  return <group ref={rootRef} />;
}