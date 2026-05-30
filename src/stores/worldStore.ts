/**
 * World state store.
 *
 * Manages player position, current chunk ID, active chunk data, and
 * discovered points of interest. All chunk geometry rendering is handled
 * by the ChunkStreamer system — this store only tracks logical state.
 *
 * Position updates come from the vehicle physics system every frame.
 * Chunk transitions are computed by the ChunkStreamer system.
 */

import { create } from 'zustand';
import type { ChunkId, Vector3Data, ZoneType } from '@/types/core';
import type { ChunkData, PointOfInterest } from '@/types/world';
import { WORLD } from '@/constants/world';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Shape of the world store state */
interface WorldStoreState {
  /** Player's current 3D position */
  playerPosition: Vector3Data;

  /** Current chunk ID the player is in (format: "cx_cz") */
  currentChunkId: ChunkId;

  /** Map of active chunk IDs to their generated data */
  activeChunks: Map<ChunkId, ChunkData>;

  /** Set of discovered POI IDs (for minimap / exploration) */
  discoveredPoiIds: Set<string>;

  /** Whether the player is currently on an elevated road / bridge */
  isElevated: boolean;

  /** Current elevation above ground level (meters) */
  elevation: number;
}

/** Shape of the world store actions */
interface WorldStoreActions {
  /* ── Position ── */
  setPlayerPosition: (pos: Vector3Data) => void;

  /* ── Chunk Management ── */
  setCurrentChunk: (chunkId: ChunkId) => void;
  registerChunk: (chunkId: ChunkId, data: ChunkData) => void;
  unregisterChunk: (chunkId: ChunkId) => void;
  clearAllChunks: () => void;

  /* ── POI Discovery ── */
  discoverPoi: (poiId: string) => void;
  isPoiDiscovered: (poiId: string) => boolean;

  /* ── Elevation ── */
  setElevation: (elevation: number, isElevated: boolean) => void;

  /* ── Helpers ── */
  getChunkAtPosition: (x: number, z: number) => ChunkId;
  getChunkData: (chunkId: ChunkId) => ChunkData | undefined;
  getActiveChunkCount: () => number;
  resetWorld: () => void;
}

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

/** Convert world coordinates to chunk grid coordinates */
function worldToChunkGrid(x: number, z: number): { cx: number; cz: number } {
  const cx = Math.floor(x / WORLD.CHUNK_SIZE);
  const cz = Math.floor(z / WORLD.CHUNK_SIZE);
  return { cx, cz };
}

/** Convert chunk grid coordinates to chunk ID string */
function chunkGridToId(cx: number, cz: number): ChunkId {
  return `${cx}_${cz}`;
}

/* ─────────────────────────────────────────────
 * Initial State
 * ───────────────────────────────────────────── */

// Start in the right inner lane (lane centre X ≈ 4.35, matches HighwayNetworkSystem)
const initialPosition: Vector3Data = { x: 4.35, y: 0.5, z: 0 };
const initialChunkId = chunkGridToId(
  worldToChunkGrid(initialPosition.x, initialPosition.z).cx,
  worldToChunkGrid(initialPosition.x, initialPosition.z).cz,
);

/* ─────────────────────────────────────────────
 * Store
 * ───────────────────────────────────────────── */

export const useWorldStore = create<WorldStoreState & WorldStoreActions>()((set, get) => ({
  /* ── State ── */
  playerPosition: initialPosition,
  currentChunkId: initialChunkId,
  activeChunks: new Map(),
  discoveredPoiIds: new Set(),
  isElevated: false,
  elevation: 0,

  /* ── Position Actions ── */

  setPlayerPosition: (pos) =>
    set((state) => {
      const newPos = {
        x: Number(pos.x) || 0,
        y: Number(pos.y) || 0,
        z: Number(pos.z) || 0,
      };

      // Compute new chunk ID
      const { cx, cz } = worldToChunkGrid(newPos.x, newPos.z);
      const newChunkId = chunkGridToId(cx, cz);

      return {
        playerPosition: newPos,
        currentChunkId: newChunkId,
      };
    }),

  /* ── Chunk Management Actions ── */

  setCurrentChunk: (chunkId) => set({ currentChunkId: chunkId }),

  registerChunk: (chunkId, data) =>
    set((state) => {
      const newChunks = new Map(state.activeChunks);
      newChunks.set(chunkId, data);
      return { activeChunks: newChunks };
    }),

  unregisterChunk: (chunkId) =>
    set((state) => {
      const newChunks = new Map(state.activeChunks);
      newChunks.delete(chunkId);
      return { activeChunks: newChunks };
    }),

  clearAllChunks: () => set({ activeChunks: new Map() }),

  /* ── POI Discovery Actions ── */

  discoverPoi: (poiId) =>
    set((state) => {
      const newPois = new Set(state.discoveredPoiIds);
      newPois.add(poiId);
      return { discoveredPoiIds: newPois };
    }),

  isPoiDiscovered: (poiId) => get().discoveredPoiIds.has(poiId),

  /* ── Elevation Actions ── */

  setElevation: (elevation, isElevated) =>
    set({
      elevation: Number(elevation) || 0,
      isElevated: !!isElevated,
    }),

  /* ── Helper Actions ── */

  getChunkAtPosition: (x, z) => chunkGridToId(worldToChunkGrid(x, z).cx, worldToChunkGrid(x, z).cz),
  getChunkData: (chunkId) => get().activeChunks.get(chunkId),

  getActiveChunkCount: () => get().activeChunks.size,

  /* ── Reset ── */

  resetWorld: () =>
    set({
      playerPosition: initialPosition,
      currentChunkId: initialChunkId,
      activeChunks: new Map(),
      discoveredPoiIds: new Set(),
      isElevated: false,
      elevation: 0,
    }),
}));
