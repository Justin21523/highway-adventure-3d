// src/systems/DayNightCycle.ts
/**
 * DayNightCycle
 * Standalone time progression system with visual hooks for lighting/fog updates.
 * Provides deterministic time-of-day calculation, weather integration, and event triggers.
 * Pure TypeScript - no React dependencies for maximum reusability.
 */

export type TimePhase = 'night' | 'dawn' | 'day' | 'dusk';
export type CycleEvent = 'sunrise' | 'sunset' | 'midnight' | 'noon';

export interface CycleConfig {
  cycleDuration: number; // seconds for full 24h cycle (default: 600 = 10 real minutes)
  sunriseStart: number; // phase value (0-1) when dawn begins (default: 0.2)
  sunriseEnd: number; // phase value when day begins (default: 0.35)
  sunsetStart: number; // phase value when dusk begins (default: 0.65)
  sunsetEnd: number; // phase value when night begins (default: 0.8)
}

const DEFAULT_CONFIG: CycleConfig = {
  cycleDuration: 600,
  sunriseStart: 0.2,
  sunriseEnd: 0.35,
  sunsetStart: 0.65,
  sunsetEnd: 0.8
};

export class DayNightCycle {
  private static instance: DayNightCycle | null = null;
  private config: CycleConfig;
  private phase = 0.25; // Start at dawn (0=midnight, 0.25=6am, 0.5=noon, 0.75=6pm)
  private lastPhase = this.phase;
  private listeners: Map<string, (phase: number, time: TimePhase) => void> = new Map();
  private eventTriggers: Map<CycleEvent, boolean> = new Map();
  private lastUpdate = performance.now();

  private constructor(config?: Partial<CycleConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<CycleConfig>): DayNightCycle {
    if (!DayNightCycle.instance) {
      DayNightCycle.instance = new DayNightCycle(config);
    }
    return DayNightCycle.instance;
  }

  /**
   * Advance the cycle by delta time (call every frame)
   * Returns current phase (0-1) and time phase enum
   */
  update(deltaMs: number): { phase: number; timePhase: TimePhase } {
    const now = performance.now();
    const deltaSec = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    this.lastPhase = this.phase;
    // Advance phase: 1.0 = full cycle
    this.phase = (this.phase + deltaSec / this.config.cycleDuration) % 1;

    const timePhase = this.getTimePhase(this.phase);
    
    // Trigger events on phase boundaries
    this.checkEventTriggers(timePhase);
    
    // Notify listeners
    this.listeners.forEach(callback => callback(this.phase, timePhase));

    return { phase: this.phase, timePhase };
  }

  /**
   * Determine time phase enum based on phase value
   */
  private getTimePhase(phase: number): TimePhase {
    if (phase < this.config.sunriseStart || phase >= this.config.sunsetEnd) return 'night';
    if (phase >= this.config.sunriseStart && phase < this.config.sunriseEnd) return 'dawn';
    if (phase >= this.config.sunriseEnd && phase < this.config.sunsetStart) return 'day';
    return 'dusk';
  }

  /**
   * Check and trigger cycle events (sunrise/sunset/etc)
   */
  private checkEventTriggers(currentPhase: TimePhase) {
    const wasNight = this.getTimePhase(this.lastPhase) === 'night';
    const isNight = currentPhase === 'night';
    const wasDay = this.getTimePhase(this.lastPhase) === 'day';
    const isDay = currentPhase === 'day';

    // Sunrise: night -> dawn
    if (wasNight && !isNight && !this.eventTriggers.get('sunrise')) {
      this.triggerEvent('sunrise');
      this.eventTriggers.set('sunrise', true);
    }
    // Sunset: day -> dusk
    if (wasDay && !isDay && !this.eventTriggers.get('sunset')) {
      this.triggerEvent('sunset');
      this.eventTriggers.set('sunset', true);
    }
    // Midnight: dusk -> night
    if (!wasNight && isNight && !this.eventTriggers.get('midnight')) {
      this.triggerEvent('midnight');
      this.eventTriggers.set('midnight', true);
    }
    // Noon: dawn -> day
    if (!wasDay && isDay && !this.eventTriggers.get('noon')) {
      this.triggerEvent('noon');
      this.eventTriggers.set('noon', true);
    }

    // Reset triggers when phase wraps
    if (this.lastPhase > 0.9 && this.phase < 0.1) {
      this.eventTriggers.clear();
    }
  }

  /**
   * Internal event dispatcher
   */
  private triggerEvent(event: CycleEvent) {
    // Could integrate with NotificationManager, QuestSystem, etc here
    console.log(`[DayNightCycle] Event triggered: ${event}`);
  }

  /**
   * Register a listener for time updates
   * Returns unsubscribe function
   */
  onTimeUpdate(callback: (phase: number, timePhase: TimePhase) => void): () => void {
    const id = `listener_${Date.now()}_${Math.random()}`;
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  /**
   * Register a callback for specific cycle events
   */
  onEvent(event: CycleEvent, callback: () => void): () => void {
    const id = `event_${event}_${Date.now()}`;
    const wrapper = (phase: number, timePhase: TimePhase) => {
      // Simple event detection via phase boundaries
      if (event === 'sunrise' && timePhase === 'dawn' && phase < 0.25) callback();
      if (event === 'sunset' && timePhase === 'dusk' && phase > 0.65) callback();
      if (event === 'midnight' && timePhase === 'night' && phase < 0.1) callback();
      if (event === 'noon' && timePhase === 'day' && phase > 0.45) callback();
    };
    this.listeners.set(id, wrapper);
    return () => this.listeners.delete(id);
  }

  /**
   * Get current time as 24h clock (0-23)
   */
  getHour(): number {
    return Math.floor(this.phase * 24);
  }

  /**
   * Get sun elevation angle in radians (-PI/2 to PI/2)
   * Negative = below horizon (night)
   */
  getSunElevation(): number {
    // Simple sine wave: 0 at midnight, PI/2 at noon, -PI/2 at midnight
    return Math.sin((this.phase - 0.25) * Math.PI * 2) * (Math.PI / 2);
  }

  /**
   * Get sun direction vector for lighting calculations
   */
  getSunDirection(): { x: number; y: number; z: number } {
    const elevation = this.getSunElevation();
    const azimuth = this.phase * Math.PI * 2; // Full circle over 24h
    
    return {
      x: Math.cos(elevation) * Math.sin(azimuth),
      y: Math.sin(elevation),
      z: Math.cos(elevation) * Math.cos(azimuth)
    };
  }

  /**
   * Get sky color gradient factors for interpolation
   * Returns { horizon: 0-1, zenith: 0-1 } for blending between colors
   */
  getSkyGradient(): { horizon: number; zenith: number } {
    const elevation = this.getSunElevation();
    // More blue at zenith during day, more orange at horizon during dawn/dusk
    const horizon = Math.max(0, Math.cos(elevation) * 0.7 + 0.3);
    const zenith = Math.max(0, Math.sin(elevation) * 0.8 + 0.2);
    return { horizon, zenith };
  }

  /**
   * Reset cycle to specific phase (for testing/debugging)
   */
  setPhase(phase: number) {
    this.phase = phase % 1;
    this.lastPhase = phase;
  }

  /**
   * Pause/unpause cycle progression
   */
  setPaused(paused: boolean) {
    if (paused) {
      this.lastUpdate = performance.now(); // Prevent delta spike on resume
    }
  }
}