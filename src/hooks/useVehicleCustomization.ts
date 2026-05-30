// src/hooks/useVehicleCustomization.ts
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { calculateEffectiveStats, applyStatsToPhysics } from '../systems/VehicleUpgradeSystem';

/**
 * useVehicleCustomization
 * Hook that applies purchased vehicle parts to visual appearance and physics constants.
 * Handles real-time material swaps, geometry modifications, and physics parameter updates.
 * All changes are memoized and only applied when inventory actually changes.
 * 
 * @param vehicleMesh - Reference to the player vehicle THREE.Group
 * @param statsRef - Optional ref to receive calculated effective stats
 */
export function useVehicleCustomization(
  vehicleMesh: React.RefObject<THREE.Group>,
  statsRef?: React.MutableRefObject<any>
) {
  const appliedItemsRef = useRef<Set<string>>(new Set());
  const materialCacheRef = useRef<Map<string, THREE.Material>>(new Map());

  useEffect(() => {
    if (!vehicleMesh.current) return;
    
    const state = useGameStore.getState();
    const ownedItems = new Set(state.profile.inventory);
    
    // Check if inventory changed
    const hasChanges = 
      ownedItems.size !== appliedItemsRef.current.size ||
      Array.from(ownedItems).some(id => !appliedItemsRef.current.has(id));
    
    if (!hasChanges) return;
    
    // Calculate effective stats from owned items
    const effectiveStats = calculateEffectiveStats(Array.from(ownedItems));
    const physicsMods = applyStatsToPhysics(effectiveStats);
    
    // Apply visual customizations
    vehicleMesh.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Body color from cosmetic items
        if (mesh.name === 'body' || mesh.geometry.type === 'BoxGeometry') {
          const neonItem = Array.from(ownedItems).find(id => id.includes('neon'));
          if (neonItem && !materialCacheRef.current.has(neonItem)) {
            const neonMat = new THREE.MeshStandardMaterial({
              color: '#22c55e',
              emissive: '#22c55e',
              emissiveIntensity: 0.6,
              metalness: 0.8,
              roughness: 0.2
            });
            materialCacheRef.current.set(neonItem, neonMat);
          }
          if (neonItem) {
            mesh.material = materialCacheRef.current.get(neonItem)!;
          }
        }
        
        // Spoiler geometry from cosmetic items
        if (Array.from(ownedItems).some(id => id.includes('spoiler')) && mesh.name === 'spoiler-placeholder') {
          mesh.visible = true;
          // Could swap geometry here for different spoiler styles
        }
      }
    });
    
    // Update stats ref for physics engine consumption
    if (statsRef) {
      statsRef.current = { effectiveStats, physicsMods };
    }
    
    // Update applied items tracking
    appliedItemsRef.current = new Set(ownedItems);
    
  }, [vehicleMesh, statsRef, useGameStore.getState().profile.inventory]);

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      materialCacheRef.current.forEach(mat => mat.dispose());
      materialCacheRef.current.clear();
    };
  }, []);

  return {
    /**
     * Force re-apply customizations (e.g., after shop purchase)
     */
    refresh: () => {
      appliedItemsRef.current.clear();
      // Trigger re-effect by updating a dummy state
      useGameStore.setState({ profile: { ...useGameStore.getState().profile } });
    }
  };
}