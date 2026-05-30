/**
 * ShopSystem — Shop interaction and proximity detection.
 *
 * Manages shop interaction zones, detects when the player is near a shop,
 * handles shop opening/closing based on time, and processes purchases.
 *
 * Reads from shopStore for state, writes back updates every frame.
 */

import * as THREE from 'three';
import { useShopStore } from '@/stores/shopStore';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { useQuestStore } from '@/stores/questStore';
import { GameRuntime } from './GameRuntime';
import { ITEM_CATALOG_MAP } from '@/constants/shops';
import { SHOP_INTERACTION_RADIUS } from '@/constants/shops';
import type { Shop, ShopCategory, ShopItem } from '@/types/shop';
import type { GameEventType } from './GameRuntime';

/* ─────────────────────────────────────────────
 * ShopSystem Singleton
 * ───────────────────────────────────────────── */

export class ShopSystem {
  private static instance: ShopSystem | null = null;

  /** Reusable vectors for distance calculations */
  private _playerPos = new THREE.Vector3();
  private _shopPos = new THREE.Vector3();
  private _distance = 0;

  /** Whether the player is currently trying to interact with a shop */
  private isInteracting = false;

  /** Last shop the player interacted with */
  private lastInteractedShopId: string | null = null;

  /** Time since last shop state check */
  private stateCheckTimer = 0;

  /** Whether the system is initialized */
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ShopSystem {
    if (!ShopSystem.instance) {
      ShopSystem.instance = new ShopSystem();
    }
    return ShopSystem.instance;
  }

  /* ── Initialization ── */

  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  /* ── Frame Update ── */

  update(delta: number): void {
    if (!this.isInitialized) return;

    const store = useShopStore.getState();
    const gameMode = useGameStore.getState().gameMode;

    // Skip if shop UI is already open
    if (gameMode === 'shop' || gameMode === 'garage') return;

    // Update shop open/close states periodically
    this.stateCheckTimer += delta;
    if (this.stateCheckTimer > 5) {
      this.updateShopOpenStates();
      this.stateCheckTimer = 0;
    }

    // Check proximity to shops
    if (!this.isInteracting) {
      this.checkShopProximity();
    }
  }

  /* ── Proximity Detection ── */

  /** Check if player is near any shop */
  private checkShopProximity(): void {
    const store = useShopStore.getState();
    const playerPos = useWorldStore.getState().playerPosition;
    this._playerPos.set(playerPos.x, playerPos.y, playerPos.z);

    let nearestShopId: string | null = null;
    let nearestDistance = Infinity;

    for (const [shopId, shop] of store.activeShops) {
      if (!shop.isOpen) continue;

      this._shopPos.set(shop.position.x, shop.position.y, shop.position.z);
      this._distance = this._playerPos.distanceTo(this._shopPos);

      const effectiveRadius = shop.interactionRadius || SHOP_INTERACTION_RADIUS;

      if (this._distance < effectiveRadius && this._distance < nearestDistance) {
        nearestDistance = this._distance;
        nearestShopId = shopId;
      }
    }

    // Update store with proximity state
    const isNearShop = nearestShopId !== null;
    store.setPlayerNearShop(isNearShop, nearestShopId);

    // Discover POIs when near shops
    if (isNearShop && nearestShopId) {
      const poiId = `poi_${nearestShopId}`;
      if (!store.isNearShop || this.lastInteractedShopId !== nearestShopId) {
        useWorldStore.getState().discoverPoi(poiId);
      }
      this.lastInteractedShopId = nearestShopId;
    }
  }

  /* ── Shop Open/Close States ── */

  /** Update all shops' open/close states based on current time */
  private updateShopOpenStates(): void {
    const store = useShopStore.getState();
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;

    for (const [shopId, shop] of store.activeShops) {
      const isOpen = hour >= shop.openHour && hour < shop.closeHour;
      if (shop.isOpen !== isOpen) {
        store.updateShopState(shopId, isOpen);
      }
    }
  }

  /* ── Interaction ── */

