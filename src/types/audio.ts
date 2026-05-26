/**
 * Audio system types for Web Audio API integration.
 * These types define sound effects, music, ambient audio, and the audio manager interface.
 */

import type { Vector3Data } from './core';

/** Type of audio source */
export type AudioType =
  | 'engine'
  | 'impact'
  | 'coin'
  | 'boost'
  | 'shop'
  | 'quest'
  | 'ambient'
  | 'music'
  | 'ui'
  | 'vehiclePass'
  | 'horn'
  | 'brake'
  | 'drift'
  | 'explosion'
  | 'rain';

/** Audio spatialization mode */
export type AudioSpatialMode = '2d' | '3d' | 'ambient';

/** Audio source configuration */
export interface AudioConfig {
  /** Type of audio */
  type: AudioType;
  /** Volume (0.0 to 1.0) */
  volume: number;
  /** Pitch multiplier (0.5 to 2.0) */
  pitch: number;
  /** Whether audio loops */
  loop: boolean;
  /** Spatialization mode */
  spatialMode: AudioSpatialMode;
  /** 3D position (only for spatialMode: '3d') */
  position?: Vector3Data;
  /** Distance for 3D audio falloff */
  distance?: number;
  /** Fade-in duration in seconds */
  fadeInDuration?: number;
  /** Fade-out duration in seconds */
  fadeOutDuration?: number;
}

/** Audio clip loaded into memory */
export interface AudioClip {
  /** Unique identifier */
  id: string;
  /** Audio data (base64 or buffer) */
  data: AudioBuffer;
  /** Duration in seconds */
  duration: number;
  /** Audio type */
  type: AudioType;
  /** Whether clip is loaded and ready */
  loaded: boolean;
}

/** Active audio instance (playing sound) */
export interface AudioInstance {
  /** Unique identifier for this playback */
  id: string;
  /** Audio configuration */
  config: AudioConfig;
  /** Audio buffer source node */
  source: AudioBufferSourceNode | null;
  /** Gain node for volume control */
  gainNode: GainNode | null;
  /** Panner node for 3D spatialization */
  pannerNode: PannerNode | null;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Start time in milliseconds */
  startTime: number;
  /** Elapsed time in seconds */
  elapsed: number;
  /** Current volume (may be fading) */
  currentVolume: number;
}

/** Audio group for batch operations */
export interface AudioGroup {
  /** Group name */
  name: string;
  /** Master volume for this group */
  volume: number;
  /** Whether group is muted */
  isMuted: boolean;
  /** Active instances in this group */
  instances: AudioInstance[];
}

/** Audio manager configuration */
export interface AudioManagerConfig {
  /** Master volume (0.0 to 1.0) */
  masterVolume: number;
  /** Music volume (0.0 to 1.0) */
  musicVolume: number;
  /** SFX volume (0.0 to 1.0) */
  sfxVolume: number;
  /** Ambient volume (0.0 to 1.0) */
  ambientVolume: number;
  /** UI sounds volume (0.0 to 1.0) */
  uiVolume: number;
  /** Enable 3D spatial audio */
  spatialAudioEnabled: boolean;
  /** Enable audio ducking (lower music when SFX plays) */
  duckingEnabled: boolean;
  /** Ducking amount (0.0 to 1.0) */
  duckingAmount: number;
  /** Distance model for 3D audio */
  distanceModel: 'linear' | 'inverse' | 'exponential';
  /** Reference distance for 3D audio */
  referenceDistance: number;
  /** Max distance for 3D audio */
  maxDistance: number;
}

/** Audio manager performance metrics */
export interface AudioMetrics {
  /** Active audio instances count */
  activeInstances: number;
  /** Total audio buffers loaded */
  buffersLoaded: number;
  /** Total audio memory usage (bytes) */
  memoryUsage: number;
  /** Audio context state */
  contextState: 'suspended' | 'running' | 'closed';
  /** Number of 3D audio sources */
  active3DSources: number;
}
