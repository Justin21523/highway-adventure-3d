/**
 * EnvironmentSystem — Day/night cycle, weather, fog, and atmospheric effects.
 *
 * Manages the visual atmosphere of the game world:
 * - Day/night cycle with smooth transitions
 * - Weather effects (clear, rain, fog)
 * - Dynamic fog density and color
 * - Sky color transitions
 * - Street light activation based on time of day
 *
 * All visual changes are applied to the scene's background, fog, and lighting.
 */

import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { GameRuntime } from './GameRuntime';
import type { GameEventType } from './GameRuntime';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Weather types */
export type WeatherType = 'clear' | 'rain' | 'fog' | 'overcast';

/** Time of day (0-24 hours) */
interface TimeOfDay {
  hour: number;
  minute: number;
}

/* ─────────────────────────────────────────────
 * EnvironmentSystem Singleton
 * ───────────────────────────────────────────── */

export class EnvironmentSystem {
  private static instance: EnvironmentSystem | null = null;

  /** Current time of day */
  private currentTime: TimeOfDay = { hour: 12, minute: 0 };

  /** Current weather */
  private currentWeather: WeatherType = 'clear';

  /** Next weather change timer */
  private weatherTimer = 0;

  /** Time speed multiplier */
  private timeSpeed = 1; // 1 = real-time, 10 = 10x speed

  /** Scene reference for fog and background */
  private scene: THREE.Scene | null = null;

  /** Ambient light reference */
  private ambientLight: THREE.AmbientLight | null = null;

  /** Directional light reference (sun/moon) */
  private directionalLight: THREE.DirectionalLight | null = null;

  /** Hemisphere light reference */
  private hemisphereLight: THREE.HemisphereLight | null = null;

  /** Whether the system is initialized */
  private isInitialized = false;

  /** Reusable color objects */
  private _skyColor = new THREE.Color();
  private _fogColor = new THREE.Color();

  private constructor() {}

  static getInstance(): EnvironmentSystem {
    if (!EnvironmentSystem.instance) {
      EnvironmentSystem.instance = new EnvironmentSystem();
    }
    return EnvironmentSystem.instance;
  }

  /* ── Initialization ── */

  /** Initialize with a Three.js scene */
  init(scene: THREE.Scene): void {
    if (this.isInitialized) return;

    this.scene = scene;

    // Create ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.ambientLight);

    // Create directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -100;
    this.directionalLight.shadow.camera.right = 100;
    this.directionalLight.shadow.camera.top = 100;
    this.directionalLight.shadow.camera.bottom = -100;
    scene.add(this.directionalLight);

    // Create hemisphere light (sky/ground)
    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1b, 0.3);
    scene.add(this.hemisphereLight);

    // Set initial fog
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

    // Set initial sky color
    this.updateSkyColor();

