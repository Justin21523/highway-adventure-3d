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
