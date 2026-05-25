// src/managers/VFXManager.ts

import * as THREE from 'three';

type ParticleType = 'exhaust' | 'boost' | 'spark' | 'smoke';

interface ParticleConfig {
  lifetime: number;
  speed: number;
  spread: number;
  size: number;
  color: [number, number, number];
  gravity: number;
}

const PARTICLE_CONFIGS: Record<ParticleType, ParticleConfig> = {
  exhaust: { lifetime: 1.2, speed: 2.0, spread: 0.3, size: 0.4, color: [0.6, 0.6, 0.6], gravity: -0.5 },
  boost: { lifetime: 0.5, speed: 8.0, spread: 0.5, size: 0.6, color: [0.2, 0.6, 1.0], gravity: 0.2 },
  spark: { lifetime: 0.4, speed: 5.0, spread: 1.5, size: 0.15, color: [1.0, 0.8, 0.2], gravity: -4.0 },
  smoke: { lifetime: 2.5, speed: 1.0, spread: 0.8, size: 1.2, color: [0.4, 0.4, 0.4], gravity: -0.2 }
};

/**
 * VFXManager
 * High-performance particle system using object pooling and single BufferGeometry.
 * Generates procedural soft-particle texture via Canvas. Zero external asset dependency.
 */
export class VFXManager {
  private static instance: VFXManager | null = null;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  
  // Pool state (Fixed size: 1500 particles)
  private readonly MAX_PARTICLES = 1500;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array; // current life
  private maxLifetimes: Float32Array;
  private sizes: Float32Array;
  private colors: Float32Array; // RGB per particle
  private activeCount = 0;

  private constructor() {
    this.positions = new Float32Array(this.MAX_PARTICLES * 3);
    this.velocities = new Float32Array(this.MAX_PARTICLES * 3);
    this.lifetimes = new Float32Array(this.MAX_PARTICLES);
    this.maxLifetimes = new Float32Array(this.MAX_PARTICLES);
    this.sizes = new Float32Array(this.MAX_PARTICLES);
    this.colors = new Float32Array(this.MAX_PARTICLES * 3);
  }

  static getInstance(): VFXManager {
    if (!VFXManager.instance) VFXManager.instance = new VFXManager();
    return VFXManager.instance;
  }

  async init(): Promise<THREE.Points> {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAX_PARTICLES * 3), 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(this.MAX_PARTICLES), 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.MAX_PARTICLES * 3), 3));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(this.MAX_PARTICLES), 1));

    const texture = this.createProceduralTexture();
    this.material = new THREE.PointsMaterial({
      size: 0.5,
      map: texture,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.renderOrder = 10;
    return this.points;
  }

  private createProceduralTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  spawn(type: ParticleType, origin: { x: number; y: number; z: number }, intensity: number = 1.0, count: number = 5): void {
    if (!this.points) return;
    
    const config = PARTICLE_CONFIGS[type];
    const spawnCount = Math.min(count * Math.ceil(intensity), 15); // Cap per frame
    let spawned = 0;

    for (let i = 0; i < this.MAX_PARTICLES && spawned < spawnCount; i++) {
      if (this.lifetimes[i] > 0) continue; // Already active

      const idx3 = i * 3;
      this.positions[idx3] = origin.x + (Math.random() - 0.5) * config.spread;
      this.positions[idx3 + 1] = origin.y + (Math.random() - 0.5) * config.spread;
      this.positions[idx3 + 2] = origin.z + (Math.random() - 0.5) * config.spread;

      this.velocities[idx3] = (Math.random() - 0.5) * config.spread * config.speed * intensity;
      this.velocities[idx3 + 1] = (Math.random() * 0.5 + 0.5) * config.speed * intensity;
      this.velocities[idx3 + 2] = (Math.random() - 0.5) * config.spread * config.speed * intensity;

      this.lifetimes[i] = config.lifetime * (0.8 + Math.random() * 0.4);
      this.maxLifetimes[i] = this.lifetimes[i];
      this.sizes[i] = config.size * intensity;
      
      this.colors[idx3] = config.color[0];
      this.colors[idx3 + 1] = config.color[1];
      this.colors[idx3 + 2] = config.color[2];

      this.activeCount++;
      spawned++;
    }
  }

  update(delta: number): void {
    if (!this.geometry || this.activeCount === 0) return;

    let active = 0;
    const posAttr = this.geometry.getAttribute('position');
    const sizeAttr = this.geometry.getAttribute('size');
    const colorAttr = this.geometry.getAttribute('color');
    const alphaAttr = this.geometry.getAttribute('alpha');

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const idx3 = i * 3;
      if (this.lifetimes[i] > 0) {
        // Physics
        this.velocities[idx3 + 1] += PARTICLE_CONFIGS.exhaust.gravity * delta; // Use base gravity
        this.positions[idx3] += this.velocities[idx3] * delta;
        this.positions[idx3 + 1] += this.velocities[idx3 + 1] * delta;
        this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta;

        // Fade & Shrink
        const lifeRatio = this.lifetimes[i] / this.maxLifetimes[i];
        this.lifetimes[i] -= delta;
        if (this.lifetimes[i] <= 0) {
          this.sizes[i] = 0;
          this.lifetimes[i] = 0;
          continue;
        }

        this.sizes[i] = PARTICLE_CONFIGS.smoke.size * lifeRatio;
        alphaAttr.array[i] = lifeRatio * 0.9;
        posAttr.array[idx3] = this.positions[idx3];
        posAttr.array[idx3 + 1] = this.positions[idx3 + 1];
        posAttr.array[idx3 + 2] = this.positions[idx3 + 2];
        sizeAttr.array[i] = this.sizes[i];
        active++;
      } else {
        sizeAttr.array[i] = 0;
        alphaAttr.array[i] = 0;
      }
    }

    this.activeCount = active;
    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    VFXManager.instance = null;
  }
}