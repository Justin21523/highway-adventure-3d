/**
 * useShops — Hook for shop state and interactions.
 *
 * Provides reactive access to shop data from the shopStore.
 * Used by UI components and shop-related components.
 */

import { useEffect, useCallback } from 'react';
import { useShopStore } from '@/stores/shopStore';
import { useGameStore } from '@/stores/gameStore';
import { ShopSystem } from '@/systems/ShopSystem';
import { GameRuntime } from '@/systems/GameRuntime';
import type { GameEventType } from '@/systems/GameRuntime';
import type { ShopCategory } from '@/types/shop';

/* ─────────────────────────────────────────────
 * useShops Hook
 * ───────────────────────────────────────────── */

export function useShops() {
  const activeShops = useShopStore((state) => state.activeShops);
  const openShopId = useShopStore((state) => state.openShopId);
  const isNearShop = useShopStore((state) => state.isNearShop);
  const nearShopId = useShopStore((state) => state.nearShopId);

  const openShop = useCallback((shopId: string) => {
    return ShopSystem.getInstance().openShop(shopId);
  }, []);

  const closeShop = useCallback(() => {
    ShopSystem.getInstance().closeShop();
  }, []);

  const purchaseItem = useCallback((itemId: string) => {
    return ShopSystem.getInstance().purchaseItem(itemId);
  }, []);

  // Subscribe to shop events
  useEffect(() => {
    const runtime = GameRuntime.getInstance();

    const handleShopEntered = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'shop_entered') {
        console.log('Shop entered:', event.data?.shopName);
      }
    };

    const handleShopExited = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'shop_exited') {
        console.log('Shop exited');
      }
    };

    runtime.on('shop_entered', handleShopEntered);
    runtime.on('shop_exited', handleShopExited);

    return () => {
      runtime.off('shop_entered', handleShopEntered);
      runtime.off('shop_exited', handleShopExited);
    };
  }, []);

  const openShopData = openShopId ? activeShops.get(openShopId) : null;

  return {
    activeShops,
    openShopId,
    openShopData,
    isNearShop,
    nearShopId,
    openShop,
    closeShop,
    purchaseItem,
  };
}

/* ─────────────────────────────────────────────
 * useShopByCategory Hook
 * ───────────────────────────────────────────── */

export function useShopByCategory(category: ShopCategory) {
  const activeShops = useShopStore((state) => state.activeShops);

  const shops = Array.from(activeShops.values()).filter(
    (shop) => shop.category === category && shop.isOpen,
  );

  return { shops };
}

/* ─────────────────────────────────────────────
 * useNearestShop Hook
 * ───────────────────────────────────────────── */

export function useNearestShop(category?: ShopCategory) {
  const activeShops = useShopStore((state) => state.activeShops);
  const playerPosition = useGameStore((state) => state.vehicle.position);

  const nearestShop = (() => {
    let nearest = null;
    let nearestDist = Infinity;

    for (const shop of activeShops.values()) {
      if (category && shop.category !== category) continue;
      if (!shop.isOpen) continue;

      const dx = shop.position.x - playerPosition.x;
      const dz = shop.position.z - playerPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = shop;
      }
    }

    return nearest;
  })();

  return { nearestShop };
}

/* ─────────────────────────────────────────────
 * useInventory Hook
 * ───────────────────────────────────────────── */

export function useInventory() {
  const inventory = useShopStore((state) => state.inventory);
  const addItemToInventory = useShopStore((state) => state.addItemToInventory);
  const removeItemFromInventory = useShopStore((state) => state.removeItemFromInventory);

  const itemCount = inventory.length;

  return {
    inventory,
    itemCount,
    addItemToInventory,
    removeItemFromInventory,
  };
}
