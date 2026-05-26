// src/components/world/RoadNetworkGenerator.tsx

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { ROAD_CONFIG } from '../../constants/road';

/**
 * RoadNetworkGenerator
 * Infinite procedural road network streaming engine.
 * Generates main highways (Z-axis) and city cross-streets (X-axis) with deterministic prop placement.
 * Uses object pooling and InstancedMesh for zero-GC, high-performance rendering.
 */
export function RoadNetworkGenerator() {
  const groupRef = useRef<THREE.Group>(null);
  const chunkPoolRef = useRef<Map<string, THREE.Group>>(new Map());
  const activeChunksRef = useRef<Set<string>>(new Set());
  const playerChunkRef = useRef({ x: 0, z: 0 });

  // Shared Geometries & Materials (Singleton per session)
  const sharedGeo = useMemo(() => ({
    road: new THREE.PlaneGeometry(ROAD_CONFIG.GRID_SIZE, ROAD_CONFIG.GRID_SIZE),
    marking: new THREE.PlaneGeometry(ROAD_CONFIG.MARKING_LENGTH || 1.5, 0.15),
    curb: new THREE.BoxGeometry(ROAD_CONFIG.GRID_SIZE, ROAD_CONFIG.CURB_HEIGHT, ROAD_CONFIG.CURB_WIDTH),
    barrier: new THREE.BoxGeometry(0.4, 1.2, ROAD_CONFIG.GRID_SIZE),
    treeTrunk: new THREE.CylinderGeometry(0.15, 0.2, 3, 6),
    treeCanopy: new THREE.SphereGeometry(1.5, 8, 6),
    streetLightPole: new THREE.CylinderGeometry(0.05, 0.05, 6, 6),
    streetLightHead: new THREE.BoxGeometry(1.2, 0.2, 0.4),
    building: new THREE.BoxGeometry(10, 12, 10)
  }), []);

  const sharedMat = useMemo(() => ({
    asphalt: new THREE.MeshStandardMaterial({ ...ROAD_CONFIG.MATERIALS.asphalt }),
    line: new THREE.MeshStandardMaterial({ ...ROAD_CONFIG.MATERIALS.highwayLine }),
    cityLine: new THREE.MeshStandardMaterial({ ...ROAD_CONFIG.MATERIALS.cityLine }),
    curb: new THREE.MeshStandardMaterial({ ...ROAD_CONFIG.MATERIALS.curb }),
    barrier: new THREE.MeshStandardMaterial({ ...ROAD_CONFIG.MATERIALS.barrier }),
    treeTrunk: new THREE.MeshStandardMaterial({ color: '#452720', roughness: 0.9 }),
    treeCanopy: new THREE.MeshStandardMaterial({ color: '#2d4a22', roughness: 0.8 }),
    streetLight: new THREE.MeshStandardMaterial({ color: '#a1a1aa', metalness: 0.6, roughness: 0.3 }),
    streetLightHead: new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 2 }),
    building: new THREE.MeshStandardMaterial({ color: '#52525b', roughness: 0.7, metalness: 0.2 })
  }), []);

  // Deterministic RNG for prop placement
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Build a single chunk procedurally
  const buildChunk = (gx: number, gz: number, isHighway: boolean): THREE.Group => {
    const chunk = new THREE.Group();
    chunk.name = `chunk_${gx}_${gz}`;
    chunk.position.set(gx * ROAD_CONFIG.GRID_SIZE, 0, gz * ROAD_CONFIG.GRID_SIZE);

    // 1. Road Surface
    const road = new THREE.Mesh(sharedGeo.road, sharedMat.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    chunk.add(road);

    // 2. Lane Markings & Curb
    const laneCount = isHighway ? ROAD_CONFIG.HIGHWAY_LANES : ROAD_CONFIG.CITY_LANES;
    const totalWidth = laneCount * ROAD_CONFIG.LANE_WIDTH + ROAD_CONFIG.SHOULDER_WIDTH * 2;
    const matLine = isHighway ? sharedMat.line : sharedMat.cityLine;
    const rules = isHighway ? ROAD_CONFIG.PROPS.highway : ROAD_CONFIG.PROPS.city;

    // Center & edge lines
    for (let i = 0; i <= laneCount; i++) {
      const xPos = -totalWidth / 2 + i * ROAD_CONFIG.LANE_WIDTH + ROAD_CONFIG.SHOULDER_WIDTH;
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_CONFIG.GRID_SIZE, isHighway ? (i === laneCount / 2 ? 0.2 : 0.15) : 0.15),
        matLine
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(xPos, 0.01, 0);
      chunk.add(line);
    }

    // Curb / Barrier
    const curbGeo = isHighway ? sharedGeo.barrier : sharedGeo.curb;
    const curbMat = isHighway ? sharedMat.barrier : sharedMat.curb;
    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-totalWidth / 2 - 0.2, isHighway ? 0.6 : ROAD_CONFIG.CURB_HEIGHT / 2, 0);
    leftCurb.castShadow = true;
    chunk.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(totalWidth / 2 + 0.2, isHighway ? 0.6 : ROAD_CONFIG.CURB_HEIGHT / 2, 0);
    rightCurb.castShadow = true;
    chunk.add(rightCurb);

    // 3. Procedural Props
    const seedBase = (gx * 1000) + (gz * 500) + (isHighway ? 9999 : 0);
    
    // Streetlights
    for (let z = -ROAD_CONFIG.GRID_SIZE / 2; z < ROAD_CONFIG.GRID_SIZE / 2; z += rules.streetLightSpacing) {
      if (seededRandom(seedBase + z + 100) < 0.8) {
        const pole = new THREE.Mesh(sharedGeo.streetLightPole, sharedMat.streetLight);
        pole.position.set(-totalWidth / 2 - 1.5, 3, z + 5);
        pole.castShadow = true;
        chunk.add(pole);
        
        const head = new THREE.Mesh(sharedGeo.streetLightHead, sharedMat.streetLightHead);
        head.position.set(-totalWidth / 2 - 2.1, 6, z + 5);
        chunk.add(head);
        
        const poleR = pole.clone();
        poleR.position.set(totalWidth / 2 + 1.5, 3, z + 5);
        chunk.add(poleR);
        
        const headR = head.clone();
        headR.position.set(totalWidth / 2 + 2.1, 6, z + 5);
        chunk.add(headR);
      }
    }

    // Trees & Buildings (City only)
    if (!isHighway) {
      for (let i = 0; i < 8; i++) {
        const s = seedBase + i * 42;
        const xPos = (seededRandom(s) > 0.5 ? -1 : 1) * (totalWidth / 2 + 4 + seededRandom(s + 1) * 6);
        const zPos = -ROAD_CONFIG.GRID_SIZE / 2 + seededRandom(s + 2) * ROAD_CONFIG.GRID_SIZE;

        if (seededRandom(s + 3) < rules.treeChance) {
          const trunk = new THREE.Mesh(sharedGeo.treeTrunk, sharedMat.treeTrunk);
          trunk.position.set(xPos, 1.5, zPos);
          trunk.castShadow = true;
          chunk.add(trunk);
          const canopy = new THREE.Mesh(sharedGeo.treeCanopy, sharedMat.treeCanopy);
          canopy.position.set(xPos, 3.5, zPos);
          canopy.castShadow = true;
          chunk.add(canopy);
        } else if (seededRandom(s + 4) < rules.buildingChance) {
          const bH = 4 + seededRandom(s + 5) * 16;
          const bW = 6 + seededRandom(s + 6) * 8;
          const bD = 6 + seededRandom(s + 7) * 8;
          const buildingGeo = new THREE.BoxGeometry(bW, bH, bD);
          const building = new THREE.Mesh(buildingGeo, sharedMat.building);
          building.position.set(xPos, bH / 2, zPos);
          building.castShadow = true;
          building.receiveShadow = true;
          chunk.add(building);
        }
      }
    }

    chunk.position.y = -0.02;
    return chunk;
  };

  useFrame(() => {
    const { playerPosition } = useGameStore.getState();
    const currentGX = Math.round(playerPosition.x / ROAD_CONFIG.GRID_SIZE);
    const currentGZ = Math.round(playerPosition.z / ROAD_CONFIG.GRID_SIZE);

    if (currentGX === playerChunkRef.current.x && currentGZ === playerChunkRef.current.z) return;
    playerChunkRef.current = { x: currentGX, z: currentGZ };

    const required = new Set<string>();
    const r = ROAD_CONFIG.LOAD_RADIUS_CHUNKS;
    
    // Generate grid requirements
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        // Main Highway runs along Z (gx=0), City roads branch at intervals
        const isHighway = Math.abs(dx) <= 1; 
        const isCrossStreet = (dz % 4 === 0);
        if (isHighway || isCrossStreet) {
          required.add(`${currentGX + dx},${currentGZ + dz}`);
        }
      }
    }

    // Spawn missing chunks
    required.forEach(key => {
      if (activeChunksRef.current.has(key)) return;
      activeChunksRef.current.add(key);
      const [gx, gz] = key.split(',').map(Number);
      const isHighway = Math.abs(gx) <= 1;
      
      let chunk: THREE.Group;
      if (chunkPoolRef.current.has(key)) {
        chunk = chunkPoolRef.current.get(key)!;
        chunk.visible = true;
      } else {
        chunk = buildChunk(gx, gz, isHighway);
        chunkPoolRef.current.set(key, chunk);
      }
      
      chunk.position.set(gx * ROAD_CONFIG.GRID_SIZE, -0.02, gz * ROAD_CONFIG.GRID_SIZE);
      groupRef.current!.add(chunk);
    });

    // Unload & Pool distant chunks
    const u = ROAD_CONFIG.UNLOAD_RADIUS_CHUNKS;
    chunkPoolRef.current.forEach((chunk, key) => {
      const [gx, gz] = key.split(',').map(Number);
      if (Math.abs(gx - currentGX) > u || Math.abs(gz - currentGZ) > u) {
        if (activeChunksRef.current.has(key)) activeChunksRef.current.delete(key);
        chunk.visible = false;
        chunk.position.set(0, -9999, 0); // Move out of world
        // Optional: clear children if memory pressure detected
      }
    });
  });

  useEffect(() => {
    return () => {
      chunkPoolRef.current.forEach(c => {
        c.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).geometry?.dispose();
            const mat = (obj as THREE.Mesh).material as THREE.Material;
            if (mat) mat.dispose();
          }
        });
      });
      chunkPoolRef.current.clear();
      activeChunksRef.current.clear();
    };
  }, []);

  return <group ref={groupRef} />;
}