// src/constants/road.ts

/**
 * Road Network Configuration
 * Defines dimensions, lane layouts, material properties, and prop distribution rules.
 * Used by RoadNetworkGenerator to deterministically build infinite highway/city segments.
 */
export const ROAD_CONFIG = {
  GRID_SIZE: 60, // Length/Width of each road segment in meters
  HIGHWAY_LANES: 4,
  CITY_LANES: 2,
  LANE_WIDTH: 3.5,
  SHOULDER_WIDTH: 2.5,
  CURB_HEIGHT: 0.15,
  CURB_WIDTH: 0.3,
  
  // Visual Materials
  MATERIALS: {
    asphalt: { color: '#1e1e24', roughness: 0.95, metalness: 0.0 },
    highwayLine: { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.15 },
    cityLine: { color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 0.2 },
    curb: { color: '#78716c', roughness: 0.7, metalness: 0.1 },
    barrier: { color: '#3f3f46', roughness: 0.5, metalness: 0.4 }
  },

  // Procedural Prop Rules per Chunk Type
  PROPS: {
    highway: {
      streetLightSpacing: 15,
      treeChance: 0.0,
      buildingChance: 0.0,
      barrierType: 'guardrail'
    },
    city: {
      streetLightSpacing: 8,
      treeChance: 0.35,
      buildingChance: 0.5,
      barrierType: 'curb'
    }
  },

  // Streaming Tuning
  LOAD_RADIUS_CHUNKS: 3,
  UNLOAD_RADIUS_CHUNKS: 5
} as const;