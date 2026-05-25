/**
 * Shop and merchant types.
 */
import type { Vector3Data, EntityId, ChunkId } from './core';

/** Shop category determines what items are sold */
export type ShopCategory =
  | 'convenienceStore'
  | 'gasStation'
  | 'coffeeShop'
  | 'restaurant'
  | 'shoppingMall'
  | 'garage'
  | 'restStop';

/** Item rarity for visual styling */
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Item type determines what it does when purchased */
export type ItemType =
  | 'consumable'
  | 'vehiclePart'
  | 'cosmetic'
  | 'questItem'
  | 'fuel'
  | 'food'
  | 'drink'
  | 'tool';

/** Effect applied when a consumable item is used */
export interface ItemEffect {
  type: 'heal' | 'fuel' | 'speedBoost' | 'xpBoost' | 'coinMultiplier' | 'repair';
  value: number;
  duration: number;
}

/** A purchasable item in a shop */
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ShopCategory;
  itemType: ItemType;
  rarity: ItemRarity;
  icon: string;
  effects: ItemEffect[];
  stackable: boolean;
  maxStack: number;
  levelRequirement: number;
}

/** A shop/merchant in the game world */
export interface Shop {
  id: EntityId;
  name: string;
  category: ShopCategory;
  position: Vector3Data;
  rotation: number;
  chunkId: ChunkId;
  items: string[];
  interactionRadius: number;
  isOpen: boolean;
  openHour: number;
  closeHour: number;
  buildingWidth: number;
  buildingDepth: number;
  buildingHeight: number;
  signColor: string;
  signText: string;
  hasPromotion: boolean;
  promotionText: string;
  promotionDiscount: number;
}

/** An item in the player's inventory */
export interface InventoryItem {
  itemId: string;
  quantity: number;
}

/** Interaction zone around a shop that triggers the prompt */
export interface InteractionZone {
  shopId: EntityId;
  center: Vector3Data;
  radius: number;
  isPlayerInside: boolean;
}
