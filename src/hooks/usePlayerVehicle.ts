/**
 * usePlayerVehicle — Hook for player vehicle state.
 *
 * Provides reactive access to vehicle data from the gameStore.
 * Used by vehicle-related components and UI.
 */

import { useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';

/* ─────────────────────────────────────────────
 * usePlayerVehicle Hook
 * ───────────────────────────────────────────── */

export function usePlayerVehicle() {
  const vehicle = useGameStore((state) => state.vehicle);
  const updateVehicleState = useGameStore((state) => state.updateVehicleState);
  const resetVehicle = useGameStore((state) => state.resetVehicle);

  const accelerate = useCallback(() => {
    useGameStore.getState().setControls({ throttle: true });
  }, []);

  const brake = useCallback(() => {
    useGameStore.getState().setControls({ brake: true });
  }, []);

  const steerLeft = useCallback(() => {
    useGameStore.getState().setControls({ steerLeft: true });
  }, []);

  const steerRight = useCallback(() => {
    useGameStore.getState().setControls({ steerRight: true });
  }, []);

  const releaseThrottle = useCallback(() => {
    useGameStore.getState().setControls({ throttle: false });
  }, []);

  const releaseBrake = useCallback(() => {
    useGameStore.getState().setControls({ brake: false });
  }, []);

  const releaseSteering = useCallback(() => {
    useGameStore.getState().setControls({ steerLeft: false, steerRight: false });
  }, []);

  const activateBoost = useCallback(() => {
    updateVehicleState({ isBoosting: true, boostTimer: 3 });
  }, [updateVehicleState]);

  const repairVehicle = useCallback(() => {
    updateVehicleState({ health: Math.min(100, vehicle.health + 25) });
  }, [updateVehicleState, vehicle.health]);

  const refuel = useCallback(() => {
    updateVehicleState({ fuel: Math.min(100, vehicle.fuel + 25) });
  }, [updateVehicleState, vehicle.fuel]);

  return {
    vehicle,
    accelerate,
    brake,
    steerLeft,
    steerRight,
    releaseThrottle,
    releaseBrake,
    releaseSteering,
    activateBoost,
    repairVehicle,
    refuel,
    resetVehicle,
  };
}

/* ─────────────────────────────────────────────
 * useVehicleStats Hook
 * ───────────────────────────────────────────── */

export function useVehicleStats() {
  const vehicle = useGameStore((state) => state.vehicle);
  const profile = useGameStore((state) => state.profile);

  const speedPercent = (vehicle.speed / vehicle.maxSpeed) * 100;
  const fuelPercent = vehicle.fuel;
  const healthPercent = vehicle.health;

  return {
    speed: vehicle.speed,
    maxSpeed: vehicle.maxSpeed,
    speedPercent,
    fuel: vehicle.fuel,
    fuelPercent,
    health: vehicle.health,
    healthPercent,
    level: profile.level,
    xp: profile.xp,
    xpToNext: profile.xpToNext,
  };
}
