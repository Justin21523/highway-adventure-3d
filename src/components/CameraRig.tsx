// src/components/player/CameraRig.tsx
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';

const UP = new THREE.Vector3(0, 1, 0);

export function CameraRig({ vehicleRef }: { vehicleRef: React.RefObject<THREE.Group> }) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, 4, -12));
  const currentLookAt = useRef(new THREE.Vector3(0, 1, 8));
  const tempVec = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!vehicleRef.current) return;
    const mesh = vehicleRef.current;
    const speed = useGameStore.getState().vehicle.speed;
    if (
      !Number.isFinite(mesh.position.x) ||
      !Number.isFinite(mesh.position.y) ||
      !Number.isFinite(mesh.position.z) ||
      !Number.isFinite(mesh.rotation.y)
    ) {
      mesh.position.set(4.35, 1, 0);
      mesh.rotation.set(0, 0, 0);
      currentPos.current.set(0, 4, -12);
      currentLookAt.current.set(0, 1, 8);
      useGameStore.getState().resetVehicle();
      return;
    }

    // 1. Calculate ideal chase position & target
    const dist = 7 + Math.min(speed / 180, 1) * 6;
    const height = 2.5 + Math.min(speed / 150, 1) * 2;
    const lookDist = 10 + Math.min(speed / 200, 1) * 8;

    tempVec.current.set(0, height, -dist);
    tempVec.current.applyQuaternion(mesh.quaternion).add(mesh.position);
    const idealPos = tempVec.current.clone();

    tempVec.current.set(0, 1.2, lookDist);
    tempVec.current.applyQuaternion(mesh.quaternion).add(mesh.position);
    const idealLook = tempVec.current.clone();

    // 2. Frame-rate independent damping
    const lerpFactor = 1 - Math.exp(-4.5 * delta);
    currentPos.current.lerp(idealPos, lerpFactor);
    currentLookAt.current.lerp(idealLook, lerpFactor * 1.3);

    // 3. Lock the camera's up vector to world Y so lookAt produces zero roll.
    // (Previously the camera.rotation.z was lerped to 0 AFTER lookAt, which
    //  fought lookAt every frame and created a visible "X-axis tilt" wobble.)
    camera.up.copy(UP);
    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);

    // 4. Dynamic FOV
    const targetFov = 60 + Math.min(speed / 160, 1) * 25;
    const persp = camera as THREE.PerspectiveCamera;
    persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, lerpFactor);
    persp.updateProjectionMatrix();
  });

  return null;
}
