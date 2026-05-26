// src/components/world/HighwayChunkGenerator.tsx

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

const CHUNK_LENGTH = 50;
const ROAD_WIDTH = 16;
const LANE_WIDTH = 3.5;
const LOAD_CHUNKS_AHEAD = 10;
const UNLOAD_CHUNKS_BEHIND = 6;
const CURVE_AMPLITUDE = 12;
const CURVE_FREQUENCY = 0.08;

export function HighwayChunkGenerator() {
  const containerRef = useRef<THREE.Group>(null);
  const chunkMapRef = useRef<Map<number, THREE.Group>>(new Map());
  const nextIndexRef = useRef(0);
  const playerChunkIdxRef = useRef(0);

  // Shared Resources (Zero GC)
  const shared = useMemo(() => {
    const asphaltGeo = new THREE.PlaneGeometry(CHUNK_LENGTH, ROAD_WIDTH);
    const roadMat = new THREE.MeshStandardMaterial({ color: '#1c1c21', roughness: 0.9, metalness: 0.05 });

    const lineGeo = new THREE.PlaneGeometry(CHUNK_LENGTH * 0.8, 0.15);
    const lineMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.1 });
    const dashLineGeo = new THREE.PlaneGeometry(CHUNK_LENGTH * 0.5, 0.15);

    const curbGeo = new THREE.BoxGeometry(CHUNK_LENGTH, 0.15, 0.4);
    const curbMat = new THREE.MeshStandardMaterial({ color: '#71717a', roughness: 0.6 });

    const barrierGeo = new THREE.BoxGeometry(CHUNK_LENGTH, 0.8, 0.3);
    const barrierMat = new THREE.MeshStandardMaterial({ color: '#3f3f46', metalness: 0.4, roughness: 0.3 });

    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 6, 6);
    const headGeo = new THREE.BoxGeometry(1, 0.15, 0.3);
    const poleMat = new THREE.MeshStandardMaterial({ color: '#a1a1aa', metalness: 0.5 });
    const headMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 3 });

    const grassGeo = new THREE.PlaneGeometry(CHUNK_LENGTH, 40);
    const grassMat = new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 1.0 });

    return { asphaltGeo, roadMat, lineGeo, lineMat, dashLineGeo, curbGeo, curbMat, barrierGeo, barrierMat, poleGeo, headGeo, poleMat, headMat, grassGeo, grassMat };
  }, []);

  const buildChunk = (idx: number): THREE.Group => {
    const group = new THREE.Group();
    group.name = `chunk_${idx}`;

    // Deterministic position & rotation based on cumulative curve
    const angle = idx * CURVE_FREQUENCY;
    const curveOffset = Math.sin(angle) * CURVE_AMPLITUDE;
    const curveDir = Math.cos(angle); // Tangent direction multiplier
    const prevY = idx === 0 ? 0 : 0; // Flat highway for arcade playability

    const xPos = curveOffset;
    const zPos = idx * CHUNK_LENGTH;
    const yRot = -Math.asin(Math.cos(angle + 0.5) * CURVE_AMPLITUDE * CURVE_FREQUENCY / CHUNK_LENGTH); // Smooth heading

    group.position.set(xPos, prevY, zPos);
    group.rotation.y = yRot;

    // 1. Asphalt
    const road = new THREE.Mesh(shared.asphaltGeo, shared.roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.02;
    road.receiveShadow = true;
    group.add(road);

    // 2. Grass Terrain (extends road visually)
    const grassL = new THREE.Mesh(shared.grassGeo, shared.grassMat);
    grassL.rotation.x = -Math.PI / 2;
    grassL.position.set(-ROAD_WIDTH / 2 - 20, -0.05, 0);
    grassL.receiveShadow = true;
    group.add(grassL);

    const grassR = grassL.clone();
    grassR.position.x = ROAD_WIDTH / 2 + 20;
    group.add(grassR);

    // 3. Lane Markings
    for (let i = -1; i <= 1; i += 2) {
      const line = new THREE.Mesh(shared.lineGeo, shared.lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i * LANE_WIDTH, 0.01, 0);
      group.add(line);
    }
    // Center dashed line
    const dash = new THREE.Mesh(shared.dashLineGeo, shared.lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.y = 0.01;
    group.add(dash);

    // 4. Curbs & Barriers
    const leftCurb = new THREE.Mesh(shared.curbGeo, shared.curbMat);
    leftCurb.position.set(-ROAD_WIDTH / 2, 0.07, 0);
    group.add(leftCurb);
    const rightCurb = leftCurb.clone();
    rightCurb.position.x = ROAD_WIDTH / 2;
    group.add(rightCurb);

    if (idx % 3 === 0) {
      const leftBar = new THREE.Mesh(shared.barrierGeo, shared.barrierMat);
      leftBar.position.set(-ROAD_WIDTH / 2 - 0.5, 0.4, 0);
      leftBar.castShadow = true;
      group.add(leftBar);
      const rightBar = leftBar.clone();
      rightBar.position.x = ROAD_WIDTH / 2 + 0.5;
      group.add(rightBar);
    }

    // 5. Streetlights (Every 2nd chunk)
    if (idx % 2 === 0) {
      for (let side of [-1, 1]) {
        const pole = new THREE.Mesh(shared.poleGeo, shared.poleMat);
        pole.position.set(side * (ROAD_WIDTH / 2 + 1.5), 3, -CHUNK_LENGTH / 4);
        pole.castShadow = true;
        group.add(pole);
        const head = new THREE.Mesh(shared.headGeo, shared.headMat);
        head.position.set(side * (ROAD_WIDTH / 2 + 2.2), 6, -CHUNK_LENGTH / 4);
        group.add(head);
      }
    }

    return group;
  };

  useFrame((_, delta) => {
    const { playerPosition } = useGameStore.getState();
    const targetChunk = Math.floor(playerPosition.z / CHUNK_LENGTH);
    
    if (targetChunk === playerChunkIdxRef.current) return;
    playerChunkIdxRef.current = targetChunk;

    const loadStart = targetChunk - UNLOAD_CHUNKS_BEHIND;
    const loadEnd = targetChunk + LOAD_CHUNKS_AHEAD;

    // Spawn required chunks
    for (let i = loadStart; i <= loadEnd; i++) {
      if (chunkMapRef.current.has(i)) continue;
      const chunk = buildChunk(i);
      chunkMapRef.current.set(i, chunk);
      containerRef.current?.add(chunk);
    }

    // Unload & Pool distant chunks
    const toRemove: number[] = [];
    chunkMapRef.current.forEach((chunk, idx) => {
      if (idx < loadStart - 2 || idx > loadEnd + 2) {
        containerRef.current?.remove(chunk);
        chunk.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).geometry?.dispose();
            const mat = (child as THREE.Mesh).material as THREE.Material;
            if (mat) mat.dispose();
          }
        });
        toRemove.push(idx);
      }
    });
    toRemove.forEach(idx => chunkMapRef.current.delete(idx));
  });

  useEffect(() => () => {
    chunkMapRef.current.forEach(c => {
      c.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry?.dispose();
          const m = (obj as THREE.Mesh).material as THREE.Material;
          if (m) m.dispose();
        }
      });
    });
  }, []);

  return <group ref={containerRef} />;
}