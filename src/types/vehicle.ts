/**
 * Vehicle types for player and NPC vehicles.
 */
import type { Vector3Data, EntityId } from './core';

/** Vehicle category/archetype */
export type VehicleCategory = 'sedan' | 'sports' | 'truck' | 'suv' | 'motorcycle' | 'van';

/** Upgrade slot types */
export type UpgradeSlot = 'engine' | 'turbo' | 'tires' | 'brakes' | 'suspension' | 'body' | 'paint' | 'exhaust' | 'lights' | 'horn';

/** Current state of a single wheel */
export interface WheelState {
  rotation: number;
  steerAngle: number;
  suspensionCompression: number;
  isGrounded: boolean;
}

/** Complete vehicle physics state (updated every frame via refs, not React state) */
export interface VehicleState {
  position: Vector3Data;
  rotation: number;
  speed: number;
  speedKmh: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  steerInput: number;
  steerAngle: number;
  health: number;
  maxHealth: number;
  fuel: number;
  maxFuel: number;
  isDrifting: boolean;
  isBoosting: boolean;
  boostTimer: number;
  slipAngle: number;
  visualRoll: number;
  visualPitch: number;
  wheels: WheelState[];
  headlightsOn: boolean;
  hazardLightsOn: boolean;
  turnSignalLeft: boolean;
  turnSignalRight: boolean;
}

/** Static configuration for a vehicle model */
export interface VehicleConfig {
  id: string;
  name: string;
  category: VehicleCategory;
  price: number;
  color: string;
  secondaryColor: string;

  /* Physics */
  mass: number;
  dragCoefficient: number;
  rollingResistance: number;
  maxSteerAngle: number;
  wheelBase: number;
  trackWidth: number;
  centerOfMassHeight: number;

  /* Engine */
  maxTorque: number;
  maxRPM: number;
  idleRPM: number;
  redlineRPM: number;
  gearRatios: number[];
  finalDriveRatio: number;

  /* Dimensions (for procedural geometry) */
  bodyLength: number;
  bodyWidth: number;
  bodyHeight: number;
  cabinLength: number;
  cabinWidth: number;
  cabinHeight: number;
  cabinOffsetZ: number;
  wheelRadius: number;
  wheelWidth: number;

  /* Stats (for UI display) */
  topSpeed: number;
  acceleration: number;
  handling: number;
  braking: number;
  fuelCapacity: number;
}

/** An upgrade applied to a vehicle */
export interface VehicleUpgrade {
  id: string;
  slot: UpgradeSlot;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  pricePerLevel: number;
  statModifiers: Partial<Record<keyof VehicleConfig, number>>;
}

/** A vehicle owned by the player */
export interface OwnedVehicle {
  configId: string;
  upgrades: Record<UpgradeSlot, VehicleUpgrade | null>;
  paintColor: string;
  totalMileage: number;
}

/** Input state for vehicle control */
export interface VehicleInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  boost: boolean;
  shiftUp: boolean;
  shiftDown: boolean;
  headlights: boolean;
  horn: boolean;
}
