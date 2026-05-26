/**
 * Visual effects (VFX) types for particle systems and post-processing effects.
 * These types define the structure of VFX instances, configurations, and managers.
 */

import type { Vector3Data, EntityId } from './core';

/** Type of visual effect to render */
export type VFXType =
  | 'explosion'
  | 'boostTrail'
  | 'spark'
  | 'smoke'
  | 'rain'
  | 'snow'
  | 'dust'
  | 'waterSplash'
  | 'tireSmoke'
  | 'headlightGlow';

/** Particle behavior mode for VFX */
export type ParticleBehavior = 'burst' | 'stream' | 'circle' | 'cone' | 'sphere' | 'area';

/** Easing function for particle animation */
export type ParticleEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';

/** Configuration for a single VFX instance */
export interface VFXConfig {
  /** Type of VFX to render */
  type: VFXType;
  /** Position in world space */
  position: Vector3Data;
  /** Duration in seconds */
  duration: number;
  /** Intensity multiplier (0.0 to 2.0) */
  intensity: number;
  /** Primary color (hex string) */
  color?: string;
  /** Secondary color for gradients */
  secondaryColor?: string;
  /** Particle count (auto-calculated if omitted) */
  particleCount?: number;
  /** Particle behavior mode */
  behavior?: ParticleBehavior;
  /** Easing function for animation */
  easing?: ParticleEasing;
  /** Spread angle in radians (for cone/circle) */
  spread?: number;
  /** Initial velocity */
  velocity?: number;
  /** Gravity influence */
  gravity?: number;
  /** Friction/drag */
  friction?: number;
  /** Size range [min, max] */
  sizeRange?: [number, number];
  /** Opacity range [min, max] */
  opacityRange?: [number, number];
  /** Whether VFX follows a moving target */
  followTarget?: boolean;
  /** Target entity ID (if followTarget is true) */
  targetId?: EntityId;
}

/** Runtime state of a VFX instance */
export interface VFXInstance {
  /** Unique identifier */
  id: EntityId;
  /** Configuration for this instance */
  config: VFXConfig;
  /** Start time in milliseconds (performance.now()) */
  startTime: number;
  /** Whether this VFX is currently active/rendering */
  active: boolean;
  /** Current elapsed time in seconds */
  elapsed: number;
  /** Current particle count (may change over time) */
  currentParticles: number;
  /** Loop count (for looping VFX) */
  loopCount: number;
  /** Whether VFX has completed its animation */
  completed: boolean;
}

/** VFX pool entry for object pooling */
export interface VFXPoolEntry extends VFXInstance {
  /** Reset VFX to inactive state */
  deactivate(): void;
  /** Initialize VFX with new configuration */
  activate(config: VFXConfig): void;
  /** Update VFX state for current frame */
  update(delta: number): void;
  /** Cleanup GPU resources */
  dispose(): void;
}

/** VFX manager configuration */
export interface VFXManagerConfig {
  /** Maximum concurrent VFX instances */
  maxInstances: number;
  /** Maximum particles per instance */
  maxParticlesPerInstance: number;
  /** Enable/disable VFX globally */
  enabled: boolean;
  /** Enable/disable post-processing effects */
  postProcessingEnabled: boolean;
  /** Particle texture atlas size */
  atlasSize: number;
  /** Enable GPU particle simulation */
  gpuSimulation: boolean;
}

/** VFX manager performance metrics */
export interface VFXMetrics {
  /** Active VFX instances count */
  activeInstances: number;
  /** Total active particles count */
  activeParticles: number;
  /** Total draw calls for VFX */
  drawCalls: number;
  /** Average frame time for VFX rendering */
  averageFrameTime: number;
  /** Peak particle count this session */
  peakParticles: number;
}
