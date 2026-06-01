// src/hooks/useQuestProgressSync.ts
import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../stores/gameStore';
import { ObjectiveType } from '../types/core';

/**
 * useQuestProgressSync
 * Bridges real-time gameplay events to quest objective tracking.
 * Polls vehicle/player state every frame and updates quest progress
 * for matching objective types. Throttled to prevent excessive store updates.
 * 
 * @param vehicleRef - Reference to player vehicle for position/speed access
 */
export function useQuestProgressSync(vehicleRef: React.RefObject<THREE.Group>) {
  const lastUpdateRef = useRef(0);
  const driftAccumRef = useRef(0);
  const lastDriftStateRef = useRef(false);
  const distanceAccumRef = useRef(0);
  const lastPosRef = useRef({ x: 0, z: 0 });

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    
    // Throttle updates to ~10Hz to reduce store churn
    const now = performance.now();
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;
    
    if (!state.activeQuest || state.activeQuest.status !== 'active' || !vehicleRef.current) {
      return;
    }
    
    const vehicle = state.vehicle;
    const playerPos = state.playerPosition;
    
    // Track drift distance
    if (vehicle.isDrifting && vehicle.speed > 30) {
      if (!lastDriftStateRef.current) {
        // Just started drifting
        driftAccumRef.current = 0;
      }
      driftAccumRef.current += (vehicle.speed / 3.6) * delta; // m/s * s = meters
    }
    lastDriftStateRef.current = vehicle.isDrifting;
    
    // Track total distance traveled
    const dx = playerPos.x - lastPosRef.current.x;
    const dz = playerPos.z - lastPosRef.current.z;
    distanceAccumRef.current += Math.sqrt(dx * dx + dz * dz);
    lastPosRef.current = { x: playerPos.x, z: playerPos.z };
    
    // Update each objective based on type
    state.activeQuest.objectives.forEach(obj => {
      if (obj.isCompleted) return;
      
      let shouldUpdate = false;
      let newValue = obj.current;
      
      switch (obj.type as ObjectiveType) {
        case 'driftDistance':
          if (driftAccumRef.current > 0) {
            newValue = driftAccumRef.current;
            shouldUpdate = true;
          }
          break;
          
        case 'driveDistance':
        case 'distance_traveled':
          newValue = distanceAccumRef.current;
          shouldUpdate = true;
          break;
          
        case 'reachSpeed':
        case 'top_speed':
          if (vehicle.speed > obj.current) {
            newValue = vehicle.speed;
            shouldUpdate = true;
          }
          break;
          
        case 'collectCoins':
          // Handled by PickupSystem via store actions
          break;
          
        case 'reachLocation':
          if (obj.location) {
            const dist = Math.sqrt(
              Math.pow(playerPos.x - obj.location.x, 2) +
              Math.pow(playerPos.z - obj.location.z, 2)
            );
            if (dist <= (obj.radius || 15)) {
              newValue = obj.target; // Mark as complete
              shouldUpdate = true;
            }
          }
          break;
      }
      
      if (shouldUpdate && newValue >= obj.target) {
        // Objective completed
        useGameStore.getState().updateQuestObjectiveProgress(obj.id, obj.target);
      } else if (shouldUpdate) {
        // Progress update
        useGameStore.getState().updateQuestObjectiveProgress(obj.id, newValue - obj.current);
      }
    });
    
    // Check if all objectives completed
    // status is guaranteed 'active' by the guard at the top of this callback.
    const allDone = state.activeQuest.objectives.every(o => o.isCompleted);
    if (allDone) {
      useGameStore.getState().completeQuest();
      // Reset accumulators for next quest
      driftAccumRef.current = 0;
      distanceAccumRef.current = 0;
    }
  });
}