/**
 * World generation and road network types.
 */
import type { Vector3Data, ChunkId, NodeId, EdgeId, Direction, AABB, ZoneType } from './core';
export type { ChunkId, ZoneType } from './core';

/* ── Road Types ── */

/** All road surface types in the game */
export type RoadType =
  | 'highway'
  | 'cityRoad'
  | 'ramp'
  | 'interchange'
  | 'bridge'
  | 'tunnel'
  | 'serviceArea'
  | 'parking'
  | 'intersection';

/** Lane marking styles */
export type LaneMarking = 'solid' | 'dashed' | 'double-solid' | 'crosswalk' | 'arrow-left' | 'arrow-right' | 'arrow-straight';

/** Road elevation relative to ground */
export type ElevationLevel = 'underground' | 'ground' | 'elevated' | 'bridge';

/** A single lane definition within a road segment */
export interface LaneDefinition {
  index: number;
  width: number;
  direction: 'forward' | 'backward';
  speedLimit: number;
  markingLeft: LaneMarking;
  markingRight: LaneMarking;
}

/** A road segment connecting two nodes in the road network */
export interface RoadSegment {
  id: EdgeId;
  type: RoadType;
  startNode: NodeId;
  endNode: NodeId;
  lanes: LaneDefinition[];
  totalWidth: number;
  length: number;
  elevation: ElevationLevel;
  speedLimit: number;
  hasShoulder: boolean;
  hasMedian: boolean;
  hasBarrier: boolean;
  hasStreetLights: boolean;
}

/** A junction/intersection node in the road network */
export interface RoadNode {
  id: NodeId;
  position: Vector3Data;
  type: 'intersection' | 'interchange' | 'tollbooth' | 'serviceArea' | 'highwayEntry' | 'highwayExit' | 'fork' | 'merge';
  connectedEdges: EdgeId[];
  hasTrafficLight: boolean;
}

/* ── Chunk Types ── */

/** Lifecycle state of a world chunk */
export type ChunkState = 'planned' | 'generating' | 'active' | 'unloading' | 'disposed';

/** Complete data for a single world chunk */
export interface ChunkData {
  id: ChunkId;
  gridX: number;
  gridZ: number;
  state: ChunkState;
  zone: ZoneType;
  bounds: AABB;
  roads: RoadSegment[];
  nodes: RoadNode[];
  shopIds: string[];
  decorationSeed: number;
  elevation: number;
  hasTunnel: boolean;
  hasBridge: boolean;
  hasServiceArea: boolean;
  hasIntersection: boolean;
}

/* ── Decoration Types ── */

/** Types of decorative objects placed in the world */
export type DecorationType =
  | 'streetLight'
  | 'trafficSign'
  | 'billboard'
  | 'barrier'
  | 'tree'
  | 'building'
  | 'bench'
  | 'trashCan'
  | 'fireHydrant'
  | 'busStop'
  | 'phoneBooth'
  | 'mailbox';

/** A decoration instance placed in the world */
export interface DecorationInstance {
  type: DecorationType;
  position: Vector3Data;
  rotation: number;
  scale: number;
  variant: number;
}

/* ── Road Network Graph ── */

/** The complete road network graph for pathfinding and traffic */
export interface RoadNetwork {
  nodes: Map<NodeId, RoadNode>;
  edges: Map<EdgeId, RoadSegment>;
  adjacency: Map<NodeId, EdgeId[]>;
}

/** Result of a pathfinding query */
export interface PathResult {
  edges: EdgeId[];
  totalDistance: number;
  estimatedTime: number;
}

/* ── Point of Interest ── */

/** A point of interest in the world (for minimap, quests, exploration) */
export interface PointOfInterest {
  id: string;
  type: 'shop' | 'quest' | 'scenic' | 'gasStation' | 'parking' | 'serviceArea' | 'landmark';
  position: Vector3Data;
  name: string;
  icon: string;
  chunkId: ChunkId;
  discovered: boolean;
}

/* ── World Generation Config ── */

/** Configuration for the world generator */
export interface WorldGenConfig {
  chunkSize: number;
  renderDistance: number;
  unloadDistance: number;
  maxActiveChunks: number;
  seed: number;
  zoneDistribution: Record<ZoneType, number>;
  highwayFrequency: number;
  cityDensity: number;
  shopDensity: number;
  decorationDensity: number;
}
