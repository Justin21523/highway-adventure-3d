/**
 * Economy and transaction types.
 */

/** Transaction type for history tracking */
export type TransactionType = 'purchase' | 'sale' | 'reward' | 'repair' | 'fuel' | 'upgrade' | 'toll';

/** A single economic transaction */
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: number;
  relatedEntityId?: string;
}

/** Player economy summary */
export interface EconomyState {
  coins: number;
  totalEarned: number;
  totalSpent: number;
  transactionHistory: Transaction[];
  coinMultiplier: number;
  activeBoosts: EconomyBoost[];
}

/** Temporary economy boost (e.g., from items or events) */
export interface EconomyBoost {
  id: string;
  type: 'coinMultiplier' | 'discount' | 'xpMultiplier';
  value: number;
  remainingSeconds: number;
  source: string;
}

/** Price modifier from shop promotions or events */
export interface PriceModifier {
  shopId: string;
  itemId?: string;
  discountPercent: number;
  startTime: number;
  endTime: number;
  reason: string;
}

export interface ItemCatalogEntry {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  itemType?: string;
  rarity?: string;
  icon?: string;
}

export interface ItemEffect {
  type: 'heal' | 'fuel' | 'speedBoost' | 'xpBoost' | 'coinMultiplier' | 'repair' | string;
  value: number;
  duration?: number;
}

export interface EconomyConfig {
  startingCoins: number;
  coinPickupValue: number;
  repairCostPerPoint: number;
  fuelCostPerUnit: number;
}