    this.isInitialized = true;
  }

  /* ── Frame Update ── */

  update(delta: number): void {
    if (!this.isInitialized) return;

    // Update time of day
    this.updateTime(delta);

    // Update weather
    this.updateWeather(delta);

    // Apply environment changes
    this.applyEnvironment();
  }

  /* ── Time of Day ── */

  /** Advance the time of day */
  private updateTime(delta: number): void {
    // Each real second = timeSpeed game minutes
    const gameMinutes = delta * timeSpeed * 10;
    this.currentTime.minute += gameMinutes;

    while (this.currentTime.minute >= 60) {
      this.currentTime.minute -= 60;
      this.currentTime.hour += 1;
    }

    while (this.currentTime.hour >= 24) {
      this.currentTime.hour -= 24;
    }
  }

  /** Get the current hour as a float */
  getCurrentHour(): number {
    return this.currentTime.hour + this.currentTime.minute / 60;
  }

  /** Get the time of day as a fraction (0-1) */
  getTimeFraction(): number {
    return this.getCurrentHour() / 24;
  }

  /* ── Weather ── */

  /** Update weather state */
  private updateWeather(delta: number): void {
    this.weatherTimer += delta;

    // Change weather every 5-15 minutes of game time
    const weatherDuration = 300 + Math.random() * 600;
    if (this.weatherTimer >= weatherDuration) {
      this.changeWeather();
      this.weatherTimer = 0;
    }
  }

  /** Change to a random weather type */
  private changeWeather(): void {
    const weathers: WeatherType[] = ['clear', 'overcast', 'fog', 'rain'];
    const weights = [0.5, 0.25, 0.15, 0.1];

    const roll = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weathers.length; i++) {
      cumulative += weights[i];
      if (roll <= cumulative) {
        this.currentWeather = weathers[i];
        break;
      }
    }

    GameRuntime.getInstance().dispatchEvent({
      type: 'weather_changed' as GameEventType,
      timestamp: Date.now(),
      data: { weather: this.currentWeather },
    });
  }

  /* ── Environment Application ── */

  /** Apply all environment changes to the scene */
  private applyEnvironment(): void {
    if (!this.scene) return;

    const hour = this.getCurrentHour();

    // Update sky color based on time
    this.updateSkyColor();

    // Update fog based on weather and time
    this.updateFog();

    // Update lighting based on time
    this.updateLighting(hour);

    // Update hemisphere light
    this.updateHemisphereLight(hour);
  }

  /** Update sky color based on time of day */
  private updateSkyColor(): void {
    if (!this.scene) return;

    const hour = this.getCurrentHour();
    let color: string;

    // Sky color transitions
    if (hour >= 6 && hour < 8) {
      // Dawn
      const t = (hour - 6) / 2;
      color = this.lerpColor('#1a1a2e', '#ff7e5f', t);
    } else if (hour >= 8 && hour < 17) {
      // Day
      color = '#87ceeb';
    } else if (hour >= 17 && hour < 19) {
      // Dusk
      const t = (hour - 17) / 2;
      color = this.lerpColor('#87ceeb', '#2d1b69', t);
    } else if (hour >= 19 && hour < 21) {
      // Evening
      const t = (hour - 19) / 2;
      color = this.lerpColor('#2d1b69', '#0f0f23', t);
    } else {
      // Night
      color = '#0f0f23';
    }

    // Weather modifies sky color
    switch (this.currentWeather) {
      case 'overcast':
        color = this.lerpColor(color, '#6b7280', 0.5);
        break;
      case 'fog':
        color = this.lerpColor(color, '#9ca3af', 0.6);
        break;
      case 'rain':
        color = this.lerpColor(color, '#4b5563', 0.4);
        break;
    }

    this.scene.background = new THREE.Color(color);
    this._fogColor.set(color);
  }

  /** Update fog based on weather and time */
  private updateFog(): void {
    if (!this.scene) return;

    let density = 0.002; // Default clear day
    const hour = this.getCurrentHour();

    // Night fog is denser
    if (hour < 6 || hour > 20) {
      density = 0.003;
    }

    // Weather affects fog
    switch (this.currentWeather) {
      case 'fog':
        density = 0.008;
        break;
      case 'rain':
        density = 0.005;
        break;
      case 'overcast':
        density = 0.004;
        break;
    }

    // Quality setting affects max fog density
    const quality = usePerformanceStore.getState().qualityTier;
    if (quality === 'low') {
      density = Math.min(density, 0.003);
    }

    this.scene.fog = new THREE.FogExp2(this._fogColor.getHex(), density);
  }

  /** Update lighting based on time of day */
  private updateLighting(hour: number): void {
    if (!this.ambientLight || !this.directionalLight) return;

    // Sun intensity based on time
    let sunIntensity = 0;
    let ambientIntensity = 0;

    if (hour >= 6 && hour < 8) {
      // Dawn
      const t = (hour - 6) / 2;
      sunIntensity = 0.3 + t * 0.5;
      ambientIntensity = 0.2 + t * 0.2;
    } else if (hour >= 8 && hour < 17) {
      // Day
      sunIntensity = 0.8;
      ambientIntensity = 0.4;
    } else if (hour >= 17 && hour < 19) {
      // Dusk
      const t = (hour - 17) / 2;
      sunIntensity = 0.8 - t * 0.5;
      ambientIntensity = 0.4 - t * 0.2;
    } else {
      // Night
      sunIntensity = 0.1;
      ambientIntensity = 0.15;
    }

    // Weather affects lighting
    switch (this.currentWeather) {
      case 'overcast':
        sunIntensity *= 0.6;
        ambientIntensity *= 0.8;
        break;
      case 'fog':
        sunIntensity *= 0.5;
        ambientIntensity *= 0.7;
        break;
      case 'rain':
        sunIntensity *= 0.4;
        ambientIntensity *= 0.7;
        break;
    }

    this.ambientLight.intensity = ambientIntensity;
    this.directionalLight.intensity = sunIntensity;

    // Position sun based on time
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    this.directionalLight.position.set(
      Math.cos(sunAngle) * 100,
      Math.sin(sunAngle) * 100,
      50,
    );

    // Street lights activate at night
    const streetLightsOn = hour < 6 || hour > 19;
    this.directionalLight.color.setHex(streetLightsOn ? 0x4488ff : 0xffffff);
  }

  /** Update hemisphere light based on time */
  private updateHemisphereLight(hour: number): void {
    if (!this.hemisphereLight) return;

    let skyColor: string;
    let groundColor: string;

    if (hour >= 6 && hour < 20) {
      skyColor = '#87ceeb';
      groundColor = '#362d1b';
    } else {
      skyColor = '#1a1a2e';
      groundColor = '#1a1a1a';
    }

    this.hemisphereLight.color.setHex(skyColor);
    this.hemisphereLight.groundColor.setHex(groundColor);
  }

  /** Linear interpolation between two hex colors */
  private lerpColor(hex1: string, hex2: string, t: number): string {
    const c1 = new THREE.Color(hex1);
    const c2 = new THREE.Color(hex2);
    c1.lerp(c2, t);
    return '#' + c1.getHexString();
  }

  /* ── Weather Effects ── */

  /** Get the current weather */
  getWeather(): WeatherType {
    return this.currentWeather;
  }

  /** Get the current time of day */
  getTime(): TimeOfDay {
    return { ...this.currentTime };
  }

  /** Set the time of day directly */
  setTime(hour: number, minute: number = 0): void {
    this.currentTime.hour = ((hour % 24) + 24) % 24;
    this.currentTime.minute = Math.max(0, Math.min(60, minute));
  }

  /** Set the weather directly */
  setWeather(weather: WeatherType): void {
    this.currentWeather = weather;
  }

  /** Set the time speed multiplier */
  setTimeSpeed(speed: number): void {
    this.timeSpeed = Math.max(0.1, Math.min(50, speed));
  }

  /* ── Cleanup ── */

  dispose(): void {
    if (this.ambientLight) {
      this.scene?.remove(this.ambientLight);
      this.ambientLight = null;
    }
    if (this.directionalLight) {
      this.scene?.remove(this.directionalLight);
      this.directionalLight = null;
    }
    if (this.hemisphereLight) {
      this.scene?.remove(this.hemisphereLight);
      this.hemisphereLight = null;
    }

    EnvironmentSystem.instance = null;
  }
}
