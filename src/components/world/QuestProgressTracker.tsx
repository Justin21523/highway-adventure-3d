// src/components/world/QuestProgressTracker.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';
import { QuestObjective, QuestCategory } from '../../types/core';

/**
 * QuestProgressTracker
 * Pure logic component that bridges real-time gameplay events to quest objectives.
 * Polls store state every frame, calculates progress deltas, and triggers completions.
 */
export function QuestProgressTracker() {
  const trackers = useRef({
    driftMeters: 0, lastSpeed: 0, distance: 0, lastPos: { x: 0, z: 0 }
  });

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (!state.activeQuest || state.activeQuest.status !== 'active') return;

    const t = trackers.current;
    const v = state.vehicle;
    const p = state.playerPosition;

    // 1. Distance tracking
    const dx = p.x - t.lastPos.x;
    const dz = p.z - t.lastPos.z;
    t.distance += Math.sqrt(dx * dx + dz * dz);
    t.lastPos = { x: p.x, z: p.z };

    // 2. Drift tracking
    if (v.isDrifting && v.speed > 30) {
      t.driftMeters += (v.speed / 3.6) * delta;
    }

    // 3. Max Speed tracking
    if (v.speed > t.lastSpeed) t.lastSpeed = v.speed;

    // 4. Update Objectives
    // ✅ Type-safe objective updates using core.ts QuestObjective
    const updated = state.activeQuest.objectives.map((obj: QuestObjective) => {
      if (obj.isCompleted) return obj;
      
      let val = obj.current;
      if (obj.type === 'driftDistance') val = t.driftMeters;
      else if (obj.type === 'collectCoins') val = obj.current; // Handled externally
      else if (obj.type === 'reachLocation' && obj.location) {
        const dist = Math.sqrt(
          Math.pow(p.x - obj.location.x, 2) + Math.pow(p.z - obj.location.z, 2)
        );
        val = obj.target - dist;
      } else if (obj.type === 'top_speed' || obj.type === 'reachSpeed') {
        val = t.lastSpeed;
      } else if (obj.type === 'distance_traveled' || obj.type === 'driveDistance') {
        val = t.distance;
      }

      const done = val >= obj.target;
      return { ...obj, current: done ? obj.target : val, isCompleted: done };
    });

    const allDone = updated.every(o => o.isCompleted);
    if (allDone) {
      useGameStore.getState().completeQuest(state.activeQuest.id ?? state.activeQuest.id);
      // Reset trackers for next quest cycle if needed
      t.driftMeters = 0; t.lastSpeed = 0;
    } else {
      useGameStore.setState({ activeQuest: { ...state.activeQuest, objectives: updated } });
    }
  });

  return null;
}
