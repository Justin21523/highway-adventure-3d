/**
 * Distance utilities — Chunk coordinate helpers.
 *
 * Functions for working with chunk grid coordinates and distances.
 */

import { WORLD } from '@/constants/world';

/**
 * Get the chunk grid coordinates for a world position.
 */
export function worldToChunkCoords(x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.floor(x / WORLD.CHUNK_SIZE),
    cz: Math.floor(z / WORLD.CHUNK_SIZE),
  };
}

/**
 * Get the chunk ID string for grid coordinates.
 */
export function chunkId(cx: number, cz: number): string {
  return `${cx}_${cz}`;
}

/**
 * Parse a chunk ID string into grid coordinates.
 */
export function parseChunkId(id: string): { cx: number; cz: number } | null {
  const parts = id.split('_');
  if (parts.length !== 2) return null;

  const cx = Number(parts[0]);
  const cz = Number(parts[1]);

  if (isNaN(cx) || isNaN(cz)) return null;

  return { cx, cz };
}

/**
 * Get the world center position for a chunk.
 */
export function chunkToWorldCenter(cx: number, cz: number): { x: number; z: number } {
  return {
    x: (cx + 0.5) * WORLD.CHUNK_SIZE,
    z: (cz + 0.5) * WORLD.CHUNK_SIZE,
  };
}

/**
 * Get the world bounds for a chunk.
 */
export function chunkToWorldBounds(cx: number, cz: number): {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
} {
  return {
    minX: cx * WORLD.CHUNK_SIZE,
    minZ: cz * WORLD.CHUNK_SIZE,
    maxX: (cx + 1) * WORLD.CHUNK_SIZE,
    maxZ: (cz + 1) * WORLD.CHUNK_SIZE,
  };
}

/**
 * Check if two chunks are adjacent (including diagonals).
 */
export function areChunksAdjacent(cx1: number, cz1: number, cx2: number, cz2: number): boolean {
  const dx = Math.abs(cx1 - cx2);
  const dz = Math.abs(cz1 - cz2);
  return dx <= 1 && dz <= 1 && !(dx === 0 && dz === 0);
}

/**
 * Check if two chunks share an edge (not diagonal).
 */
export function areChunksEdgeAdjacent(cx1: number, cz1: number, cx2: number, cz2: number): boolean {
  const dx = Math.abs(cx1 - cx2);
  const dz = Math.abs(cz1 - cz2);
  return (dx === 1 && dz === 0) || (dx === 0 && dz === 1);
}

/**
 * Get the distance between two chunks in grid units.
 */
export function chunkDistance(cx1: number, cz1: number, cx2: number, cz2: number): number {
  const dx = cx2 - cx1;
  const dz = cz2 - cz1;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Get all chunks within a radius of a center chunk.
 */
export function getChunksInRange(
  centerCx: number,
  centerCz: number,
  radius: number,
): { cx: number; cz: number }[] {
  const chunks: { cx: number; cz: number }[] = [];
  const radiusSquared = radius * radius;

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (dx * dx + dz * dz <= radiusSquared) {
        chunks.push({
          cx: centerCx + dx,
          cz: centerCz + dz,
        });
      }
    }
  }

  return chunks;
}

/**
 * Get the nearest chunk to a world position.
 */
export function getNearestChunk(x: number, z: number): { cx: number; cz: number } {
  return worldToChunkCoords(x, z);
}

/**
 * Check if a world position is inside a specific chunk.
 */
export function isPositionInChunk(
  x: number,
  z: number,
  cx: number,
  cz: number,
): boolean {
  const bounds = chunkToWorldBounds(cx, cz);
  return x >= bounds.minX && x < bounds.maxX && z >= bounds.minZ && z < bounds.maxZ;
}
