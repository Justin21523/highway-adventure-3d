// src/hooks/useArcadePhysics.ts

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InputManager } from '../managers/InputManager';
import { useGameStore } from '../stores/gameStore';
import { VEHICLE, ENGINE, DRIVETRAIN, DRIFT, PHYSICS, BOOST } from '../constants/physics';

export function useArcadePhysics(vehicleRef: React.RefObject<THREE.Group>) {
  const speedRef = useRef(0);
  const rpmRef = useRef(ENGINE.IDLE_RPM);
  const gearRef = useRef(1);
  const steerRef = useRef(0);
  const isDriftingRef = useRef(false);
  const isBoostingRef = useRef(false);
  const fuelRef = useRef(100);
  const healthRef = useRef(100);

  const forwardVec = useRef(new THREE.Vector3());
  const moveVec = useRef(new THREE.Vector3());
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useFrame((_, delta) => {
    if (!vehicleRef.current) return;
    const mesh = vehicleRef.current;
    const dt = Math.min(delta, PHYSICS.MAX_SUBSTEPS * PHYSICS.TICK_RATE);
    const input = InputManager.getInstance().getState();
    const store = useGameStore.getState();

    if (store.vehicle.health <= 0) return; // Crash state halts physics

    // 1. Throttle & Gear Logic
    let throttle = 0;
    if (input.forward) throttle = 1;
    if (input.backward) throttle = -1;

    const speedKmh = speedRef.current * 3.6;
    if (speedKmh > 40 && gearRef.current === 1) gearRef.current = 2;
    else if (speedKmh > 90 && gearRef.current === 2) gearRef.current = 3;
    else if (speedKmh > 140 && gearRef.current === 3) gearRef.current = 4;
    else if (speedKmh > 190 && gearRef.current === 4) gearRef.current = 5;
    if (speedKmh < 30 && gearRef.current > 1) gearRef.current = 1;
    else if (speedKmh < 70 && gearRef.current > 2) gearRef.current = 2;
    else if (speedKmh < 120 && gearRef.current > 3) gearRef.current = 3;
    else if (speedKmh < 170 && gearRef.current > 4) gearRef.current = 4;

    const gearRatio = DRIVETRAIN.GEAR_RATIOS[gearRef.current + 1];
    const maxGearSpeed = (ENGINE.MAX_RPM / (gearRatio * DRIVETRAIN.FINAL_DRIVE)) * DRIVETRAIN.WHEEL_RADIUS * 3.6;
    rpmRef.current = ENGINE.IDLE_RPM + Math.abs(speedKmh / maxGearSpeed) * (ENGINE.MAX_RPM - ENGINE.IDLE_RPM);

    // 2. Force Calculation
    const rpmNorm = rpmRef.current / ENGINE.MAX_RPM;
    const torqueCurve = 0.4 + 0.6 * Math.sin(rpmNorm * Math.PI);
    const engineTorque = ENGINE.MAX_TORQUE * torqueCurve * gearRatio * DRIVETRAIN.FINAL_DRIVE;
    let engineForce = (engineTorque / DRIVETRAIN.WHEEL_RADIUS) * throttle;

    const drag = VEHICLE.DRAG_COEFFICIENT * speedRef.current * Math.abs(speedRef.current);
    const rolling = VEHICLE.ROLLING_RESISTANCE * speedRef.current;

    // Boost System
    isBoostingRef.current = input.boost && fuelRef.current > 5 && throttle > 0;
    if (isBoostingRef.current) {
      engineForce *= BOOST.FORCE_MULTIPLIER;
      fuelRef.current -= BOOST.DRAIN_RATE * dt * 60;
    } else {
      fuelRef.current = Math.min(100, fuelRef.current + BOOST.RECHARGE_RATE * dt * 10);
    }

    // Braking & Net Acceleration
    let netForce = engineForce - drag - rolling;
    if (input.backward && speedRef.current > 0.5) netForce -= DRIVETRAIN.MAX_BRAKING_TORQUE / DRIVETRAIN.WHEEL_RADIUS;
    
    const acceleration = netForce / VEHICLE.MASS;
    speedRef.current += acceleration * dt;
    if (Math.abs(speedRef.current) < 0.1 && throttle === 0) speedRef.current = 0;

    // 3. Steering & Drift Mechanics
    let targetSteer = 0;
    if (input.left) targetSteer = VEHICLE.MAX_STEERING_ANGLE;
    if (input.right) targetSteer = -VEHICLE.MAX_STEERING_ANGLE;
    
    const speedFactor = 1.0 - Math.min(Math.abs(speedRef.current) / 40, VEHICLE.SPEED_SENSITIVITY);
    targetSteer *= speedFactor;
    const steerSpeed = steerRef.current === targetSteer ? VEHICLE.STEERING_RETURN_SPEED : VEHICLE.STEERING_SPEED;
    steerRef.current = THREE.MathUtils.lerp(steerRef.current, targetSteer, dt * steerSpeed);

    isDriftingRef.current = input.handbrake && Math.abs(speedRef.current) > DRIFT.MIN_SPEED_TO_DRIFT / 3.6;
    const driftSlip = isDriftingRef.current ? steerRef.current * 0.35 : 0;
    if (isDriftingRef.current) speedRef.current *= (1 - 0.4 * dt); // Speed loss while drifting

    // 4. Transform Update
    const heading = eulerRef.current.y + (steerRef.current * speedRef.current * 0.015) + driftSlip * dt * 2.5;
    eulerRef.current.y = heading;

    forwardVec.current.set(Math.sin(heading), 0, Math.cos(heading));
    moveVec.current.copy(forwardVec.current).multiplyScalar(speedRef.current * dt);
    mesh.position.add(moveVec.current);
    mesh.rotation.set(0, heading, -steerRef.current * 0.12 * Math.min(Math.abs(speedRef.current) / 20, 1));

    // 5. Sync to Zustand Store
    useGameStore.setState({
      vehicle: {
        ...store.vehicle,
        speed: Math.abs(speedRef.current) * 3.6,
        rpm: rpmRef.current,
        gear: gearRef.current,
        isDrifting: isDriftingRef.current,
        isBoosting: isBoostingRef.current,
        fuel: fuelRef.current,
        health: healthRef.current
      },
      playerPosition: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }
    });
  });
}