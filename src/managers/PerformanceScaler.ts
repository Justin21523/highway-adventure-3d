// src/managers/PerformanceScaler.ts

import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { IPerformanceMetrics } from '../types/core';

export class PerformanceScaler {
  private static instance: PerformanceScaler | null = null;
  private frames = 0;
  private lastTime = 0;
  private fpsHistory: number[] = [];
  private readonly MAX_HISTORY = 24; // ~1 second smoothing at 24Hz polling
  private currentTier: 'low' | 'medium' | 'high' | 'ultra' = 'high';
  private renderer: THREE.WebGLRenderer | null = null;

  private constructor() {}

  static getInstance(): PerformanceScaler {
    if (!PerformanceScaler.instance) PerformanceScaler.instance = new PerformanceScaler();
    return PerformanceScaler.instance;
  }

  init(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.currentTier = 'high';
    this.lastTime = performance.now();
  }

  update() {
    if (!this.renderer) return;

    const now = performance.now();
    this.frames++;
    const delta = now - this.lastTime;

    if (delta >= 500) { // Poll every 500ms to prevent jitter
      const fps = Math.round((this.frames * 1000) / delta);
      this.frames = 0;
      this.lastTime = now;

      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.MAX_HISTORY) this.fpsHistory.shift();

      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      this.evaluateTier(avgFps);
      this.publishMetrics(avgFps);
    }
  }

  private evaluateTier(avgFps: number) {
    let newTier: 'low' | 'medium' | 'high' | 'ultra' = this.currentTier;

    if (avgFps >= 58 && this.currentTier !== 'ultra') newTier = 'ultra';
    else if (avgFps >= 52 && avgFps < 58) newTier = 'high';
    else if (avgFps >= 42 && avgFps < 52) newTier = 'medium';
    else if (avgFps < 42) newTier = 'low';

    if (newTier !== this.currentTier) {
      this.currentTier = newTier;
      this.applyHardwareSettings();
    }
  }

  private applyHardwareSettings() {
    if (!this.renderer) return;

    switch (this.currentTier) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        break;
      case 'medium':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = true;
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        break;
      case 'ultra':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        break;
    }
    this.renderer.shadowMap.needsUpdate = true;
  }

  private publishMetrics(avgFps: number) {
    const info = this.renderer!.info;
    const mem = (typeof performance !== 'undefined' && (performance as any).memory) 
      ? (performance as any).memory.usedJSHeapSize / 1048576 
      : 0;

    const metrics: Partial<IPerformanceMetrics> = {
      fps: Math.round(avgFps),
      frameTime: (1000 / avgFps) / 1000,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      memoryUsed: Math.round(mem),
      qualityTier: this.currentTier
    };
    useGameStore.getState().updatePerformanceMetrics(metrics);
  }

  getTier() { return this.currentTier; }
}