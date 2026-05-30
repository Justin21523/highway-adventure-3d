/**
 * Quest, tour, and event system types.
 */
import type { Vector3Data, EntityId, ChunkId } from './core';

/** Quest status lifecycle */
export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';

/** Objective type determines how progress is tracked */
export type ObjectiveType =
  | 'reachLocation'
  | 'reach_location'
  | 'collectCoins'
  | 'collectItem'
  | 'deliverItem'
  | 'visitShop'
  | 'driftDistance'
  | 'drift_distance'
  | 'reachSpeed'
  | 'top_speed'
  | 'driveDistance'
  | 'distance_traveled'
  | 'destroyObstacle'
  | 'interactWithNpc'
  | 'timeTrial';

/** Quest category for filtering and display */
export type QuestCategory = 'main' | 'side' | 'daily' | 'exploration' | 'delivery' | 'challenge' | 'tour';

/** A single objective within a quest */
export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: number;
  current: number;
  isCompleted: boolean;
  location?: Vector3Data;
  radius?: number;
  itemId?: string;
  shopId?: string;
}

/** Rewards granted upon quest completion */
export interface QuestReward {
  coins: number;
  xp: number;
  items: string[];
  unlockVehicle?: string;
  unlockShop?: string;
  title?: string;
}

/** A complete quest definition */
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
  chunkId?: ChunkId;
}

/** Runtime state of an active quest instance */
export interface ActiveQuest {
  id?: string;
  questId: string;
  title?: string;
  description?: string;
  category?: QuestCategory;
  objectives: QuestObjective[];
  rewards?: QuestReward;
  timeLimitSeconds?: number;
  startTime: number;
  elapsedSeconds: number;
  status: QuestStatus;
}

/** A tour is a sequence of scenic points to visit */
export interface Tour {
  id: string;
  name: string;
  description: string;
  waypoints: TourWaypoint[];
  reward: QuestReward;
  totalDistance: number;
  estimatedDuration: number;
}

/** A single waypoint in a tour */
export interface TourWaypoint {
  id: string;
  name: string;
  description: string;
  position: Vector3Data;
  radius: number;
  visited: boolean;
  order: number;
}

/** A random game event */
export interface GameEvent {
  id: string;
  type: 'roadConstruction' | 'accident' | 'sale' | 'weather' | 'race' | 'treasureHunt';
  title: string;
  description: string;
  position?: Vector3Data;
  radius?: number;
  duration: number;
  startTime: number;
  isActive: boolean;
  rewards?: QuestReward;
}

/** Collectible pickup in the world */
export interface WorldPickup {
  id: EntityId;
  type: PickupType;
  position: Vector3Data;
  value: number;
  chunkId: ChunkId;
  collected: boolean;
  collectedAt?: number;
  respawnTime: number;
  itemId?: string;
}

export type PickupType = 'coin' | 'speedBoost' | 'healthPack' | 'fuelCan' | 'treasure' | 'fuel' | 'repair' | 'item';

export interface QuestStats {
  totalCompleted: number;
  totalFailed: number;
  totalDistanceDrifted: number;
  totalDriftDistance: number;
  totalTopSpeedReached: number;
  totalPickupsCollected: number;
  categoryCompleted: Record<QuestCategory, number>;
}
