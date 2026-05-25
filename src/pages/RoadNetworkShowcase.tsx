/**
 * RoadNetworkShowcase — 道路系統視覺化展示頁面
 *
 * 這個頁面展示完整的道路系統，包含所有道路類型和視覺效果。
 * 使用方式：
 * ```tsx
 * import { RoadNetworkShowcase } from './pages/RoadNetworkShowcase';
 *
 * function App() {
 *   return <RoadNetworkShowcase />;
 * }
 * ```
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, GridHelper, AxesHelper } from '@react-three/drei';
import * as THREE from 'three';

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

const CHUNK_SIZE = 100;
const RENDER_CHUNKS = 5; // Radius in chunks

const ZONE_COLORS = {
  highway: 0x2a2a2a,
  cityCenter: 0x333333,
  suburban: 0x3a3a3a,
  industrial: 0x444444,
  countryside: 0x4a4a4a,
};

const ZONE_NAMES = {
  highway: '高速公路',
  cityCenter: '城市道路',
  suburban: '郊區道路',
  industrial: '工業區道路',
  countryside: '鄉間道路',
};

/* ─────────────────────────────────────────────
 * Showcase Component
 * ───────────────────────────────────────────── */

export function RoadNetworkShowcase() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Generate zone map
  const zoneMap = useMemo(() => {
    const map: Map<string, string> = new Map();

    for (let cx = -RENDER_CHUNKS; cx <= RENDER_CHUNKS; cx++) {
      for (let cz = -RENDER_CHUNKS; cz <= RENDER_CHUNKS; cz++) {
        const zone = determineZone(cx, cz);
        map.set(`${cx}_${cz}`, zone);
      }
    }

    return map;
  }, []);

  // Count zones
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const zone of zoneMap.values()) {
      counts[zone] = (counts[zone] || 0) + 1;
    }
    return counts;
  }, [zoneMap]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-2">🛣️ 完整道路系統視覺化展示</h1>
          <p className="text-gray-300">
            這個頁面展示完整的網格狀道路系統，包含高速公路、城市道路、郊區道路、工業區道路和鄉間道路。
          </p>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Zone Legend */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <h2 className="text-xl font-bold mb-3">道路類型</h2>
              <div className="space-y-2">
                {Object.entries(ZONE_NAMES).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedZone(selectedZone === key ? null : key)}
                    className={`w-full text-left p-2 rounded transition-colors ${
                      selectedZone === key
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: `#${ZONE_COLORS[key as keyof typeof ZONE_COLORS].toString(16).padStart(6, '0')}` }}
                      />
                      <span className="font-medium">{name}</span>
                      <span className="text-gray-400 text-sm">
                        ({zoneCounts[key] || 0})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <h2 className="text-xl font-bold mb-3">顯示選項</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>顯示標籤</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>顯示網格</span>
                </label>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <h2 className="text-xl font-bold mb-3">統計資訊</h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">總 Chunk 數:</span>
                  <span className="font-mono">{zoneMap.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">高速公路:</span>
                  <span className="font-mono">{zoneCounts.highway || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">城市道路:</span>
                  <span className="font-mono">{zoneCounts.cityCenter || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">郊區道路:</span>
                  <span className="font-mono">{zoneCounts.suburban || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">工業區道路:</span>
                  <span className="font-mono">{zoneCounts.industrial || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">鄉間道路:</span>
                  <span className="font-mono">{zoneCounts.countryside || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Viewport */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <Canvas
                camera={{ position: [200, 200, 200], fov: 50 }}
                className="rounded-lg"
              >
                <ambientLight intensity={0.5} />
                <directionalLight
                  position={[100, 100, 50]}
                  intensity={0.8}
                  castShadow
                />
                <RoadNetwork3D
                  zoneMap={zoneMap}
                  selectedZone={selectedZone}
                  showLabels={showLabels}
                  showGrid={showGrid}
                />
                <OrbitControls
                  enableDamping
                  dampingFactor={0.05}
                  maxPolarAngle={Math.PI / 2.1}
                />
              </Canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * 3D Road Network Component
 * ───────────────────────────────────────────── */

function RoadNetwork3D({
  zoneMap,
  selectedZone,
  showLabels,
  showGrid,
}: {
  zoneMap: Map<string, string>;
  selectedZone: string | null;
  showLabels: boolean;
  showGrid: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    const dummy = new THREE.Object3D();

    for (let cx = -RENDER_CHUNKS; cx <= RENDER_CHUNKS; cx++) {
      for (let cz = -RENDER_CHUNKS; cz <= RENDER_CHUNKS; cz++) {
        const zone = zoneMap.get(`${cx}_${cz}`);
        if (!zone) continue;

        // Skip if zone is not selected (or show all if none selected)
        if (selectedZone && zone !== selectedZone) continue;

        const chunkGroup = new THREE.Group();
        const worldX = cx * CHUNK_SIZE;
        const worldZ = cz * CHUNK_SIZE;

        // Build road surface
        buildRoadSurface(chunkGroup, zone, 0);

        // Build elevated structure for highway
        if (zone === 'highway' && cz % 3 === 0) {
          buildElevatedStructure(chunkGroup, CHUNK_SIZE);
        }

        // Build barriers for highway
        if (zone === 'highway') {
          buildHighwayBarriers(chunkGroup, CHUNK_SIZE);
        }

        // Build street lights
        if (zone === 'cityCenter' || zone === 'suburban' || zone === 'highway') {
          buildStreetLights(chunkGroup, CHUNK_SIZE, zone);
        }

        // Build intersection markings for city
        if (zone === 'cityCenter') {
          buildIntersectionMarkings(chunkGroup, 0);
        }

        chunkGroup.position.set(worldX, 0, worldZ);
        groupRef.current.add(chunkGroup);
      }
    }

    // Add grid helper
    if (showGrid) {
      const grid = new GridHelper(
        CHUNK_SIZE * (RENDER_CHUNKS * 2 + 1),
        RENDER_CHUNKS * 2 + 1,
        0x444444,
        0x222222
      );
      grid.position.y = -0.1;
      groupRef.current.add(grid);
    }
  }, [zoneMap, selectedZone, showGrid]);

  return (
    <group ref={groupRef as any}>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[CHUNK_SIZE * (RENDER_CHUNKS * 2 + 1), CHUNK_SIZE * (RENDER_CHUNKS * 2 + 1)]} />
        <meshStandardMaterial color={0x1a472a} roughness={1} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Helper Functions
 * ───────────────────────────────────────────── */

/** Determine zone type for chunk */
function determineZone(cx: number, cz: number): string {
  const isHighwayCorridor = Math.abs(cx % 5) === 0;
  const distFromCenter = Math.sqrt(cx * cx + cz * cz);
  const isCityCenter = distFromCenter < 3;
  const isSuburban = distFromCenter < 6 && !isCityCenter;

  if (isHighwayCorridor && !isCityCenter) return 'highway';
  if (isCityCenter) return 'cityCenter';
  if (isSuburban) return 'suburban';
  if (isHighwayCorridor && distFromCenter >= 6) return 'industrial';

  return 'countryside';
}

/** Build road surface */
function buildRoadSurface(group: THREE.Group, zone: string, elevation: number): void {
  const roadGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
  const roadMat = new THREE.MeshStandardMaterial({
    color: ZONE_COLORS[zone as keyof typeof ZONE_COLORS] || 0x333333,
    roughness: 0.8,
    metalness: 0.1,
  });

  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = elevation;
  road.receiveShadow = true;
  group.add(road);
}

/** Build elevated bridge structure */
function buildElevatedStructure(group: THREE.Group, chunkSize: number): void {
  const elevatedHeight = 8;

  // Bridge deck
  const bridgeGeo = new THREE.BoxGeometry(chunkSize, 0.3, chunkSize);
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.9,
  });
  const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
  bridge.position.y = elevatedHeight - 0.15;
  bridge.receiveShadow = true;
  bridge.castShadow = true;
  group.add(bridge);

  // Support pillars
  const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, elevatedHeight, 8);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x777777,
    roughness: 0.7,
  });

  const halfChunk = chunkSize / 2;
  const pillarPositions = [
    { x: -halfChunk + 5, z: -halfChunk + 5 },
    { x: halfChunk - 5, z: -halfChunk + 5 },
    { x: -halfChunk + 5, z: halfChunk - 5 },
    { x: halfChunk - 5, z: halfChunk - 5 },
  ];

  for (const pos of pillarPositions) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos.x, elevatedHeight / 2, pos.z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }
}

/** Build highway barriers */
function buildHighwayBarriers(group: THREE.Group, chunkSize: number): void {
  const barrierHeight = 0.9;
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.5,
    metalness: 0.3,
  });

  const barrierGeo = new THREE.BoxGeometry(0.3, barrierHeight, chunkSize);
  const halfChunk = chunkSize / 2;

  const barrierLeft = new THREE.Mesh(barrierGeo, barrierMat);
  barrierLeft.position.set(-halfChunk, barrierHeight / 2, 0);
  barrierLeft.castShadow = true;
  group.add(barrierLeft);

  const barrierRight = new THREE.Mesh(barrierGeo, barrierMat);
  barrierRight.position.set(halfChunk, barrierHeight / 2, 0);
  barrierRight.castShadow = true;
  group.add(barrierRight);
}

