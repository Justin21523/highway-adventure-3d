/**
 * usePickups — Hook for world pickup state.
 *
 * Provides reactive access to pickup data from the questStore.
 * Used by pickup-related components and UI.
 */

import { useEffect } from 'react';
import { useQuestStore } from '@/stores/questStore';
import { useGameStore } from '@/stores/gameStore';
import { GameRuntime } from '@/systems/GameRuntime';
import type { GameEventType } from '@/systems/GameRuntime';
import type { PickupType } from '@/types/quest';

/* ─────────────────────────────────────────────
 * usePickups Hook
 * ───────────────────────────────────────────── */

export function usePickups() {
  const worldPickups = useQuestStore((state) => state.worldPickups);
  const activePickups = useQuestStore((state) => state.getActivePickups());

  // Subscribe to pickup events
  useEffect(() => {
    const runtime = GameRuntime.getInstance();

    const handleCoinCollected = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'coin_collected') {
        console.log('Coins collected:', event.data?.amount);
      }
    };

    const handlePickupCollected = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'pickup_collected') {
        console.log('Pickup collected:', event.data?.type);
      }
    };

    runtime.on('coin_collected', handleCoinCollected);
    runtime.on('pickup_collected', handlePickupCollected);

    return () => {
      runtime.off('coin_collected', handleCoinCollected);
      runtime.off('pickup_collected', handlePickupCollected);
    };
  }, []);

  return {
    worldPickups,
    activePickups,
  };
}

/* ─────────────────────────────────────────────
 * usePickupsByType Hook
 * ───────────────────────────────────────────── */

export function usePickupsByType(type: PickupType) {
  const activePickups = useQuestStore((state) => state.getActivePickups());

  const pickups = Array.from(activePickups).filter((pickup) => pickup.type === type);

  return { pickups };
}

/* ─────────────────────────────────────────────
 * useCoinCollection Hook
 * ───────────────────────────────────────────── */

export function useCoinCollection() {
  const coins = useGameStore((state) => state.profile.coins);
  const addCoins = useGameStore((state) => state.addCoins);

  const totalCollected = useQuestStore((state) => state.stats.totalPickupsCollected);

  return {
    coins,
    addCoins,
    totalCollected,
  };
}
