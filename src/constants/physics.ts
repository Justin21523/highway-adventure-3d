/**
 * Physics constants for vehicle simulation.
 * All units are SI (meters, kilograms, seconds, Newtons) unless noted.
 */

export const PHYSICS = {
  GRAVITY: -9.81,
  TICK_RATE: 1 / 60,
  MAX_SUBSTEPS: 3,

  /* ── Vehicle Dynamics ── */
  ACCELERATION: 30, // m/s²
  BRAKING: 40, // m/s²
  FRICTION: 5, // m/s²
  DRIFT_SPEED_THRESHOLD: 20, // km/h
  DRIFT_DECEL: 10, // m/s²
  MAX_STEER_ANGLE: 22, // degrees — lowered for gentler turning
  STEER_SPEED: 22, // degrees/s — slower to reach full steer
  STEER_RETURN_MULTIPLIER: 1.2, // wheel returns to center moderately
  TURN_RATE: 0.5, // rad/s at 30 m/s
  TURN_AMOUNT_SCALE: 0.9, // overall rotation rate multiplier — lower = less sensitive

  /* ── Fuel ── */
  FUEL_CONSUMPTION: 2, // units/s when accelerating
  IDLE_FUEL_CONSUMPTION: 0.5, // units/s when idle
  NO_FUEL_DECEL: 10, // m/s² when out of fuel
} as const;

export const VEHICLE_DEFAULTS = {
  MASS: 1500,
  DRAG_COEFFICIENT: 0.35,
  DOWNFORCE_COEFFICIENT: 0.15,
  ROLLING_RESISTANCE: 0.015,
  MAX_STEERING_ANGLE: 35 * (Math.PI / 180),
  STEERING_SPEED: 4.0,
  STEERING_RETURN_SPEED: 5.0,
  SPEED_SENSITIVITY: 0.6,
  WHEEL_BASE: 2.7,
  TRACK_WIDTH: 1.6,
  CENTER_OF_MASS_HEIGHT: 0.55,
} as const;

export const ENGINE = {
  IDLE_RPM: 800,
  MAX_RPM: 8000,
  REDLINE_RPM: 7500,
  TORQUE_CURVE: [
    { rpm: 0.0, torque: 0.4 },
    { rpm: 0.15, torque: 0.6 },
    { rpm: 0.3, torque: 0.85 },
    { rpm: 0.5, torque: 1.0 },
    { rpm: 0.65, torque: 0.95 },
    { rpm: 0.8, torque: 0.85 },
    { rpm: 0.9, torque: 0.7 },
    { rpm: 1.0, torque: 0.5 },
  ],
  MAX_TORQUE: 450,
  INERTIA: 0.15,
} as const;

export const DRIVETRAIN = {
  GEAR_RATIOS: [-3.2, 0.0, 3.5, 2.1, 1.4, 1.1, 0.9],
  FINAL_DRIVE: 3.7,
  WHEEL_RADIUS: 0.35,
  MAX_BRAKING_TORQUE: 12000,
  BRAKE_BIAS: 0.65,
} as const;

export const DRIFT = {
  SLIP_ANGLE_THRESHOLD: 12 * (Math.PI / 180),
  MIN_SPEED_TO_DRIFT: 30,
  TRACTION_LOSS_FACTOR: 0.75,
  GRIP_RECOVERY_RATE: 2.0,
  HANDBRAKE_REAR_SLIP_MULTIPLIER: 0.2,
  DRIFT_SCORE_MULTIPLIER: 1.5,
  MIN_DRIFT_DURATION_FOR_SCORE: 0.5,
} as const;

export const SUSPENSION = {
  SPRING_RATE: 35000,
  DAMPING: 4500,
  REST_LENGTH: 0.4,
  MAX_COMPRESSION: 0.25,
  RAYCAST_LENGTH: 0.8,
  ROLL_STIFFNESS: 0.3,
  PITCH_STIFFNESS: 0.25,
} as const;

export const BOOST = {
  MAX_DURATION: 3.0,
  RECHARGE_RATE: 0.1,
  DRAIN_RATE: 0.33,
  FORCE_MULTIPLIER: 2.5,
  SPEED_ADDITION_KMH: 60,
} as const;

export const COLLISION = {
  DAMAGE_SPEED_THRESHOLD: 20,
  DAMAGE_PER_KMH_OVER_THRESHOLD: 0.5,
  SPEED_LOSS_ON_COLLISION: 0.4,
  BOUNCE_FACTOR: 0.3,
  MIN_COLLISION_SPEED: 5,
} as const;

export const FUEL = {
  CONSUMPTION_RATE_IDLE: 0.002,
  CONSUMPTION_RATE_PER_RPM: 0.000008,
  CONSUMPTION_RATE_BOOST_MULTIPLIER: 3.0,
  REFUEL_RATE_PER_SECOND: 5.0,
  LOW_FUEL_THRESHOLD: 15,
} as const;

// VEHICLE_DEFAULTS の別名 — 後方互換性のため
export const VEHICLE = VEHICLE_DEFAULTS;
