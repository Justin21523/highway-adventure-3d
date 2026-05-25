/**
 * Traffic AI constants and NPC vehicle definitions.
 */
import type { TrafficConfig } from '@/types/traffic';

export const TRAFFIC_CONFIG: TrafficConfig = {
  maxCars: 40,
  spawnDistance: 150,
  despawnDistance: 200,
  minSpawnInterval: 0.8,
  maxSpawnInterval: 2.5,
  baseDensity: 0.6,
  highwayDensityMultiplier: 1.4,
  cityDensityMultiplier: 1.0,
  nightDensityMultiplier: 0.4,
  minSpeedKmh: 40,
  maxSpeedKmh: 110,
  laneChangeProbability: 0.008,
  laneChangeDuration: 2.0,
  followingDistance: 12,
  brakingDeceleration: 8,
  accelerationRate: 3,
};

export const TRAFFIC_VEHICLE_TEMPLATES = [
  {
    category: 'sedan' as const,
    weight: 0.4,
    colors: ['#3366cc', '#cc3333', '#33cc33', '#cccc33', '#ffffff', '#333333', '#666699', '#996633'],
    speedRange: [60, 100] as [number, number],
    bodyLength: 4.4,
    bodyWidth: 1.75,
    bodyHeight: 0.55,
    cabinHeight: 0.48,
  },
  {
    category: 'suv' as const,
    weight: 0.2,
    colors: ['#224488', '#448844', '#884422', '#222222', '#cccccc', '#556677'],
    speedRange: [55, 90] as [number, number],
    bodyLength: 4.7,
    bodyWidth: 1.85,
    bodyHeight: 0.7,
    cabinHeight: 0.58,
  },
  {
    category: 'truck' as const,
    weight: 0.15,
    colors: ['#ffffff', '#2255aa', '#cc4444', '#888888', '#446622'],
    speedRange: [50, 80] as [number, number],
    bodyLength: 5.8,
    bodyWidth: 2.1,
    bodyHeight: 0.9,
    cabinHeight: 0.7,
  },
  {
    category: 'van' as const,
    weight: 0.15,
    colors: ['#eeeeee', '#cccccc', '#336699', '#996633', '#444444'],
    speedRange: [50, 85] as [number, number],
    bodyLength: 5.0,
    bodyWidth: 1.9,
    bodyHeight: 1.1,
    cabinHeight: 0.55,
  },
  {
    category: 'sports' as const,
    weight: 0.1,
    colors: ['#ff1a1a', '#ffcc00', '#00ccff', '#ff6600', '#cc00cc', '#1a1a1a'],
    speedRange: [80, 130] as [number, number],
    bodyLength: 4.2,
    bodyWidth: 1.85,
    bodyHeight: 0.42,
    cabinHeight: 0.38,
  },
];

export const TRAFFIC_TOTAL_WEIGHT = TRAFFIC_VEHICLE_TEMPLATES.reduce((sum, t) => sum + t.weight, 0);
