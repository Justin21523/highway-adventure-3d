/**
 * Master game configuration — tunable parameters for the entire game.
 */
import type { WorldGenConfig } from '@/types/world';
import type { PerformanceConfig } from '@/types/performance';
import { WORLD } from '@/constants/world';

export const GAME_CONFIG = {
  version: '2.0.0',
  title: 'Highway Adventure 3D',
  autoSaveInterval: 30,
  maxNotifications: 5,
  notificationDuration: 4,
  interactionKeyHintDuration: 3,
  cameraDefaultFov: 60,
  cameraMaxFov: 85,
  cameraFovLerpSpeed: 2.0,
  cameraFollowDistance: 12,
  cameraFollowHeight: 5,
  cameraLookAheadDistance: 15,
  cameraLerpSpeed: 4.0,
  minimapSize: 160,
  minimapZoom: 3.0,
  minimapUpdateInterval: 0.25,
  pickupRespawnTime: 30,
  maxInventorySlots: 50,
  dayNightCycleDuration: 600,
  weatherChangeInterval: 180,
  rainProbability: 0.15,
  fogProbability: 0.1,
} as const;

export const WORLD_GEN_CONFIG: WorldGenConfig = {
  chunkSize: WORLD.CHUNK_SIZE,
  renderDistance: WORLD.RENDER_DISTANCE_CHUNKS,
  unloadDistance: WORLD.UNLOAD_DISTANCE_CHUNKS,
  maxActiveChunks: WORLD.MAX_ACTIVE_CHUNKS,
  seed: WORLD.DEFAULT_SEED,
  zoneDistribution: {
    highway: 0.35,
    suburban: 0.25,
    cityCenter: 0.2,
    industrial: 0.1,
    countryside: 0.1,
  },
  highwayFrequency: 0.3,
  cityDensity: 0.5,
  shopDensity: 0.15,
  decorationDensity: 0.7,
};

export const PERFORMANCE_CONFIG: PerformanceConfig = {
  targetFps: 60,
  downgradeThreshold: 45,
  upgradeThreshold: 55,
  sampleInterval: 500,
  sampleWindow: 10,
  minQualityLevel: 'low',
  maxQualityLevel: 'ultra',
  autoScale: true,
};

export const AUDIO_CONFIG = {
  masterVolume: 0.7,
  musicVolume: 0.3,
  sfxVolume: 0.8,
  ambientVolume: 0.4,
  engineOscillatorType: 'sawtooth' as OscillatorType,
  engineSecondaryOscillatorType: 'square' as OscillatorType,
  windNoiseFilterFreq: 800,
  windNoiseQ: 0.5,
  maxDistanceForSpatialAudio: 100,
  engineSoundMinFreq: 80,
  engineSoundMaxFreq: 400,
} as const;

export const INPUT_CONFIG = {
  steerSensitivity: 1.0,
  steerDeadzone: 0.05,
  throttleRampUp: 3.0,
  throttleRampDown: 5.0,
  brakeRampUp: 6.0,
  steerReturnSpeed: 5.0,
  touchSteerSensitivity: 0.8,
} as const;

export const gameConfig = GAME_CONFIG;
