/**
 * Point of Interest (POI) types for exploration and navigation.
 * These types define landmarks, scenic spots, and navigation aids.
 */

import type { Vector3Data, EntityId, ChunkId } from './core';

/** Type of point of interest */
export type POIType =
  | 'scenicSpot'
  | 'gasStation'
  | 'restArea'
  | 'checkpoint'
  | 'eventZone'
  | 'landmark'
  | 'photoSpot'
  | 'hiddenGem'
  | 'raceTrack'
  | 'parking'
  | 'serviceArea'
  | 'tollBooth'
  | 'tunnel'
  | 'bridge'
  | 'viewpoint'
  | 'fuelDepot'
  | 'repairShop'
  | 'raceStart'
  | 'raceFinish'
  | 'treasureLocation';

/** POI icon type for minimap display */
export type POIIcon =
  | 'star'
  | 'fuel'
  | 'bed'
  | 'flag'
  | 'alert'
  | 'landmark'
  | 'camera'
  | 'gem'
  | 'track'
  | 'parking'
  | 'wrench'
  | 'start'
  | 'finish'
  | 'chest'
  | 'eye'
  | 'mountain'
  | 'building'
  | 'bridge'
  | 'tunnel'
  | 'pump';

/** POI interaction type */
export type POIInteraction =
  | 'none'
  | 'photo'
  | 'rest'
  | 'refuel'
  | 'repair'
  | 'checkpoint'
  | 'event'
  | 'treasure'
  | 'race'
  | 'shop';

/** Point of Interest definition */
export interface POI {
  /** Unique identifier */
  id: EntityId;
  /** Type of POI */
  type: POIType;
  /** Display name */
  name: string;
  /** Description for tooltip */
  description: string;
  /** Position in world space */
  position: Vector3Data;
  /** Interaction radius in meters */
  radius: number;
  /** Icon to display on minimap */
  icon: POIIcon;
  /** Chunk this POI belongs to */
  chunkId: ChunkId;
  /** Whether player has discovered this POI */
  discovered: boolean;
  /** Discovery timestamp (milliseconds) */
  discoveredAt?: number;
  /** POI category for filtering */
  category: 'navigation' | 'service' | 'scenic' | 'event' | 'race' | 'treasure';
  /** Whether POI is currently active */
  isActive: boolean;
  /** Active until timestamp (for time-limited POIs) */
  expiresAt?: number;
  /** Associated quest ID (if any) */
  questId?: string;
  /** Associated shop ID (if any) */
  shopId?: string;
  /** Photo spot angle (for photo POIs) */
  photoAngle?: number;
  /** Photo spot description */
  photoDescription?: string;
  /** Treasure location coordinates (for treasure POIs) */
  treasureCoords?: Vector3Data;
  /** Race track waypoints (for race POIs) */
  raceWaypoints?: Vector3Data[];
  /** Service available at this POI */
  serviceType?: POIInteraction;
  /** Service cost */
  serviceCost?: number;
  /** POI level requirement */
  levelRequirement?: number;
}

/** POI discovery record */
export interface POIDiscovery {
  /** POI ID */
  poiId: EntityId;
  /** Discovery timestamp */
  discoveredAt: number;
  /** Player level at discovery */
  playerLevel: number;
  /** Coins earned from discovery */
  coinsEarned: number;
  /** XP earned from discovery */
  xpEarned: number;
}

/** POI batch instance for InstancedMesh rendering */
export interface POIBatchInstance {
  /** POI configuration */
  poi: POI;
  /** Instance matrix for rendering */
  matrix: number[];
  /** Icon color for this instance */
  color: string;
  /** Whether POI is discovered */
  discovered: boolean;
}

/** POI manager configuration */
export interface POIManagerConfig {
  /** Maximum POIs visible at once */
  maxVisiblePOIs: number;
  /** POI discovery radius in meters */
  discoveryRadius: number;
  /** Coins awarded for discovery */
  discoveryCoins: number;
  /** XP awarded for discovery */
  discoveryXP: number;
  /** POI spawn density per chunk */
  spawnDensity: number;
  /** Scenic POI probability */
  scenicProbability: number;
  /** Service POI probability */
  serviceProbability: number;
  /** Event POI probability */
  eventProbability: number;
}

/** POI manager metrics */
export interface POIMetrics {
  /** Total POIs in world */
  totalPOIs: number;
  /** Discovered POIs count */
  discoveredCount: number;
  /** Active POIs count */
  activeCount: number;
  /** POIs in render range */
  visibleCount: number;
  /** Discovery rate (discovered/total) */
  discoveryRate: number;
}
