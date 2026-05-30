/**
 * Performance monitoring and quality scaling types.
 */

/** Quality tier for automatic performance scaling */
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';
export type QualityTier = QualityLevel;

/** Real-time performance metrics sampled each frame */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  activeChunks: number;
  activeTrafficCars: number;
  activeParticles: number;
  qualityLevel: QualityLevel;
  pixelRatio: number;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
}

/** Scalable rendering setting that changes per quality level */
export interface ScalableSetting {
  low: number | boolean;
  medium: number | boolean;
  high: number | boolean;
  ultra: number | boolean;
}

/** Complete quality preset defining all scalable parameters */
export interface QualityPreset {
  level: QualityLevel;
  pixelRatio: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
  maxParticles: number;
  maxTrafficCars: number;
  renderDistance: number;
  fogEnabled: boolean;
  envMapEnabled: boolean;
  antiAliasing: boolean;
  textureQuality: 'low' | 'medium' | 'high';
  geometryDetail: 'low' | 'medium' | 'high';
  streetLightDistance: number;
  decorationDensity: number;
}

/** Performance scaler configuration */
export interface PerformanceConfig {
  targetFps: number;
  downgradeThreshold: number;
  upgradeThreshold: number;
  sampleInterval: number;
  sampleWindow: number;
  minQualityLevel: QualityLevel;
  maxQualityLevel: QualityLevel;
  autoScale: boolean;
}

export interface PerformanceSettings {
  qualityLevel: QualityLevel;
  autoScale: boolean;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
  pixelRatio: number;
}

/** WebGL capability detection result */
export interface WebGLCapabilities {
  webgl2: boolean;
  maxTextureSize: number;
  maxViewportWidth: number;
  maxViewportHeight: number;
  maxAnisotropy: number;
  floatTextures: boolean;
  instancing: boolean;
  drawBuffers: boolean;
  devicePixelRatio: number;
  isMobile: boolean;
  gpu: string;
  recommendedQuality: QualityLevel;
}
