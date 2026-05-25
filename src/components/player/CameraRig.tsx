// src/components/player/CameraRig.tsx

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';

export function CameraRig() {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, 4, -12));
  const currentLookAt = useRef(new THREE.Vector3(0, 1, 5));

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const pos = state.playerPosition;
    const rot = state.vehicle.rotation;
    const speed = state.vehicle.speed;

    if (!pos || rot.y === undefined) return;

    const heading = rot.y;
    const dist = 12;
    const height = 4;
    const idealX = pos.x - Math.sin(heading) * dist;
    const idealZ = pos.z - Math.cos(heading) * dist;
    const idealY = pos.y + height;

    const lerpFactor = 1 - Math.exp(-5 * delta);
    currentPos.current.lerp(new THREE.Vector3(idealX, idealY, idealZ), lerpFactor);

    const lookDist = 15;
    const lookX = pos.x + Math.sin(heading) * lookDist;
    const lookZ = pos.z + Math.cos(heading) * lookDist;
    const lookY = pos.y + 1.5;
    currentLookAt.current.lerp(new THREE.Vector3(lookX, lookY, lookZ), lerpFactor);

    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);

    const persp = camera as THREE.PerspectiveCamera;
    const targetFov = 60 + Math.min(speed / 200, 1) * 25;
    persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, lerpFactor);
    persp.updateProjectionMatrix();
  });

  return null;
}