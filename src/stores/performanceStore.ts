/**
 * Performance state store.
 *
 * Manages real-time performance metrics, quality tier, and scalable
 * rendering settings. The PerformanceScaler singleton reads this store
 * to apply hardware-level adjustments and writes metrics back for UI display.
 */

import { create } from 'zustand';
import type { QualityLevel, PerformanceMetrics, QualityPreset } from '@/types/performance';
import { QUALITY_PRESETS, QUALITY_ORDER, getPresetForQuality } from '@/config/qualityPresets';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Shape of the performance store state */
interface PerformanceStoreState {
  /** Real-time performance metrics sampled every frame */
  metrics: PerformanceMetrics;

  /** Current quality tier */
  qualityTier: QualityLevel;

  /** Active quality preset (resolved from qualityTier) */
  settings: QualityPreset;

  /** Whether auto-scaling is enabled */
  autoScaleEnabled: boolean;

  /** Whether the user has manually overridden auto-scaling */
  manualOverride: boolean;

  /** FPS history for smoothing (last N samples) */
  fpsHistory: number[];
}

/** Shape of the performance store actions */
interface PerformanceStoreActions {
  /* ── Metrics ── */
  updateMetrics: (partialMetrics: Partial<PerformanceMetrics>) => void;
  setFps: (fps: number) => void;
  setDrawCalls: (drawCalls: number) => void;
  setTriangles: (triangles: number) => void;
  setActiveChunks: (count: number) => void;
  setActiveTrafficCars: (count: number) => void;
  setActiveParticles: (count: number) => void;

  /* ── Quality Tier ── */
  setQualityTier: (tier: QualityLevel) => void;
  upgradeQuality: () => void;
  downgradeQuality: () => void;
  cycleQuality: () => void;
  resetToDefault: () => void;

  /* ── Settings ── */
  setAutoScaleEnabled: (enabled: boolean) => void;
  toggleAutoScale: () => void;
  setManualOverride: (override: boolean) => void;
  getActivePreset: () => QualityPreset;

  /* ── Helpers ── */
  isLowPerformance: (threshold?: number) => boolean;
  getFpsAverage: (windowSize?: number) => number;
  resetPerformance: () => void;
}

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

/** Default metrics with zeroed-out values */
function createDefaultMetrics(): PerformanceMetrics {
  return {
    fps: 60,
    frameTime: 16.6,
    averageFps: 60,
    minFps: 60,
    maxFps: 60,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    activeChunks: 0,
    activeTrafficCars: 0,
    activeParticles: 0,
    qualityLevel: 'high' as QualityLevel,
    pixelRatio: 1,
    shadowsEnabled: true,
    postProcessingEnabled: true,
  };
}

/* ─────────────────────────────────────────────
 * Initial State
 * ───────────────────────────────────────────── */

const initialMetrics: PerformanceMetrics = createDefaultMetrics();
const initialPreset: QualityPreset = getPresetForQuality('high');

/* ─────────────────────────────────────────────
 * Store
 * ───────────────────────────────────────────── */

