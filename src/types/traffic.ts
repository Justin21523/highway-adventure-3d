/**
 * Traffic AI and NPC vehicle types.
 */
import type { Vector3Data, EntityId, EdgeId, NodeId } from './core';
import type { VehicleCategory } from './vehicle';

/** Behavioral state of a traffic car */
export type TrafficState =
  | 'cruising'
  | 'laneChanging'
  | 'braking'
  | 'accelerating'
  | 'stopped'
  | 'enteringRamp'
  | 'exitingRamp'
  | 'waitingAtLight';

/** A single NPC traffic vehicle */
export interface TrafficCar {
  id: EntityId;
  category: VehicleCategory;
  color: string;
  position: Vector3Data;
  rotation: number;
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  laneIndex: number;
  targetLaneIndex: number;
  laneChangeProgress: number;
  state: TrafficState;
  currentEdgeId: EdgeId | null;
  distanceAlongEdge: number;
  direction: 'forward' | 'backward';
  turnSignalLeft: boolean;
  turnSignalRight: boolean;
  brakeLightsOn: boolean;
  headlightsOn: boolean;
  bodyLength: number;
  bodyWidth: number;
  bodyHeight: number;
  cabinHeight: number;
}

/** Configuration for traffic density and behavior */
export interface TrafficConfig {
  maxCars: number;
  spawnDistance: number;
  despawnDistance: number;
  minSpawnInterval: number;
  maxSpawnInterval: number;
  baseDensity: number;
  highwayDensityMultiplier: number;
  cityDensityMultiplier: number;
  nightDensityMultiplier: number;
  minSpeedKmh: number;
  maxSpeedKmh: number;
  laneChangeProbability: number;
  laneChangeDuration: number;
  followingDistance: number;
  brakingDeceleration: number;
  accelerationRate: number;
}

/** Traffic lane occupancy tracking for AI decisions */
export interface LaneOccupancy {
  edgeId: EdgeId;
  laneIndex: number;
  carIds: EntityId[];
  averageSpeed: number;
  isBlocked: boolean;
}

/** Spawn descriptor for a traffic car */
export interface TrafficSpawnDescriptor {
  category: VehicleCategory;
  color: string;
  edgeId: EdgeId;
  laneIndex: number;
  distanceAlongEdge: number;
  direction: 'forward' | 'backward';
  speed: number;
  bodyLength: number;
  bodyWidth: number;
  bodyHeight: number;
  cabinHeight: number;
}