  /** Open a shop by ID */
  openShop(shopId: string): boolean {
    const store = useShopStore.getState();
    const shop = store.activeShops.get(shopId);

    if (!shop) return false;
    if (!shop.isOpen) {
      useGameStore.getState().addNotification(`${shop.name} is currently closed.`);
      return false;
    }

    // Open the shop UI
    store.openShop(shopId);
    useGameStore.getState().setGameMode('shop');

    // Dispatch event
    GameRuntime.getInstance().dispatchEvent({
      type: 'shop_entered' as GameEventType,
      timestamp: Date.now(),
      data: { shopId, shopName: shop.name },
    });

    return true;
  }

  /** Close the current shop UI */
  closeShop(): void {
    const store = useShopStore.getState();
    const gameStore = useGameStore.getState();

    if (store.openShopId) {
      store.closeShop();
      gameStore.setGameMode('playing');

      GameRuntime.getInstance().dispatchEvent({
        type: 'shop_exited' as GameEventType,
        timestamp: Date.now(),
        data: { shopId: store.openShopId },
      });
    }
  }

  /** Purchase an item from the currently open shop */
  purchaseItem(itemId: string): boolean {
    const shopStore = useShopStore.getState();
    const gameStore = useGameStore.getState();
    const openShop = shopStore.getOpenShop();

    if (!openShop) return false;

    const item = ITEM_CATALOG_MAP[itemId];
    if (!item) return false;

    // Check if player can afford the item
    if (gameStore.profile.coins < item.price) {
      gameStore.addNotification('Not enough coins!');
      return false;
    }

    // Check level requirement
    if (gameStore.profile.level < item.levelRequirement) {
      gameStore.addNotification(`Requires level ${item.levelRequirement}!`);
      return false;
    }

    // Spend coins
    const success = gameStore.spendCoins(item.price);
    if (!success) return false;

    // Add to inventory
    shopStore.addItemToInventory(itemId, 1);

    // Apply item effects
    this.applyItemEffects(item);

    // Dispatch coin collection event (for quest tracking)
    GameRuntime.getInstance().dispatchEvent({
      type: 'coin_collected' as GameEventType,
      timestamp: Date.now(),
      data: { amount: -item.price, description: `Purchased ${item.name}` },
    });

    // Update quest progress for visiting shops
    useQuestStore.getState().addStat({ totalCompleted: 1 });

    gameStore.addNotification(`Purchased ${item.name}!`);
    return true;
  }

  /** Apply the effects of a purchased item */
  private applyItemEffects(item: ShopItem): void {
    if (!item.effects || item.effects.length === 0) return;

    const gameStore = useGameStore.getState();

    for (const effect of item.effects) {
      switch (effect.type) {
        case 'heal':
          // Heal is applied through vehicle state update
          break;
        case 'fuel':
          // Fuel is applied through vehicle state update
          break;
        case 'speedBoost':
          // Speed boost is temporary — handled by a separate boost system
          break;
        case 'xpBoost':
          // XP boost is temporary — tracked separately
          break;
        case 'coinMultiplier':
          // Coin multiplier is temporary — tracked separately
          break;
        case 'repair':
          // Repair is applied through vehicle state update
          break;
      }
    }
  }

  /* ── Category Filtering ── */

  /** Get all shops of a specific category */
  getShopsByCategory(category: ShopCategory) {
    const store = useShopStore.getState();
    return Array.from(store.activeShops.values()).filter(
      (shop) => shop.category === category && shop.isOpen,
    );
  }

  /** Get the nearest shop of a specific category */
  getNearestShopOfCategory(category: ShopCategory): Shop | null {
    const store = useShopStore.getState();
    const playerPos = useWorldStore.getState().playerPosition;
    this._playerPos.set(playerPos.x, playerPos.y, playerPos.z);

    let nearest: Shop | null = null;
    let nearestDist = Infinity;

    for (const shop of store.activeShops.values()) {
      if (shop.category !== category || !shop.isOpen) continue;

      this._shopPos.set(shop.position.x, shop.position.y, shop.position.z);
      const dist = this._playerPos.distanceTo(this._shopPos);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = shop;
      }
    }

    return nearest;
  }

  /* ── Cleanup ── */

  dispose(): void {
    ShopSystem.instance = null;
  }
}
