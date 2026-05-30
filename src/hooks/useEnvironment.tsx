/**
 * useEnvironment — Hook for environment state (weather, time).
 *
 * Provides reactive access to environment data from the EnvironmentSystem.
 * Used by UI components and environment-related components.
 */

import { useEffect, useState } from 'react';
import { EnvironmentSystem } from '@/systems/EnvironmentSystem';
import { GameRuntime } from '@/systems/GameRuntime';
import type { GameEventType } from '@/systems/GameRuntime';
import type { WeatherType } from '@/systems/EnvironmentSystem';

/* ─────────────────────────────────────────────
 * useEnvironment Hook
 * ───────────────────────────────────────────── */

export function useEnvironment() {
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [time, setTime] = useState({ hour: 12, minute: 0 });

  // Subscribe to weather events
  useEffect(() => {
    const envSystem = EnvironmentSystem.getInstance();

    // Initial state
    setWeather(envSystem.getWeather());
    setTime(envSystem.getTime());

    const handleWeatherChanged = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'weather_changed') {
        setWeather(event.data?.weather as WeatherType);
      }
    };

    GameRuntime.getInstance().on('weather_changed', handleWeatherChanged);

    return () => {
      GameRuntime.getInstance().off('weather_changed', handleWeatherChanged);
    };
  }, []);

  // Update time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const envSystem = EnvironmentSystem.getInstance();
      setTime(envSystem.getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const setTimeOfDay = (hour: number, minute: number = 0) => {
    EnvironmentSystem.getInstance().setTime(hour, minute);
  };

  const setWeatherType = (newWeather: WeatherType) => {
    EnvironmentSystem.getInstance().setWeather(newWeather);
  };

  const setTimeSpeed = (speed: number) => {
    EnvironmentSystem.getInstance().setTimeSpeed(speed);
  };

  return {
    weather,
    time,
    setTimeOfDay,
    setWeather: setWeatherType,
    setTimeSpeed,
  };
}

/* ─────────────────────────────────────────────
 * useDayNightCycle Hook
 * ───────────────────────────────────────────── */

export function useDayNightCycle() {
  const [isDaytime, setIsDaytime] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const envSystem = EnvironmentSystem.getInstance();
      const hour = envSystem.getCurrentHour();
      setIsDaytime(hour >= 6 && hour < 19);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { isDaytime };
}
