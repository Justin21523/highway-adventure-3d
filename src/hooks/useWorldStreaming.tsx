/**
 * useWorldStreaming — Hook for world chunk streaming state.
 *
 * Provides reactive access to chunk streaming state from the worldStore.
 * Used by UI components to display chunk info and by components that
 * need to react to chunk changes.
 */

import { useEffect, useCallback } from 'react';
import { useWorldStore } from '@/stores/worldStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { GameRuntime } from '@/systems/GameRuntime';
import type { GameEventType } from '@/systems/GameRuntime';

/* ─────────────────────────────────────────────
 * useWorldStreaming Hook
 * ───────────────────────────────────────────── */

export function useWorldStreaming() {
  const activeChunks = useWorldStore((state) => state.activeChunks);
  const currentChunkId = useWorldStore((state) => state.currentChunkId);
  const playerPosition = useWorldStore((state) => state.playerPosition);
  const discoveredPoiIds = useWorldStore((state) => state.discoveredPoiIds);

  // Subscribe to chunk events
  useEffect(() => {
    const runtime = GameRuntime.getInstance();

    const handleChunkLoaded = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'chunk_loaded') {
        console.log('Chunk loaded:', event.data?.chunkId);
      }
    };

    const handleChunkUnloaded = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'chunk_unloaded') {
        console.log('Chunk unloaded:', event.data?.chunkId);
      }
    };

    runtime.on('chunk_loaded', handleChunkLoaded);
    runtime.on('chunk_unloaded', handleChunkUnloaded);

    return () => {
      runtime.off('chunk_loaded', handleChunkLoaded);
      runtime.off('chunk_unloaded', handleChunkUnloaded);
    };
  }, []);

  // Get active chunk count
  const activeChunkCount = activeChunks.size;

  // Get discovered POI count
  const discoveredPoiCount = discoveredPoiIds.size;

  return {
    activeChunks,
    currentChunkId,
    playerPosition,
    discoveredPoiIds,
    activeChunkCount,
    discoveredPoiCount,
  };
}

/* ─────────────────────────────────────────────
 * usePlayerPosition Hook
 * ───────────────────────────────────────────── */

export function usePlayerPosition() {
  const playerPosition = useWorldStore((state) => state.playerPosition);
  const currentChunkId = useWorldStore((state) => state.currentChunkId);

  return {
    playerPosition,
    currentChunkId,
  };
}

/* ─────────────────────────────────────────────
 * useChunkInfo Hook
 * ───────────────────────────────────────────── */

export function useChunkInfo() {
  const currentChunkId = useWorldStore((state) => state.currentChunkId);
  const activeChunks = useWorldStore((state) => state.activeChunks);
  const chunkData = useWorldStore((state) => state.getChunkData(currentChunkId));

  return {
    currentChunkId,
    activeChunks: activeChunks.size,
    chunkData,
  };
}

/* ─────────────────────────────────────────────
 * usePOIs Hook
 * ───────────────────────────────────────────── */

export function usePOIs() {
  const discoveredPoiIds = useWorldStore((state) => state.discoveredPoiIds);
  const isPOIDiscovered = useWorldStore((state) => state.isPoiDiscovered);

  const markPOIDiscovered = useCallback((poiId: string) => {
    useWorldStore.getState().discoverPoi(poiId);
  }, []);

  return {
    discoveredPoiIds,
    isPOIDiscovered,
    markPOIDiscovered,
  };
}

/* ─────────────────────────────────────────────
 * usePerformanceMonitor Hook
 * ───────────────────────────────────────────── */

export function usePerformanceMonitor() {
  const fps = usePerformanceStore((state) => state.metrics.fps);
  const qualityTier = usePerformanceStore((state) => state.qualityTier);
  const autoScaleEnabled = usePerformanceStore((state) => state.autoScaleEnabled);
  const settings = usePerformanceStore((state) => state.settings);

  const setQualityTier = usePerformanceStore((state) => state.setQualityTier);
  const toggleAutoScale = usePerformanceStore((state) => state.toggleAutoScale);

  return {
    fps,
    qualityTier,
    autoScaleEnabled,
    settings,
    setQualityTier,
    toggleAutoScale,
  };
}