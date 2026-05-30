// src/hooks/useFloatingOrigin.ts
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * useFloatingOrigin
 * Prevents WebGL 32-bit float precision jitter at large coordinates.
 * When player exceeds OFFSET_THRESHOLD, shifts the entire world group
 * back toward origin while keeping player/camera coordinates intact.
 */
export function useFloatingOrigin(worldRef: React.RefObject<THREE.Group>) {
  const offsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const OFFSET_THRESHOLD = 2000; // Meters before recentering

  useEffect(() => {
    // Cleanup not needed as offset is persistent across frames
    return () => {};
  }, []);

  // Called every frame from a dedicated component or manager
  return {
    update: (playerWorldPos: THREE.Vector3) => {
      if (!worldRef.current) return;
      
      // Check if player moved beyond threshold
      if (playerWorldPos.z > OFFSET_THRESHOLD || playerWorldPos.z < -OFFSET_THRESHOLD) {
        const resetZ = -playerWorldPos.z;
        offsetRef.current.z += resetZ;
        
        // Shift entire world group to maintain relative precision
        worldRef.current.position.z += resetZ;
        
        // Keep player visually stationary by adjusting local transform
        // (Handled by parent sync logic)
      }
    },
    getOffset: () => offsetRef.current.clone()
  };
}