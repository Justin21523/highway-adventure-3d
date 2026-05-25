/**
 * useTraffic — Hook for traffic state and interactions.
 *
 * Provides reactive access to traffic data from the trafficStore.
 * Used by UI components and traffic-related components.
 */

import { useEffect, useCallback } from 'react';
import { useTrafficStore } from '@/stores/trafficStore';
import { useGameStore } from '@/stores/gameStore';
import { GameRuntime } from '@/systems/GameRuntime';
import type { GameEventType } from '@/systems/GameRuntime';

/* ─────────────────────────────────────────────
 * useTraffic Hook
 * ───────────────────────────────────────────── */

export function useTraffic() {
  const activeCars = useTrafficStore((state) => state.activeCars);
  const isEnabled = useTrafficStore((state) => state.isEnabled);
  const spawnConfig = useTrafficStore((state) => state.spawnConfig);

  const toggleTraffic = useTrafficStore((state) => state.toggleTraffic);
  const setSpawnConfig = useTrafficStore((state) => state.setSpawnConfig);

  // Subscribe to traffic events
  useEffect(() => {
    const runtime = GameRuntime.getInstance();

    const handleTrafficSpawned = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'traffic_spawned') {
        console.log('Traffic spawned:', event.data?.carId);
      }
    };

    const handleTrafficDespawned = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'traffic_despawned') {
        console.log('Traffic despawned:', event.data?.carId);
      }
    };

    runtime.on('traffic_spawned', handleTrafficSpawned);
    runtime.on('traffic_despawned', handleTrafficDespawned);

    return () => {
      runtime.off('traffic_spawned', handleTrafficSpawned);
      runtime.off('traffic_despawned', handleTrafficDespawned);
    };
  }, []);

  const activeCarCount = activeCars.size;

  return {
    activeCars,
    isEnabled,
    spawnConfig,
    activeCarCount,
    toggleTraffic,
    setSpawnConfig,
  };
}

/* ─────────────────────────────────────────────
 * useTrafficNearby Hook
 * ───────────────────────────────────────────── */

export function useTrafficNearby(radius: number = 50) {
  const activeCars = useTrafficStore((state) => state.activeCars);
  const playerPosition = useGameStore((state) => state.vehicle.position);

  const nearbyCars = Array.from(activeCars.values()).filter((car) => {
    const dx = car.position.x - playerPosition.x;
    const dz = car.position.z - playerPosition.z;
    return Math.sqrt(dx * dx + dz * dz) < radius;
  });

  return { nearbyCars };
}

/* ─────────────────────────────────────────────
 * useTrafficCollision Hook
 * ───────────────────────────────────────────── */

export function useTrafficCollision() {
  const activeCars = useTrafficStore((state) => state.activeCars);
  const vehicleHealth = useGameStore((state) => state.vehicle.health);

  const handleCollision = useCallback((carId: string) => {
    const gameStore = useGameStore.getState();
    gameStore.updateVehicleState({
      health: Math.max(0, vehicleHealth - 15),
      speed: Math.max(0, gameStore.vehicle.speed * 0.5),
    });

    // Dispatch collision event
    GameRuntime.getInstance().dispatchEvent({
      type: 'traffic_collision' as GameEventType,
      timestamp: Date.now(),
      data: { carId },
    });
  }, [vehicleHealth]);

  return { handleCollision };
}
