/**
 * Quality presets for automatic and manual performance scaling.
 */
import type { QualityPreset, QualityLevel } from '@/types/performance';

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    level: 'low',
    pixelRatio: 0.75,
    shadowsEnabled: false,
    shadowMapSize: 512,
    postProcessingEnabled: false,
    bloomEnabled: false,
    maxParticles: 300,
    maxTrafficCars: 12,
    renderDistance: 3,
    fogEnabled: true,
    envMapEnabled: false,
    antiAliasing: false,
    textureQuality: 'low',
    geometryDetail: 'low',
    streetLightDistance: 80,
    decorationDensity: 0.3,
  },
  medium: {
    level: 'medium',
    pixelRatio: 1.0,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    postProcessingEnabled: true,
    bloomEnabled: false,
    maxParticles: 600,
    maxTrafficCars: 20,
    renderDistance: 4,
    fogEnabled: true,
    envMapEnabled: false,
    antiAliasing: true,
    textureQuality: 'medium',
    geometryDetail: 'medium',
    streetLightDistance: 120,
    decorationDensity: 0.5,
  },
  high: {
    level: 'high',
    pixelRatio: 1.0,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    postProcessingEnabled: true,
    bloomEnabled: true,
    maxParticles: 1000,
    maxTrafficCars: 30,
    renderDistance: 5,
    fogEnabled: true,
    envMapEnabled: true,
    antiAliasing: true,
    textureQuality: 'high',
    geometryDetail: 'high',
    streetLightDistance: 180,
    decorationDensity: 0.8,
  },
  ultra: {
    level: 'ultra',
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    shadowsEnabled: true,
    shadowMapSize: 4096,
    postProcessingEnabled: true,
    bloomEnabled: true,
    maxParticles: 1500,
    maxTrafficCars: 40,
    renderDistance: 6,
    fogEnabled: true,
    envMapEnabled: true,
    antiAliasing: true,
    textureQuality: 'high',
    geometryDetail: 'high',
    streetLightDistance: 250,
    decorationDensity: 1.0,
  },
};

export const qualityPresets = QUALITY_PRESETS;

export const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high', 'ultra'];

export function getNextQuality(current: QualityLevel): QualityLevel | null {
  const idx = QUALITY_ORDER.indexOf(current);
  if (idx < QUALITY_ORDER.length - 1) {
    return QUALITY_ORDER[idx + 1];
  }
  return null;
}

export function getPrevQuality(current: QualityLevel): QualityLevel | null {
  const idx = QUALITY_ORDER.indexOf(current);
  if (idx > 0) {
    return QUALITY_ORDER[idx - 1];
  }
  return null;
}

export function getPresetForQuality(level: QualityLevel): QualityPreset {
  return QUALITY_PRESETS[level];
}
