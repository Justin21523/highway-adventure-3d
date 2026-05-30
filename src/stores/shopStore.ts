/**
 * Shop state store.
 *
 * Manages active shops in the world, interaction zones, player inventory,
 * and shop-related state. Shop placement is handled by the ShopGenerator
 * system; this store tracks logical state only.
 */

import { create } from 'zustand';
import type { EntityId, Vector3Data, ChunkId } from '@/types/core';
import type { Shop, InventoryItem, InteractionZone, ShopItem } from '@/types/shop';
import { ITEM_CATALOG_MAP, SHOP_ITEM_ASSIGNMENTS, SHOP_INTERACTION_RADIUS } from '@/constants/shops';
import { useGameStore } from '@/stores/gameStore';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Shape of the shop store state */
interface ShopStoreState {
  /** Map of shop IDs to shop data */
  activeShops: Map<EntityId, Shop>;

  /** Map of shop IDs to their interaction zones */
  interactionZones: Map<EntityId, InteractionZone>;

  /** Player's inventory (items owned) */
  inventory: InventoryItem[];

  /** Currently open shop ID (null = no shop UI open) */
  openShopId: EntityId | null;
  openShopData: Shop | null;

  /** Whether the player is currently inside any interaction zone */
  isNearShop: boolean;

  /** ID of the shop the player is nearest to */
  nearestShopId: EntityId | null;
  nearShopId: EntityId | null;

  /** Shop currently being explored in first/third-person interior mode */
  interiorShopId: EntityId | null;
}

/** Shape of the shop store actions */
interface ShopStoreActions {
  /* ── Shop Management ── */
  registerShop: (shop: Shop) => void;
  unregisterShop: (shopId: EntityId) => void;
  updateShopState: (shopId: EntityId, isOpen: boolean) => void;

  /* ── Interaction Zone ── */
  updateInteractionZone: (shopId: EntityId, center: Vector3Data, radius: number) => void;
  setPlayerNearShop: (near: boolean, shopId: EntityId | null) => void;

  /* ── Inventory ── */
  addItemToInventory: (itemId: string, quantity?: number) => void;
  removeItemFromInventory: (itemId: string, quantity?: number) => boolean;
  getInventoryItem: (itemId: string) => InventoryItem | undefined;
  getItemCount: (itemId: string) => number;
  hasItem: (itemId: string) => boolean;

  /* ── Shop UI ── */
  openShop: (shopId: EntityId) => void;
  closeShop: () => void;
  purchaseItem: (itemId: string) => boolean;
  enterShopInterior: (shopId: EntityId) => void;
  exitShopInterior: () => void;
  getOpenShop: () => Shop | undefined;
  getOpenShopItems: () => ShopItem[];

  /* ── Helpers ── */
  getActiveShopCount: () => number;
  getShopsByCategory: (category: string) => Shop[];
  getShopsInChunk: (chunkId: ChunkId) => Shop[];
  resetShops: () => void;
}

/* ─────────────────────────────────────────────
 * Initial State
 * ───────────────────────────────────────────── */

const initialInventory: InventoryItem[] = [
  { itemId: 'repair_kit', quantity: 2 },
  { itemId: 'fuel_can_small', quantity: 1 },
];

/* ─────────────────────────────────────────────
 * Store
 * ───────────────────────────────────────────── */

