// src/components/world/CheckpointSystem.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

/**
 * CheckpointSystem
 * Manages progressive save points, distance tracking, and crash respawn logic.
 * Spawns invisible triggers at regular intervals along the highway.
 * Updates Zustand store with last checkpoint position for crash recovery.
 */
export function CheckpointSystem() {
  const containerRef = useRef<THREE.Group>(null);
  const checkpoints = useRef<Array<{ mesh: THREE.Mesh; z: number; passed: boolean; flashTimer: number }>>([]);
  const checkpointInterval = 400; // Meters between checkpoints
  const triggerRadius = 18;
  const poolSize = 15;

  useMemo(() => {
    for (let i = 0; i < poolSize; i++) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 14, 0.2, 24),
        new THREE.MeshBasicMaterial({ color: '#22c55e', visible: false, transparent: true, opacity: 0.6 })
      );
      mesh.name = `cp_${i}`;
      containerRef.current?.add(mesh);
      checkpoints.current.push({ mesh, z: 0, passed: false, flashTimer: 0 });
    }
  }, []);

  useFrame((_, delta) => {
    const { playerPosition, vehicle } = useGameStore.getState();
    const playerZ = playerPosition.z;

    // Calculate active window
    const baseIdx = Math.floor(playerZ / checkpointInterval);
    
    for (let i = 0; i < poolSize; i++) {
      const cp = checkpoints.current[i];
      const targetZ = (baseIdx + i) * checkpointInterval;
      cp.z = targetZ;
      cp.mesh.position.set(0, 0.05, targetZ);
      
      // Check trigger
      if (!cp.passed && Math.abs(playerZ - targetZ) < triggerRadius) {
        cp.passed = true;
        cp.flashTimer = 1.0; // 1 second flash
        
        // Update store with checkpoint progress
        useGameStore.setState(s => ({
          lastCheckpoint: { x: 0, y: 0.5, z: targetZ },
          vehicle: { ...s.vehicle, fuel: Math.min(100, s.vehicle.fuel + 5) },
          profile: { ...s.profile, xp: s.profile.xp + 25 }
        }));
      }

      // Flash animation (frame-safe)
      if (cp.flashTimer > 0) {
        cp.flashTimer -= delta;
        cp.mesh.visible = true;
        const material = Array.isArray(cp.mesh.material) ? cp.mesh.material[0] : cp.mesh.material;
        if (material instanceof THREE.Material) material.opacity = Math.max(0, cp.flashTimer);
        const scaleMult = 1 + (1 - cp.flashTimer) * 0.5;
        cp.mesh.scale.set(scaleMult, 1, scaleMult);
      } else {
        cp.mesh.visible = false;
      }
    }
  });

  return <group ref={containerRef} />;
}
