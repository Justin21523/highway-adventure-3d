// src/hooks/useGameOrchestrator.ts
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../stores/gameStore';
import { StatsTracker } from '../managers/StatsTracker';
import { AchievementManager } from '../managers/AchievementManager';
import { NotificationManager } from '../managers/NotificationManager';
import { SaveManager } from '../managers/SaveManager';
import { DayNightCycle } from '../systems/DayNightCycle';
import { WeatherSystem } from '../managers/WeatherSystem';
import { MusicManager } from '../managers/MusicManager';

/**
 * useGameOrchestrator
 * Centralized background loop that coordinates managers without conflicting with physics/render loops.
 * Throttles heavy operations (saves, achievement checks, notifications) to prevent frame drops.
 */
export function useGameOrchestrator() {
  const lastSaveRef = useRef(0);
  const lastAchieveCheckRef = useRef(0);
  const lastNotifyRef = useRef(0);
  const dayNightRef = useRef(DayNightCycle.getInstance());
  const weatherRef = useRef(WeatherSystem.getInstance());
  const statsRef = useRef(StatsTracker.getInstance());
  const achieveRef = useRef(AchievementManager.getInstance());
  const notifRef = useRef(NotificationManager.getInstance());
  const musicRef = useRef(MusicManager.getInstance());

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (state.gameMode === 'paused' || state.gameMode === 'crashed') return;

    const now = performance.now();

    // 1. Day/Night & Weather Sync
    dayNightRef.current.update(delta * 1000);
    // Weather updates are handled in LightingController/WeatherSystem internally

    // 2. Stats Tracking (every frame, lightweight math)
    statsRef.current.update();
    musicRef.current.updateDynamics(state.vehicle.speed, state.vehicle.rpm);

    // 3. Achievement Checks (throttled to ~2Hz)
    if (now - lastAchieveCheckRef.current > 500) {
      achieveRef.current.updateProgress();
      lastAchieveCheckRef.current = now;
    }

    // 4. Auto-Save (every 30s)
    if (now - lastSaveRef.current > 30000) {
      SaveManager.getInstance().save();
      statsRef.current.save();
      lastSaveRef.current = now;
    }

    // 5. Contextual Notifications (throttled to ~1Hz)
    if (now - lastNotifyRef.current > 1000) {
      const v = state.vehicle;
      if (v.health < 30 && v.health > 25) {
        notifRef.current.vehicleDamaged(70 - v.health);
      }
      if (state.profile.coins > 0 && Math.random() < 0.05) {
        // Example: occasional tip notification
        // notifRef.current.notify({ title: 'Tip', message: 'Use SPACE for drift boosts!', priority: 'low', duration: 3000 });
      }
      lastNotifyRef.current = now;
    }
  });
}