export const useShopStore = create<ShopStoreState & ShopStoreActions>()((set, get) => ({
  /* ── State ── */
  activeShops: new Map(),
  interactionZones: new Map(),
  inventory: initialInventory,
  openShopId: null,
  openShopData: null,
  isNearShop: false,
  nearestShopId: null,
  nearShopId: null,
  interiorShopId: null,

  /* ── Shop Management Actions ── */

  registerShop: (shop) =>
    set((state) => {
      const newShops = new Map(state.activeShops);
      newShops.set(shop.id, shop);

      // Create initial interaction zone
      const newZones = new Map(state.interactionZones);
      newZones.set(shop.id, {
        shopId: shop.id,
        center: shop.position,
        radius: shop.interactionRadius || SHOP_INTERACTION_RADIUS,
        isPlayerInside: false,
      });

      return { activeShops: newShops, interactionZones: newZones };
    }),

  unregisterShop: (shopId) =>
    set((state) => {
      const newShops = new Map(state.activeShops);
      newShops.delete(shopId);
      const newZones = new Map(state.interactionZones);
      newZones.delete(shopId);
      return { activeShops: newShops, interactionZones: newZones };
    }),

  updateShopState: (shopId, isOpen) =>
    set((state) => {
      const shop = state.activeShops.get(shopId);
      if (!shop) return {};
      const newShops = new Map(state.activeShops);
      newShops.set(shopId, { ...shop, isOpen });
      return { activeShops: newShops };
    }),

  /* ── Interaction Zone Actions ── */

  updateInteractionZone: (shopId, center, radius) =>
    set((state) => {
      const zone = state.interactionZones.get(shopId);
      if (!zone) return {};
      const newZones = new Map(state.interactionZones);
      newZones.set(shopId, { ...zone, center, radius });
      return { interactionZones: newZones };
    }),

  setPlayerNearShop: (near, shopId) =>
    set((state) => {
      // Update zone isPlayerInside flag
      const newZones = new Map(state.interactionZones);
      if (shopId) {
        const zone = newZones.get(shopId);
        if (zone) {
          newZones.set(shopId, { ...zone, isPlayerInside: near });
        }
      }
      return { isNearShop: near, nearestShopId: near ? shopId : null, nearShopId: near ? shopId : null, interactionZones: newZones };
    }),

  /* ── Inventory Actions ── */

  addItemToInventory: (itemId, quantity = 1) =>
    set((state) => {
      const newInventory = [...state.inventory];
      const existing = newInventory.find((item) => item.itemId === itemId);

      if (existing) {
        // Update existing item quantity
        const itemCatalog = ITEM_CATALOG_MAP[itemId];
        const maxStack = itemCatalog?.maxStack ?? 99;
        existing.quantity = Math.min(existing.quantity + quantity, maxStack);
      } else {
        // Add new item
        newInventory.push({ itemId, quantity });
      }

      return { inventory: newInventory };
    }),

  removeItemFromInventory: (itemId, quantity = 1) => {
    const state = get();
    const item = state.inventory.find((i) => i.itemId === itemId);
    if (!item || item.quantity < quantity) return false;

    set((state) => {
      const newInventory = state.inventory.map((i) => {
        if (i.itemId === itemId) {
          const newQty = i.quantity - quantity;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter((i): i is InventoryItem => i !== null);

      return { inventory: newInventory };
    });
    return true;
  },

  getInventoryItem: (itemId) => get().inventory.find((item) => item.itemId === itemId),

  getItemCount: (itemId) => {
    const item = get().inventory.find((i) => i.itemId === itemId);
    return item?.quantity ?? 0;
  },

  hasItem: (itemId) => get().inventory.some((item) => item.itemId === itemId),

  /* ── Shop UI Actions ── */

  openShop: (shopId) => {
    const shop = get().activeShops.get(shopId);
    if (!shop) return;
    set({ openShopId: shopId, openShopData: shop });
  },

  closeShop: () => set({ openShopId: null, openShopData: null }),

  purchaseItem: (itemId) => {
    const item = ITEM_CATALOG_MAP[itemId];
    if (!item) return false;
    if (!useGameStore.getState().spendCoins(item.price)) return false;
    get().addItemToInventory(itemId, 1);
    useGameStore.setState((state) => ({ totalPurchases: state.totalPurchases + 1 }));
    return true;
  },

  enterShopInterior: (shopId) => {
    const shop = get().activeShops.get(shopId);
    if (!shop) return;
    set({ interiorShopId: shopId, openShopId: shopId, openShopData: shop });
  },

  exitShopInterior: () => set({ interiorShopId: null, openShopId: null, openShopData: null }),

  getOpenShop: () => {
    const shopId = get().openShopId;
    if (!shopId) return undefined;
    return get().activeShops.get(shopId);
  },

  getOpenShopItems: () => {
    const shop = get().getOpenShop();
    if (!shop) return [];

    return (shop.items || [])
      .map((itemId) => ITEM_CATALOG_MAP[itemId])
      .filter((item): item is ShopItem => item !== undefined);
  },

  /* ── Helper Actions ── */

  getActiveShopCount: () => get().activeShops.size,

  getShopsByCategory: (category) =>
    Array.from(get().activeShops.values()).filter((shop) => shop.category === category),

  getShopsInChunk: (chunkId) =>
    Array.from(get().activeShops.values()).filter((shop) => shop.chunkId === chunkId),

  /* ── Reset ── */

  resetShops: () =>
    set({
      activeShops: new Map(),
      interactionZones: new Map(),
      inventory: [...initialInventory],
      openShopId: null,
      openShopData: null,
      isNearShop: false,
      nearestShopId: null,
      nearShopId: null,
      interiorShopId: null,
    }),
}));
