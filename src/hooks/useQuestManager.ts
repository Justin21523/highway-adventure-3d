// src/hooks/useQuestManager.ts

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { IQuestObjective } from '../types/core';

export function useQuestManager() {
  const trackers = useRef({
    driftDistance: 0,
    topSpeed: 0,
    distanceTraveled: 0,
    lastPos: { x: 0, y: 0, z: 0 }
  });

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (!state.activeQuest || state.activeQuest.status !== 'active') return;

    const t = trackers.current;
    const speed = state.vehicle.speed;
    const isDrifting = state.vehicle.isDrifting;

    // Update distance
    const dx = state.playerPosition.x - t.lastPos.x;
    const dz = state.playerPosition.z - t.lastPos.z;
    t.distanceTraveled += Math.sqrt(dx * dx + dz * dz) * 3.6; // meters to km/h scale factor approx
    t.lastPos.x = state.playerPosition.x;
    t.lastPos.z = state.playerPosition.z;

    // Update drift tracking
    if (isDrifting && speed > 30) {
      t.driftDistance += speed * delta / 3.6;
    }

    // Update top speed
    if (speed > t.topSpeed) t.topSpeed = speed;

    // Sync objectives
    const updatedObjectives = state.activeQuest.objectives.map((obj: IQuestObjective) => {
      if (obj.isCompleted) return obj;

      let currentVal = obj.current;
      if (obj.type === 'drift_distance') currentVal = t.driftDistance;
      else if (obj.type === 'collect_coins') currentVal = obj.current; // handled externally
      else if (obj.type === 'reach_location') {
        const dist = Math.sqrt(
          Math.pow(state.playerPosition.x - (obj.location?.x || 0), 2) +
          Math.pow(state.playerPosition.z - (obj.location?.z || 0), 2)
        );
        currentVal = dist < obj.target ? obj.target : obj.target - dist;
      }

      const isCompleted = currentVal >= obj.target;
      return { ...obj, current: isCompleted ? obj.target : currentVal, isCompleted };
    });

    const allDone = updatedObjectives.every(o => o.isCompleted);
    if (allDone) {
      useGameStore.setState({ activeQuest: { ...state.activeQuest, objectives: updatedObjectives, status: 'completed' } });
      useGameStore.getState().completeQuest(state.activeQuest.id);
      trackers.current = { driftDistance: 0, topSpeed: 0, distanceTraveled: 0, lastPos: state.playerPosition };
    } else {
      useGameStore.setState({ activeQuest: { ...state.activeQuest, objectives: updatedObjectives } });
    }
  });

  return trackers;
}