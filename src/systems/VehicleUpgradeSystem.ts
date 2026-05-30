// src/systems/VehicleUpgradeSystem.ts
/**
 * VehicleUpgradeSystem
 * Applies purchased vehicle parts to modify physics constants in real-time.
 * Maintains a mapping of item IDs to physics modifiers.
 * All changes are applied via immutable updates to avoid side effects.
 */

import { VEHICLE, ENGINE, DRIVETRAIN, DRIFT } from '../constants/physics';

export type VehicleStats = {
  topSpeed: number;
  acceleration: number;
  handling: number;
  fuelCapacity: number;
  driftGrip: number;
};

export const DEFAULT_STATS: VehicleStats = {
  topSpeed: 200,
  acceleration: 1.0,
  handling: 1.0,
  fuelCapacity: 100,
  driftGrip: 1.0
};

export const UPGRADE_EFFECTS: Record<string, Partial<VehicleStats>> = {
  // Engine upgrades
  'part_engine_v1': { topSpeed: 15, acceleration: 0.15 },
  'part_engine_v2': { topSpeed: 30, acceleration: 0.25 },
  'part_turbo': { topSpeed: 45, acceleration: 0.35 },
  
  // Tire upgrades
  'part_tires_sport': { handling: 0.2, driftGrip: 0.15 },
  'part_tires_racing': { handling: 0.35, driftGrip: 0.25 },
  'part_tires_offroad': { handling: 0.1, driftGrip: -0.1 }, // Trade-off
  
  // Fuel system
  'item_fuel_tank': { fuelCapacity: 50 },
  'item_fuel_injector': { acceleration: 0.1, topSpeed: 10 },
  
  // Handling upgrades
  'part_suspension': { handling: 0.25, driftGrip: 0.1 },
  'part_brake_perf': { handling: 0.15 },
  
  // Cosmetic (no stats)
  'cosmetic_neon_under': {},
  'cosmetic_spoiler': { handling: 0.05 } // Minor aero benefit
};

/**
 * Calculate effective stats by combining base stats with owned upgrades
 */
export function calculateEffectiveStats(ownedItems: string[]): VehicleStats {
  const stats = { ...DEFAULT_STATS };
  
  for (const itemId of ownedItems) {
    const effect = UPGRADE_EFFECTS[itemId];
    if (effect) {
      Object.entries(effect).forEach(([key, value]) => {
        if (key in stats && typeof value === 'number') {
          stats[key as keyof VehicleStats] = (stats[key as keyof VehicleStats] as number) + value;
        }
      });
    }
  }
  
  // Clamp values to reasonable ranges
  stats.topSpeed = Math.max(100, Math.min(350, stats.topSpeed));
  stats.acceleration = Math.max(0.5, Math.min(2.0, stats.acceleration));
  stats.handling = Math.max(0.5, Math.min(2.0, stats.handling));
  stats.fuelCapacity = Math.max(50, Math.min(300, stats.fuelCapacity));
  stats.driftGrip = Math.max(0.5, Math.min(2.0, stats.driftGrip));
  
  return stats;
}

/**
 * Apply stats to physics constants (called when vehicle spawns/upgrades)
 * Returns modified constants object for use in physics engine
 */
export function applyStatsToPhysics(stats: VehicleStats) {
  return {
    // Modified VEHICLE constants
    VEHICLE: {
      ...VEHICLE,
      DRAG_COEFFICIENT: 0.35 - (stats.topSpeed - 200) * 0.001, // Faster = less drag
      DOWNFORCE_COEFFICIENT: 0.15 + (stats.handling - 1) * 0.1,
      MAX_STEERING_ANGLE: (35 + (stats.handling - 1) * 10) * (Math.PI / 180)
    },
    // Modified ENGINE constants
    ENGINE: {
      ...ENGINE,
      MAX_TORQUE: 450 * stats.acceleration
    },
    // Modified DRIFT constants
    DRIFT: {
      ...DRIFT,
      TRACTION_LOSS_FACTOR: 0.75 - (stats.driftGrip - 1) * 0.1,
      GRIP_RECOVERY_RATE: 2.0 + (stats.driftGrip - 1) * 1.5
    },
    // Fuel system
    MAX_FUEL: stats.fuelCapacity
  };
}