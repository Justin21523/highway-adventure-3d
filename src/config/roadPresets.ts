/**
 * Road geometry presets for each road type.
 * Used by world generators to create consistent road structures.
 */
import { ROAD, HIGHWAY, CITY_ROAD } from '@/constants/world';
import type { RoadType } from '@/types/world';

export interface RoadPreset {
  type: RoadType;
  lanesPerDirection: number;
  laneWidth: number;
  shoulderWidth: number;
  medianWidth: number;
  speedLimit: number;
  hasBarrier: boolean;
  hasStreetLights: boolean;
  hasSidewalk: boolean;
  hasMarkings: boolean;
  surfaceColor: string;
  markingColor: string;
  barrierColor: string;
  totalWidth: number;
}

function calculateTotalWidth(
  lanesPerDirection: number,
  laneWidth: number,
  shoulderWidth: number,
  medianWidth: number,
  hasSidewalk: boolean,
): number {
  const roadWidth = lanesPerDirection * 2 * laneWidth + medianWidth + shoulderWidth * 2;
  const sidewalkWidth = hasSidewalk ? ROAD.SIDEWALK_WIDTH * 2 : 0;
  return roadWidth + sidewalkWidth;
}

export const HIGHWAY_PRESET: RoadPreset = {
  type: 'highway',
  lanesPerDirection: HIGHWAY.LANES_PER_DIRECTION,
  laneWidth: ROAD.LANE_WIDTH,
  shoulderWidth: ROAD.SHOULDER_WIDTH,
  medianWidth: ROAD.MEDIAN_WIDTH,
  speedLimit: HIGHWAY.SPEED_LIMIT,
  hasBarrier: true,
  hasStreetLights: true,
  hasSidewalk: false,
  hasMarkings: true,
  surfaceColor: '#2a2a2a',
  markingColor: '#ffffff',
  barrierColor: '#888888',
  totalWidth: calculateTotalWidth(
    HIGHWAY.LANES_PER_DIRECTION,
    ROAD.LANE_WIDTH,
    ROAD.SHOULDER_WIDTH,
    ROAD.MEDIAN_WIDTH,
    false,
  ),
};

export const CITY_ROAD_PRESET: RoadPreset = {
  type: 'cityRoad',
  lanesPerDirection: CITY_ROAD.LANES_PER_DIRECTION,
  laneWidth: ROAD.LANE_WIDTH,
  shoulderWidth: 1.0,
  medianWidth: 0,
  speedLimit: CITY_ROAD.SPEED_LIMIT,
  hasBarrier: false,
  hasStreetLights: true,
  hasSidewalk: true,
  hasMarkings: true,
  surfaceColor: '#333333',
  markingColor: '#ffffff',
  barrierColor: '#666666',
  totalWidth: calculateTotalWidth(
    CITY_ROAD.LANES_PER_DIRECTION,
    ROAD.LANE_WIDTH,
    1.0,
    0,
    true,
  ),
};

export const RAMP_PRESET: RoadPreset = {
  type: 'ramp',
  lanesPerDirection: 1,
  laneWidth: ROAD.LANE_WIDTH,
  shoulderWidth: 1.5,
  medianWidth: 0,
  speedLimit: 60,
  hasBarrier: true,
  hasStreetLights: false,
  hasSidewalk: false,
  hasMarkings: true,
  surfaceColor: '#2e2e2e',
  markingColor: '#ffcc00',
  barrierColor: '#888888',
  totalWidth: ROAD.LANE_WIDTH + 3.0,
};

export const BRIDGE_PRESET: RoadPreset = {
  type: 'bridge',
  lanesPerDirection: HIGHWAY.LANES_PER_DIRECTION,
  laneWidth: ROAD.LANE_WIDTH,
  shoulderWidth: ROAD.SHOULDER_WIDTH,
  medianWidth: ROAD.MEDIAN_WIDTH,
  speedLimit: HIGHWAY.SPEED_LIMIT,
  hasBarrier: true,
  hasStreetLights: true,
  hasSidewalk: false,
  hasMarkings: true,
  surfaceColor: '#2a2a2a',
  markingColor: '#ffffff',
  barrierColor: '#aaaaaa',
  totalWidth: calculateTotalWidth(
    HIGHWAY.LANES_PER_DIRECTION,
    ROAD.LANE_WIDTH,
    ROAD.SHOULDER_WIDTH,
    ROAD.MEDIAN_WIDTH,
    false,
  ),
};

export const TUNNEL_PRESET: RoadPreset = {
  type: 'tunnel',
  lanesPerDirection: 2,
  laneWidth: ROAD.LANE_WIDTH,
  shoulderWidth: 1.5,
  medianWidth: 0.5,
  speedLimit: 80,
  hasBarrier: true,
  hasStreetLights: true,
  hasSidewalk: false,
  hasMarkings: true,
  surfaceColor: '#252525',
  markingColor: '#ffffff',
  barrierColor: '#777777',
  totalWidth: calculateTotalWidth(2, ROAD.LANE_WIDTH, 1.5, 0.5, false),
};

export const SERVICE_AREA_PRESET: RoadPreset = {
  type: 'serviceArea',
  lanesPerDirection: 1,
  laneWidth: ROAD.LANE_WIDTH + 0.5,
  shoulderWidth: 3.0,
  medianWidth: 0,
  speedLimit: 30,
  hasBarrier: false,
  hasStreetLights: true,
  hasSidewalk: true,
  hasMarkings: true,
  surfaceColor: '#383838',
  markingColor: '#ffffff',
  barrierColor: '#666666',
  totalWidth: (ROAD.LANE_WIDTH + 0.5) * 2 + 6.0 + ROAD.SIDEWALK_WIDTH * 2,
};

export const INTERSECTION_PRESET: RoadPreset = {
  type: 'intersection',
  lanesPerDirection: CITY_ROAD.LANES_PER_DIRECTION,
  laneWidth: ROAD.LANE_WIDTH,
  shoulderWidth: 1.0,
  medianWidth: 0,
  speedLimit: 40,
  hasBarrier: false,
  hasStreetLights: true,
  hasSidewalk: true,
  hasMarkings: true,
  surfaceColor: '#333333',
  markingColor: '#ffffff',
  barrierColor: '#666666',
  totalWidth: calculateTotalWidth(
    CITY_ROAD.LANES_PER_DIRECTION,
    ROAD.LANE_WIDTH,
    1.0,
    0,
    true,
  ),
};

export const PARKING_PRESET: RoadPreset = {
  type: 'parking',
  lanesPerDirection: 1,
  laneWidth: 3.0,
  shoulderWidth: 0,
  medianWidth: 0,
  speedLimit: 15,
  hasBarrier: false,
  hasStreetLights: true,
  hasSidewalk: false,
  hasMarkings: true,
  surfaceColor: '#3a3a3a',
  markingColor: '#ffcc00',
  barrierColor: '#666666',
  totalWidth: 3.0,
};

export const ROAD_PRESETS: Record<RoadType, RoadPreset> = {
  highway: HIGHWAY_PRESET,
  cityRoad: CITY_ROAD_PRESET,
  ramp: RAMP_PRESET,
  interchange: RAMP_PRESET,
  bridge: BRIDGE_PRESET,
  tunnel: TUNNEL_PRESET,
  serviceArea: SERVICE_AREA_PRESET,
  intersection: INTERSECTION_PRESET,
  parking: PARKING_PRESET,
};
