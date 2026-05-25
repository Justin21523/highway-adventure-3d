/**
 * Obstacles — Road obstacles and hazards.
 *
 * Renders barriers, construction zones, and other road hazards.
 */
import * as THREE from 'three';
import { useMemo } from 'react';
import { useWorldStore } from '@/stores/worldStore';

/* ─────────────────────────────────────────────
 * Obstacles Component
 * ───────────────────────────────────────────── */

export function Obstacles() {
  const activeChunks = useWorldStore((state) => state.activeChunks);

  const obstacleChunks = useMemo(() => {
    const obstacles: { chunkId: string; chunkData: import('@/types/world').ChunkData }[] = [];
    for (const [chunkId, chunkData] of activeChunks) {
      if (chunkData.hasIntersection || chunkData.zone === 'cityCenter') {
        obstacles.push({ chunkId, chunkData });
      }
    }
    return obstacles;
  }, [activeChunks]);

  if (obstacleChunks.length === 0) return null;

  return (
    <group>
      {obstacleChunks.map(({ chunkId, chunkData }) => (
        <ChunkObstacles key={chunkId} chunkData={chunkData} />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * ChunkObstacles Component
 * ───────────────────────────────────────────── */

interface ChunkObstaclesProps {
  chunkData: import('@/types/world').ChunkData;
}

function ChunkObstacles({ chunkData }: ChunkObstaclesProps) {
  const chunkCenterX = (chunkData.gridX + 0.5) * 100;
  const chunkCenterZ = (chunkData.gridZ + 0.5) * 100;

  return (
    <group position={[chunkCenterX, chunkData.elevation, chunkCenterZ]}>
      {/* Traffic cones at intersections */}
      {chunkData.hasIntersection && (
        <>
          <TrafficCone x={-3} z={0} />
          <TrafficCone x={3} z={0} />
          <TrafficCone x={0} z={-3} />
          <TrafficCone x={0} z={3} />
        </>
      )}

      {/* Construction barriers */}
      {chunkData.zone === 'cityCenter' && (
        <ConstructionBarrier x={-8} z={-8} />
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * TrafficCone Component
 * ───────────────────────────────────────────── */

function TrafficCone({ x, z }: { x: number; z: number }) {
  const geo = useMemo(() => new THREE.ConeGeometry(0.2, 0.6, 8), []);

  return (
    <mesh position={[x, 0.3, z]} castShadow>
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
    </mesh>
  );
}

/* ─────────────────────────────────────────────
 * ConstructionBarrier Component
 * ───────────────────────────────────────────── */

function ConstructionBarrier({ x, z }: { x: number; z: number }) {
  const geo = useMemo(() => new THREE.BoxGeometry(3, 1, 0.3), []);

  return (
    <group position={[x, 0.5, z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#f97316" roughness={0.6} />
      </mesh>
      {/* Stripes */}
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[2.8, 0.3, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
