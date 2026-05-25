/**
 * Economy system constants.
 */

export const ECONOMY = {
  STARTING_COINS: 2000,
  COIN_PICKUP_VALUE: 50,
  COIN_PICKUP_RADIUS: 3.0,
  TREASURE_PICKUP_VALUE: 500,
  SPEED_BOOST_DURATION: 1.5,
  HEALTH_PACK_VALUE: 25,
  FUEL_CAN_VALUE: 20,
} as const;

export const QUEST_REWARDS = {
  BASE_COIN_REWARD: 500,
  BASE_XP_REWARD: 100,
  MAIN_QUEST_MULTIPLIER: 3.0,
  SIDE_QUEST_MULTIPLIER: 1.0,
  DAILY_QUEST_MULTIPLIER: 0.8,
  EXPLORATION_MULTIPLIER: 1.2,
  DELIVERY_MULTIPLIER: 1.5,
  CHALLENGE_MULTIPLIER: 2.0,
  TOUR_MULTIPLIER: 2.5,
  STREAK_BONUS_PERCENT: 0.1,
  MAX_STREAK: 5,
} as const;

export const XP_TABLE = {
  BASE_XP_FOR_LEVEL: 200,
  XP_GROWTH_FACTOR: 1.35,
  MAX_LEVEL: 50,
} as const;

export const TOLL_COSTS = {
  HIGHWAY_ENTRY: 100,
  BRIDGE_CROSSING: 50,
  TUNNEL_PASSAGE: 75,
} as const;

export const REPAIR_COSTS = {
  PER_HEALTH_POINT: 10,
  FULL_REPAIR_DISCOUNT: 0.85,
} as const;

export const FUEL_COSTS = {
  PER_UNIT: 8,
  FULL_TANK_DISCOUNT: 0.9,
} as const;

/** Calculate XP required for a given level */
export function xpForLevel(level: number): number {
  return Math.floor(XP_TABLE.BASE_XP_FOR_LEVEL * Math.pow(XP_TABLE.XP_GROWTH_FACTOR, level - 1));
}

/** Calculate total XP from level 1 to target level */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/** Determine level from total XP */
export function levelFromXp(totalXp: number): { level: number; currentLevelXp: number; xpToNext: number } {
  let level = 1;
  let accumulated = 0;
  while (level < XP_TABLE.MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (accumulated + needed > totalXp) {
      return {
        level,
        currentLevelXp: totalXp - accumulated,
        xpToNext: needed - (totalXp - accumulated),
      };
    }
    accumulated += needed;
    level++;
  }
  return { level: XP_TABLE.MAX_LEVEL, currentLevelXp: 0, xpToNext: 0 };
}
