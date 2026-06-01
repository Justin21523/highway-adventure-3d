/**
 * Core primitive types used across all game systems.
 *
 * This file defines the foundational types that every other module depends on.
 * It also provides backward-compatible aliases (I* prefix) for types that
 * were historically referenced by the I* naming convention throughout the codebase.
 */

/* ── Vector & Quaternion ── */

/** Serializable 3D vector for store/state persistence */
export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

/** Serializable quaternion for rotation persistence */
export interface QuaternionData {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Alias for Vector3Data — used by gameStore, managers, and hooks. */
export type IVec3 = Vector3Data;

/* ── Identifiers ── */

/** Unique identifier for a world chunk (format: "cx_cz") */
export type ChunkId = string;

/** Unique identifier for any game entity */
export type EntityId = string;

/** Unique identifier for a road network node */
export type NodeId = string;

/** Unique identifier for a road network edge */
export type EdgeId = string;

/* ── Game Modes & Phases ── */

/** Game mode states */
export type GameMode =
  | 'loading'
  | 'mainMenu'
  | 'exploration'
  | 'playing'
  | 'paused'
  | 'shop'
  | 'garage'
  | 'questLog'
  | 'settings'
  | 'cutscene'
  | 'crashed';

/** Time of day phase for lighting/atmosphere */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** Cardinal direction for road orientation */
export type Direction = 'north' | 'south' | 'east' | 'west';

export type ZoneType = 'highway' | 'suburban' | 'cityCenter' | 'industrial' | 'countryside';

/* ── Collision ── */

/** Axis-aligned bounding box for collision detection */
export interface AABB {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/* ── Pooling ── */

/** Generic pool-able object interface */
export interface Poolable {
  active: boolean;
  reset(): void;
}

/* ── Events ── */

/** Event callback signature */
export type EventCallback<T = unknown> = (data: T) => void;

/** Seeded random number generator interface */
export interface SeededRandom {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(array: T[]): T;
  chance(probability: number): boolean;
}

/* ── Player Profile (backward-compatible alias) ── */

/**
 * Player profile data persisted across sessions.
 * Alias for the profile shape used in gameStore.
 */
export interface IPlayerProfile {
  id: string;
  name: string;
  level: number;
  xp: number;
  coins: number;
  inventory: string[];
  equippedVehicle: string;
  unlockedVehicles: string[];
  totalDistanceTraveled: number;
  totalCoinsCollected: number;
  totalQuestsCompleted: number;
  xpToNext: number;
  /** Driver rank (derived from reputation milestones). */
  rank: number;
  /** Reputation earned from quests & activities; drives rank. */
  reputation: number;
}

/* ── Vehicle State (backward-compatible alias) ── */

/**
 * Runtime vehicle state synced every frame.
 * Alias for the vehicle shape used in gameStore.
 */
export interface IVehicleState {
  id: string;
  position: Vector3Data;
  rotation: Vector3Data;
  velocity: Vector3Data;
  speed: number;
  /** Top speed cap in km/h (used by physics clamp, HUD speedometer, garage). */
  maxSpeed: number;
  rpm: number;
  gear: number;
  health: number;
  maxHealth: number;
  fuel: number;
  isDrifting: boolean;
  isBoosting: boolean;
  /** Remaining boost time in seconds. */
  boostTimer: number;
  /** Current front-wheel steer angle in degrees (drives turning). */
  steerAngle: number;
  slipAngle: number;
  headingAngle?: number;
  /** Body paint color (hex), set in the garage. */
  paintColor: string;
  /** Acceleration multiplier from the equipped vehicle + upgrades (≈1.0). */
  accelMult: number;
  /** Handling/steer multiplier from the equipped vehicle + upgrades (≈1.0). */
  handlingMult: number;
}

export type VehicleState = IVehicleState;
export type PlayerProfile = IPlayerProfile;
export type Controls = {
  throttle: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  boost: boolean;
};
export type Notification = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
};

/* ── Performance Metrics (backward-compatible alias) ── */

/**
 * Real-time performance metrics.
 * Alias for the metrics shape used in gameStore and PerformanceScaler.
 */
export interface IPerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  drawCalls: number;
  triangles: number;
  qualityTier: 'low' | 'medium' | 'high' | 'ultra';
}

