// src/hooks/useGameLoopManager.ts
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../stores/gameStore';
import { WeatherSystem } from '../managers/WeatherSystem';
import { PerformanceScaler } from '../managers/PerformanceScaler';

export function useGameLoopManager() {
  const { scene } = useThree();
  const pausedRef = useRef(false);
  const lastStateRef = useRef<'playing' | 'crashed' | 'paused' | 'shop' | 'garage'>('playing');

  useFrame((state, delta) => {
    const currentMode = useGameStore.getState().gameMode;
    const isPaused = currentMode === 'paused';
    
    // Handle pause/resume state sync
    if (isPaused && !pausedRef.current) {
      pausedRef.current = true;
      lastStateRef.current = useGameStore.getState().gameMode as any;
    } else if (!isPaused && pausedRef.current) {
      pausedRef.current = false;
    }

    // Halt simulation logic when paused
    if (pausedRef.current) return;

    // Weather & Environment Updates
    WeatherSystem.getInstance().update(delta, scene);

    // Rain Particle Sync (if active)
    const rain = WeatherSystem.getInstance().getRainData();
    if (rain.intensity > 0.05) {
      // Sync to any existing rain points if exposed via VFXManager or direct scene add
      // Handled internally in WeatherSystem buffer updates for zero-GC
    }

    // Performance Scaling Tick
    PerformanceScaler.getInstance().update();

    // Dynamic Quest/Weather triggers
    if ((currentMode === 'playing' || currentMode === 'exploration') && Math.random() < 0.0005 * delta) {
      const weathers: Array<'clear' | 'rain' | 'storm' | 'overcast'> = ['clear', 'overcast', 'rain', 'storm'];
      WeatherSystem.getInstance().setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
    }
  });

  return pausedRef.current;
}