export const usePerformanceStore = create<PerformanceStoreState & PerformanceStoreActions>()((set, get) => ({
  /* ── State ── */
  metrics: initialMetrics,
  qualityTier: 'high',
  settings: initialPreset,
  autoScaleEnabled: true,
  manualOverride: false,
  fpsHistory: [60, 60, 60, 60, 60],

  /* ── Metrics Actions ── */

  updateMetrics: (partialMetrics) =>
    set((state) => {
      const newMetrics = { ...state.metrics, ...partialMetrics };
      const fps = newMetrics.fps || state.metrics.fps;

      // Update min/max FPS
      const newMin = Math.min(state.metrics.minFps, fps);
      const newMax = Math.max(state.metrics.maxFps, fps);

      // Update average FPS from history
      const newHistory = [...state.fpsHistory, fps].slice(-30);
      const avgFps = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;

      return {
        metrics: {
          ...newMetrics,
          averageFps: Math.round(avgFps),
          minFps: newMin,
          maxFps: newMax,
        },
        fpsHistory: newHistory,
      };
    }),

  setFps: (fps) =>
    set((state) => {
      const newMetrics = { ...state.metrics, fps };
      const newMin = Math.min(state.metrics.minFps, fps);
      const newMax = Math.max(state.metrics.maxFps, fps);
      const newHistory = [...state.fpsHistory, fps].slice(-30);
      const avgFps = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);

      return {
        metrics: { ...newMetrics, averageFps: avgFps, minFps: newMin, maxFps: newMax },
        fpsHistory: newHistory,
      };
    }),

  setDrawCalls: (drawCalls) => set((state) => ({ metrics: { ...state.metrics, drawCalls } })),
  setTriangles: (triangles) => set((state) => ({ metrics: { ...state.metrics, triangles } })),
  setActiveChunks: (count) => set((state) => ({ metrics: { ...state.metrics, activeChunks: count } })),
  setActiveTrafficCars: (count) => set((state) => ({ metrics: { ...state.metrics, activeTrafficCars: count } })),
  setActiveParticles: (count) => set((state) => ({ metrics: { ...state.metrics, activeParticles: count } })),

  /* ── Quality Tier Actions ── */

  setQualityTier: (tier) =>
    set((state) => {
      if (state.manualOverride && state.qualityTier === tier) return {};
      const preset = getPresetForQuality(tier);
      return {
        qualityTier: tier,
        settings: preset,
        metrics: { ...state.metrics, qualityLevel: tier, pixelRatio: preset.pixelRatio, shadowsEnabled: preset.shadowsEnabled, postProcessingEnabled: preset.postProcessingEnabled },
      };
    }),

  upgradeQuality: () =>
    set((state) => {
      const currentIdx = QUALITY_ORDER.indexOf(state.qualityTier);
      if (currentIdx >= QUALITY_ORDER.length - 1 || state.manualOverride) return {};
      const nextTier = QUALITY_ORDER[currentIdx + 1];
      const preset = getPresetForQuality(nextTier);
      return {
        qualityTier: nextTier,
        settings: preset,
        metrics: { ...state.metrics, qualityLevel: nextTier, pixelRatio: preset.pixelRatio, shadowsEnabled: preset.shadowsEnabled, postProcessingEnabled: preset.postProcessingEnabled },
      };
    }),

  downgradeQuality: () =>
    set((state) => {
      const currentIdx = QUALITY_ORDER.indexOf(state.qualityTier);
      if (currentIdx <= 0 || state.manualOverride) return {};
      const prevTier = QUALITY_ORDER[currentIdx - 1];
      const preset = getPresetForQuality(prevTier);
      return {
        qualityTier: prevTier,
        settings: preset,
        metrics: { ...state.metrics, qualityLevel: prevTier, pixelRatio: preset.pixelRatio, shadowsEnabled: preset.shadowsEnabled, postProcessingEnabled: preset.postProcessingEnabled },
      };
    }),

  cycleQuality: () =>
    set((state) => {
      const currentIdx = QUALITY_ORDER.indexOf(state.qualityTier);
      const nextTier = QUALITY_ORDER[(currentIdx + 1) % QUALITY_ORDER.length];
      const preset = getPresetForQuality(nextTier);
      return {
        qualityTier: nextTier,
        settings: preset,
        metrics: { ...state.metrics, qualityLevel: nextTier, pixelRatio: preset.pixelRatio, shadowsEnabled: preset.shadowsEnabled, postProcessingEnabled: preset.postProcessingEnabled },
      };
    }),

  resetToDefault: () =>
    set({
      qualityTier: 'high',
      settings: getPresetForQuality('high'),
      metrics: { ...createDefaultMetrics(), qualityLevel: 'high' },
      fpsHistory: [60, 60, 60, 60, 60],
      manualOverride: false,
    }),

  /* ── Settings Actions ── */

  setAutoScaleEnabled: (enabled) => set({ autoScaleEnabled: enabled }),
  toggleAutoScale: () => set((state) => ({ autoScaleEnabled: !state.autoScaleEnabled })),
  setManualOverride: (override) => set({ manualOverride: override }),

  getActivePreset: () => getPresetForQuality(get().qualityTier),

  /* ── Helper Actions ── */

  isLowPerformance: (threshold = 45) => get().metrics.fps < threshold,

  getFpsAverage: (windowSize = 10) => {
    const history = get().fpsHistory;
    const window = history.slice(-windowSize);
    return window.length > 0 ? Math.round(window.reduce((a, b) => a + b, 0) / window.length) : 60;
  },

  /* ── Reset ── */

  resetPerformance: () =>
    set({
      metrics: createDefaultMetrics(),
      qualityTier: 'high',
      settings: initialPreset,
      fpsHistory: [60, 60, 60, 60, 60],
      manualOverride: false,
    }),
}));
