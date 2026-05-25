/**
 * WorldChunks — Renders active chunks from the ChunkStreamer.
 *
 * Reads active chunks from worldStore and renders them as 3D meshes.
 * Uses instanced rendering for performance.
 */

import { useMemo } from 'react';
import { useWorldStore } from '@/stores/worldStore';
import { WORLD, HIGHWAY, DECORATION } from '@/constants/world';

/* ─────────────────────────────────────────────
 * WorldChunks Component
 * ───────────────────────────────────────────── */

export function WorldChunks() {
  const activeChunks = useWorldStore((state) => state.activeChunks);

  // Convert Map to array for rendering
  const chunkEntries = useMemo(() => Array.from(activeChunks.entries()), [activeChunks]);

  if (chunkEntries.length === 0) return null;

  return (
    <group>
      {chunkEntries.map(([chunkId, chunkData]) => (
        <Chunk key={chunkId} chunkId={chunkId} chunkData={chunkData} />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Single Chunk Component
 * ───────────────────────────────────────────── */

interface ChunkProps {
  chunkId: string;
  chunkData: import('@/types/world').ChunkData;
}

function Chunk({ chunkId, chunkData }: ChunkProps) {

  const roadColor = chunkData.zone === 'highway' ? '#2a2a2a' : '#333333';
  const chunkCenterX = (chunkData.gridX + 0.5) * WORLD.CHUNK_SIZE;
  const chunkCenterZ = (chunkData.gridZ + 0.5) * WORLD.CHUNK_SIZE;

  return (
    <group position={[chunkCenterX, chunkData.elevation, chunkCenterZ]}>
      {/* Road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD.CHUNK_SIZE, WORLD.CHUNK_SIZE]} />
        <meshStandardMaterial color={roadColor} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Lane markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.15, WORLD.CHUNK_SIZE * 0.8]} />
        <meshStandardMaterial color="#ffffff" emissive="#94a3b8" emissiveIntensity={0.2} />
      </mesh>

      {/* Side barriers for highways */}
      {(chunkData.zone === 'highway' || chunkData.hasBridge) && (
        <>
          <mesh position={[-WORLD.CHUNK_SIZE / 2, HIGHWAY.BARRIER_HEIGHT / 2, 0]}>
            <boxGeometry args={[0.3, HIGHWAY.BARRIER_HEIGHT, WORLD.CHUNK_SIZE]} />
            <meshStandardMaterial color="#666666" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[WORLD.CHUNK_SIZE / 2, HIGHWAY.BARRIER_HEIGHT / 2, 0]}>
            <boxGeometry args={[0.3, HIGHWAY.BARRIER_HEIGHT, WORLD.CHUNK_SIZE]} />
            <meshStandardMaterial color="#666666" roughness={0.5} metalness={0.3} />
          </mesh>
        </>
      )}

      {/* Street lights */}
      {chunkData.roads.some((r) => r.hasStreetLights) && (
        <StreetLights elevation={chunkData.elevation} />
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Street Lights Component
 * ───────────────────────────────────────────── */

function StreetLights({ elevation }: { elevation: number }) {
  const lampPositions = useMemo(() => {
    const positions: number[] = [];
    const spacing = DECORATION.STREET_LIGHT_SPACING;
    const halfChunk = WORLD.CHUNK_SIZE / 2;
    for (let z = -halfChunk + spacing; z < halfChunk; z += spacing) {
      positions.push(z);
    }
    return positions;
  }, []);

  const halfChunk = WORLD.CHUNK_SIZE / 2;
  const lightHeight = DECORATION.STREET_LIGHT_HEIGHT;

  return (
    <group>
      {lampPositions.map((z, i) => (
        <group key={i}>
          {/* Left pole */}
          <mesh position={[-halfChunk - 1, elevation + lightHeight / 2, z]}>
            <cylinderGeometry args={[0.08, 0.1, lightHeight, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[-halfChunk - 0.5, elevation + lightHeight, z]}>
            <boxGeometry args={[0.5, 0.1, 0.2]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} />
          </mesh>

          {/* Right pole */}
          <mesh position={[halfChunk + 1, elevation + lightHeight / 2, z]}>
            <cylinderGeometry args={[0.08, 0.1, lightHeight, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[halfChunk + 0.5, elevation + lightHeight, z]}>
            <boxGeometry args={[0.5, 0.1, 0.2]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