/** Build street lights using InstancedMesh */
function buildStreetLights(group: THREE.Group, chunkSize: number, zone: string): void {
  const lightHeight = zone === 'highway' ? 7 : 5;
  const spacing = 25;

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.5,
    roughness: 0.5,
  });

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 2,
  });

  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, lightHeight, 8);
  const lampGeo = new THREE.BoxGeometry(0.5, 0.1, 0.2);

  const poleCount = Math.floor(chunkSize / spacing) * 2;
  const lampCount = Math.floor(chunkSize / spacing) * 2;

  const poleInstanced = new THREE.InstancedMesh(poleGeo, poleMat, poleCount);
  const lampInstanced = new THREE.InstancedMesh(lampGeo, lampMat, lampCount);
  poleInstanced.castShadow = true;

  const dummy = new THREE.Object3D();
  let poleIndex = 0;
  let lampIndex = 0;
  const halfChunk = chunkSize / 2;

  for (let z = -halfChunk + spacing; z < halfChunk; z += spacing) {
    // Left side
    if (poleIndex < poleCount) {
      dummy.position.set(-halfChunk - 1, lightHeight / 2, z);
      dummy.updateMatrix();
      poleInstanced.setMatrixAt(poleIndex, dummy.matrix);
      poleIndex++;

      dummy.position.set(-halfChunk - 0.5, lightHeight, z);
      dummy.updateMatrix();
      lampInstanced.setMatrixAt(lampIndex, dummy.matrix);
      lampIndex++;
    }

    // Right side
    if (poleIndex < poleCount) {
      dummy.position.set(halfChunk + 1, lightHeight / 2, z);
      dummy.updateMatrix();
      poleInstanced.setMatrixAt(poleIndex, dummy.matrix);
      poleIndex++;

      dummy.position.set(halfChunk + 0.5, lightHeight, z);
      dummy.updateMatrix();
      lampInstanced.setMatrixAt(lampIndex, dummy.matrix);
      lampIndex++;
    }
  }

  poleInstanced.instanceMatrix.needsUpdate = true;
  lampInstanced.instanceMatrix.needsUpdate = true;

  group.add(poleInstanced);
  group.add(lampInstanced);
}

/** Build intersection markings */
function buildIntersectionMarkings(group: THREE.Group, elevation: number): void {
  const markingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.2,
  });

  // Crosswalk stripes
  const stripeGeo = new THREE.PlaneGeometry(3.5, 0.3);
  for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(stripeGeo, markingMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i * 1.5, elevation + 0.01, 0);
    group.add(stripe);
  }
}