export type IQuestStatus = 'completed' | 'progressed' | 'idled' | 'active' 
/* ── Quest (backward-compatible alias) ── */

/**
 * Quest definition used by gameStore.
 * Alias for the quest shape referenced by SaveManager and hooks.
 */
// IQuest interface - ensure field names match implementation
export interface IQuest {
  id: string;                    // ✅ Use 'id' not 'questId'
  title: string;
  description: string;
  category: QuestCategory;
  objectives: QuestObjective[];
  rewards: QuestReward;          // ✅ Use 'rewards' (plural) not 'reward'
  prerequisites: string[];
  levelRequirement: number;
  startTime?: number;
  timeLimitSeconds: number;
  elapsedSeconds?: number;
  isRepeatable: boolean;
  giverName: string;
  giverShopId?: string;
  chunkId?: string;
  status?: IQuestStatus;
}


/**
 * Quest objective used by gameStore.
 * Alias for the objective shape referenced by useQuestManager.
 */
// QuestObjective - ensure all optional fields are properly typed
export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: number;
  current: number;
  isCompleted: boolean;
  location?: IVec3;              // ✅ Use IVec3 not Vector3Data
  radius?: number;
  itemId?: string;
  shopId?: string;
}

/* ── Economy Item (backward-compatible alias) ── */

/**
 * Shop item used by ShopModal.
 * Alias for the economy item shape referenced by ShopModal.tsx.
 */
export interface IEconomyItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  iconUrl: string;
  stats?: Record<string, number>;
}


// ============================================================================
// QUEST SYSTEM TYPES
// ============================================================================

export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';

export type ObjectiveType =
  | 'reachLocation'
  | 'collectCoins'
  | 'collectItem'
  | 'deliverItem'
  | 'visitShop'
  | 'driftDistance'
  | 'reachSpeed'
  | 'driveDistance'
  | 'destroyObstacle'
  | 'interactWithNpc'
  | 'timeTrial'
  | 'distance_traveled'
  | 'top_speed'

export type QuestCategory = 
  | 'main' 
  | 'side' 
  | 'daily' 
  | 'exploration' 
  | 'delivery' 
  | 'challenge' 
  | 'tour';
  
export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: number;
  current: number;
  isCompleted: boolean;
  location?: IVec3;
  radius?: number;
  itemId?: string;
  shopId?: string;
}

export interface QuestReward {
  coins: number;
  xp: number;
  items: string[];
  unlockVehicle?: string;
  unlockShop?: string;
  title?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  objectives: QuestObjective[];
  rewards: QuestReward;
  prerequisites: string[];
  levelRequirement: number;
  timeLimitSeconds: number;
  isRepeatable: boolean;
  giverName: string;
  giverShopId?: string;
  chunkId?: string;
}

// ActiveQuest - also use 'id' for consistency
export interface ActiveQuest {
  id: string;                    // ✅ Same as IQuest.id
  title: string;
  description: string;
  category: QuestCategory;
  objectives: QuestObjective[];
  rewards: QuestReward;
  timeLimitSeconds: number;
  startTime: number;
  elapsedSeconds: number;
  status: QuestStatus;
}


export interface QuestStats {
  totalCompleted: number;
  totalFailed: number;
  totalDriftDistance: number;
  totalTopSpeedReached: number;
  totalPickupsCollected: number;
  categoryCompleted: Record<QuestCategory, number>;
}

export type InteractionTargetType = 'npc' | 'shop' | 'garage' | 'pickup' | 'obstacle';

export interface InteractionTarget {
  type: InteractionTargetType;
  id: string;
  name: string;
  position?: IVec3;
  radius?: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  boost: boolean;
  interact: boolean;
  quest: boolean;
  pause: boolean;
}