/**
 * GameRuntime — Master game loop and system coordinator.
 *
 * This singleton manages the overall game lifecycle:
 * - Initializes all subsystems on startup
 * - Dispatches frame updates to all active systems
 * - Handles game mode transitions
 * - Provides a central event bus for cross-system communication
 *
 * All frame-update logic flows through this system. Individual systems
 * (WorldGenerator, ChunkStreamer, TrafficAI, etc.) are called here
 * rather than having their own useFrame hooks.
 */

import type { GameMode } from '@/types/core';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { useTrafficStore } from '@/stores/trafficStore';
import { useShopStore } from '@/stores/shopStore';
import { useQuestStore } from '@/stores/questStore';
import { usePerformanceStore } from '@/stores/performanceStore';

/* ─────────────────────────────────────────────
 * Event System
 * ───────────────────────────────────────────── */

/** All event types the game runtime can dispatch */
export type GameEventType =
  | 'player_position_update'
  | 'chunk_loaded'
  | 'chunk_unloaded'
  | 'quest_accepted'
  | 'quest_completed'
  | 'quest_failed'
  | 'coin_collected'
  | 'pickup_collected'
  | 'shop_entered'
  | 'shop_exited'
  | 'vehicle_upgraded'
  | 'traffic_spawned'
  | 'traffic_despawned'
  | 'event_spawned'
  | 'event_expired'
  | 'performance_degraded'
  | 'performance_improved'
  | 'game_mode_changed'
  | 'weather_changed'
  | 'traffic_collision';

/** Generic event handler signature */
export type GameEventHandler = (event: GameEvent) => void;

/** A game event dispatched by the runtime */
export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

/* ─────────────────────────────────────────────
 * System Interfaces
 * ───────────────────────────────────────────── */

/** Minimal interface for a subsystem that participates in the game loop */
export interface GameSystem {
  /** Called once during initialization */
  init(): void;

  /** Called every frame with delta time in seconds */
  update(delta: number): void;

  /** Called when the game mode changes */
  onModeChange?(newMode: GameMode): void;

  /** Called during cleanup */
  dispose(): void;
}

/* ─────────────────────────────────────────────
 * GameRuntime Singleton
 * ───────────────────────────────────────────── */

export class GameRuntime {
  private static instance: GameRuntime | null = null;

  private systems: GameSystem[] = [];
  private eventHandlers: Map<GameEventType, GameEventHandler[]> = new Map();
  private isRunning = false;
  private lastFrameTime = 0;
  private frameCount = 0;

  // Reusable objects to prevent GC
  private _event: GameEvent | null = null;

  private constructor() {}

  static getInstance(): GameRuntime {
    if (!GameRuntime.instance) {
      GameRuntime.instance = new GameRuntime();
    }
    return GameRuntime.instance;
  }

  /* ── Lifecycle ── */

  /** Start the game loop */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.dispatchEvent({ type: 'game_mode_changed', timestamp: Date.now(), data: { mode: useGameStore.getState().gameMode } });
  }

  /** Stop the game loop */
  stop(): void {
    this.isRunning = false;
  }

  /** Register a subsystem */
  registerSystem(system: GameSystem): void {
    this.systems.push(system);
  }

  /** Unregister a subsystem */
  unregisterSystem(system: GameSystem): void {
    const idx = this.systems.indexOf(system);
    if (idx >= 0) this.systems.splice(idx, 1);
  }

  /* ── Frame Loop ── */

  /**
   * Call this from R3F's useFrame to drive the game loop.
   * Pass the delta time from useFrame(_, delta).
   */
  update(delta: number): void {
    if (!this.isRunning) return;

    // Cap delta to prevent physics explosions on tab switch
    const dt = Math.min(delta, 0.05);

    this.frameCount++;

    // Dispatch frame update to all registered systems
    for (const system of this.systems) {
      try {
        system.update(dt);
      } catch (error) {
        console.error(`GameRuntime: System "${system.constructor.name}" update threw an error:`, error);
      }
    }
  }

  /**
   * Internal frame loop using requestAnimationFrame.
   * Used when not running inside R3F's useFrame.
   */
  private _rafLoop = (timestamp: number) => {
    if (!this.isRunning) return;

    const delta = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;

    this.update(delta);
    requestAnimationFrame(this._rafLoop);
  };

  startAutoLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this._rafLoop);
  }

  /* ── Mode Transitions ── */

  setGameMode(mode: GameMode): void {
    useGameStore.getState().setGameMode(mode);
    this.dispatchEvent({ type: 'game_mode_changed', timestamp: Date.now(), data: { mode } });

    // Notify all systems of mode change
    for (const system of this.systems) {
      try {
        system.onModeChange?.(mode);
      } catch (error) {
        console.error(`GameRuntime: System "${system.constructor.name}" onModeChange threw an error:`, error);
      }
    }
  }

  /* ── Event Bus ── */

  /** Subscribe to a game event */
  on(eventType: GameEventType, handler: GameEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /** Unsubscribe from a game event */
  off(eventType: GameEventType, handler: GameEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (!handlers) return;

    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  /** Dispatch a game event to all subscribers */
  dispatchEvent(event: GameEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (!handlers) return;

    // Copy handlers array to avoid mutation during iteration
    const snapshot = [...handlers];
    for (const handler of snapshot) {
      try {
        handler(event);
      } catch (error) {
        console.error(`GameRuntime: Event handler for "${event.type}" threw an error:`, error);
      }
    }
  }

  /* ── Convenience Methods ── */

  /** Get the current game mode */
  getGameMode(): GameMode {
    return useGameStore.getState().gameMode;
  }

  /** Get player position */
  getPlayerPosition() {
    return useWorldStore.getState().playerPosition;
  }

  /** Check if game is in an interactive mode (not paused, not in shop) */
  isPlayable(): boolean {
    const mode = this.getGameMode();
    return mode === 'playing' || mode === 'exploration';
  }

  /** Get number of registered systems */
  getSystemCount(): number {
    return this.systems.length;
  }

  /* ── Cleanup ── */

  dispose(): void {
    this.stop();

    for (const system of this.systems) {
      try {
        system.dispose();
      } catch (error) {
        console.error(`GameRuntime: System "${system.constructor.name}" dispose threw an error:`, error);
      }
    }

    this.systems = [];
    this.eventHandlers.clear();
    GameRuntime.instance = null;
  }
}
