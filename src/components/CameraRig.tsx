/**
 * CameraRig — Third-person camera that follows the player vehicle.
 *
 * Implements a smooth follow camera with:
 * - Distance offset from player
 * - Height offset above player
 * - Smooth interpolation (lerp) for camera movement
 * - FOV changes based on speed (boost effect)
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';

/* ─────────────────────────────────────────────
 * CameraRig Component
 * ───────────────────────────────────────────── */

export function CameraRig() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const targetPos = useRef(new THREE.Vector3());
  const currentPos = useRef(new THREE.Vector3());

  // Camera settings
  const CAMERA_DISTANCE = 12;
  const CAMERA_HEIGHT = 6;
  const CAMERA_SMOOTH_SPEED = 0.08;
  const BOOST_FOV = 80;
  const NORMAL_FOV = 65;

  useFrame(() => {
    if (!cameraRef.current) return;

    const playerPos = useWorldStore.getState().playerPosition;
    const vehicle = useGameStore.getState().vehicle;

    // Calculate target camera position (behind and above player)
    const steerAngle = vehicle.steerAngle;
    const angleOffset = (steerAngle / 90) * 0.2;

    targetPos.current.set(
      playerPos.x - Math.sin(angleOffset) * CAMERA_DISTANCE,
      playerPos.y + CAMERA_HEIGHT,
      playerPos.z + CAMERA_DISTANCE,
    );

    // Smooth camera movement
    const lerpFactor = 1 - Math.pow(1 - CAMERA_SMOOTH_SPEED, 1 / 60);
    currentPos.current.lerp(targetPos.current, lerpFactor);

    // Apply position
    cameraRef.current.position.copy(currentPos.current);
    cameraRef.current.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);

    // FOV changes based on speed/boost
    const targetFov = vehicle.isBoosting ? BOOST_FOV : NORMAL_FOV + (vehicle.speed / vehicle.maxSpeed) * 15;
    cameraRef.current.fov += (targetFov - cameraRef.current.fov) * 0.1;
    cameraRef.current.updateProjectionMatrix();
  });

  return (
    <perspectiveCamera
      ref={cameraRef}
      fov={NORMAL_FOV}
      near={0.1}
      far={1000}
      position={[0, CAMERA_HEIGHT, CAMERA_DISTANCE]}
    />
  );
}
