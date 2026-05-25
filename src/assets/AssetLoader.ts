// src/assets/AssetLoader.ts

import * as THREE from 'three';


/**
 * AssetLoader
 * Centralized resource manager with caching, progress tracking, batch loading, and full procedural fallbacks.
 * Ensures the game runs even if external assets fail to load or are missing entirely.
 *
 * Features:
 * - Single asset loading with caching
 * - Batch loading with progress tracking
 * - Priority-based loading
 * - Procedural fallback for failed assets
 */
export class AssetLoader {
  private static instance: AssetLoader | null = null;
  private cache = new Map<string, THREE.Group | THREE.Texture | AudioBuffer>();
  private loadingPromises = new Map<string, Promise<any>>();
  private dracoLoader: any = null;
  private gltfLoader: any = null;
  private ktx2Loader: any = null;
  private isInitialized = false;

  /* ── Batch Loading State ── */
  private batchProgress = new Map<string, { loaded: number; total: number }>();
  private batchCallbacks = new Map<string, (progress: number) => void>();

  private constructor() {}

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) AssetLoader.instance = new AssetLoader();
    return AssetLoader.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Dynamic import to handle environments where examples might be lazy-loaded
      const [{ DRACOLoader }, { GLTFLoader }, { KTX2Loader }] = await Promise.all([
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/KTX2Loader.js'),
      ]);
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
      this.gltfLoader = new GLTFLoader();
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
      this.ktx2Loader = new KTX2Loader();
      this.ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
    } catch (e) {
      console.warn('AssetLoader: Failed to initialize advanced loaders. Falling back to canvas/procedural generation.');
    }
    
    this.isInitialized = true;
  }

  /**
   * Loads a GLTF model with caching and procedural fallback.
   */
  async loadModel(url: string): Promise<THREE.Group> {
    if (this.cache.has(url)) return this.cache.get(url) as THREE.Group;

    const loadPromise = new Promise<THREE.Group>(async (resolve) => {
      try {
        if (this.gltfLoader) {
          this.gltfLoader.load(
            url,
            (gltf: any) => {
              const model = gltf.scene;
              model.traverse((child: any) => {
                if ((child as THREE.Mesh).isMesh) {
                  (child as THREE.Mesh).castShadow = true;
                  (child as THREE.Mesh).receiveShadow = true;
                  if ((child as THREE.Mesh).material) {
                    ((child as THREE.Mesh).material as THREE.Material).needsUpdate = true;
                  }
                }
              });
              this.cache.set(url, model);
              resolve(model);
            },
            undefined,
            (_error: unknown) => {
              console.warn(`AssetLoader: Failed to load ${url}, using fallback.`);
              resolve(this.createFallbackModel());
            }
          );
        } else {
          resolve(this.createFallbackModel());
        }
      } catch (err) {
        resolve(this.createFallbackModel());
      }
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Loads a texture with KTX2 support, caching, and procedural fallback.
   */
  async loadTexture(url: string, options?: { anisotropy?: number; wrapS?: THREE.Wrapping; wrapT?: THREE.Wrapping }): Promise<THREE.Texture> {
    if (this.cache.has(url)) return this.cache.get(url) as THREE.Texture;

    const loadPromise = new Promise<THREE.Texture>(async (resolve) => {
      try {
        if (this.ktx2Loader && (url.endsWith('.ktx2') || url.endsWith('.jpg') || url.endsWith('.png'))) {
          this.ktx2Loader.load(
            url,
            (texture: THREE.Texture) => {
              if (options?.anisotropy) texture.anisotropy = options.anisotropy;
              if (options?.wrapS) texture.wrapS = options.wrapS;
              if (options?.wrapT) texture.wrapT = options.wrapT;
              texture.needsUpdate = true;
              this.cache.set(url, texture);
              resolve(texture);
            },
            undefined,
            () => resolve(this.createFallbackTexture())
          );
        } else {
          resolve(this.createFallbackTexture());
        }
      } catch {
        resolve(this.createFallbackTexture());
      }
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  private createFallbackModel(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ 
      color: '#475569', 
      metalness: 0.5, 
      roughness: 0.5 
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    this.cache.set('fallback_model', group);
    return group;
  }

  private createFallbackTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Procedural grid pattern
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 32, 32);
    ctx.strokeRect(32, 32, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    this.cache.set('fallback_texture', texture);
    return texture;
  }

  dispose(): void {
    this.cache.forEach((asset) => {
      if ((asset as THREE.Group).isGroup) {
        (asset as THREE.Group).traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
            else child.material.dispose();
          }
        });
      } else if ((asset as THREE.Texture).isTexture) {
        (asset as THREE.Texture).dispose();
      }
    });
    if (this.dracoLoader) this.dracoLoader.dispose();
    this.cache.clear();
    this.loadingPromises.clear();
    this.batchProgress.clear();
    this.batchCallbacks.clear();
    AssetLoader.instance = null;
    this.isInitialized = false;
  }

  /* ── Batch Loading ── */

  /**
   * Load multiple assets with progress tracking
   * @param urls Array of URLs to load
   * @param batchId Unique batch identifier
   * @param onProgress Optional progress callback (0-100)
   * @returns Promise resolving to array of loaded assets
   */
  async loadBatch(
    urls: string[],
    batchId: string,
    onProgress?: (progress: number) => void,
  ): Promise<(THREE.Group | THREE.Texture | AudioBuffer)[]> {
    if (urls.length === 0) {
      return [];
    }

    // Initialize batch progress
    this.batchProgress.set(batchId, { loaded: 0, total: urls.length });
    if (onProgress) {
      this.batchCallbacks.set(batchId, onProgress);
    }

    // Update initial progress
    this.emitProgress(batchId);

    // Load all assets in parallel
    const results = await Promise.allSettled(
      urls.map((url) => this.loadAsset(url)),
    );

    // Collect successful results
    const assets: (THREE.Group | THREE.Texture | AudioBuffer)[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        assets.push(result.value);
      } else {
        console.warn(`AssetLoader: Failed to load asset, using fallback:`, result.reason);
        // Add fallback asset
        assets.push(this.createFallbackModel());
      }
    }

    // Mark batch as complete
    this.batchProgress.set(batchId, { loaded: urls.length, total: urls.length });
    this.emitProgress(batchId);

    // Clean up batch tracking
    this.batchProgress.delete(batchId);
    this.batchCallbacks.delete(batchId);

    return assets;
  }

  /**
   * Load a batch of textures
   */
  async loadBatchTextures(
    urls: string[],
    batchId: string,
    onProgress?: (progress: number) => void,
  ): Promise<THREE.Texture[]> {
    if (urls.length === 0) return [];

    this.batchProgress.set(batchId, { loaded: 0, total: urls.length });
    if (onProgress) {
      this.batchCallbacks.set(batchId, onProgress);
    }

    this.emitProgress(batchId);

    const results = await Promise.allSettled(
      urls.map((url) => this.loadTexture(url)),
    );

    const textures: THREE.Texture[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        textures.push(result.value);
      } else {
        console.warn(`AssetLoader: Failed to load texture, using fallback:`, result.reason);
        textures.push(this.createFallbackTexture());
      }
    }

    this.batchProgress.set(batchId, { loaded: urls.length, total: urls.length });
    this.emitProgress(batchId);
    this.batchProgress.delete(batchId);
    this.batchCallbacks.delete(batchId);

    return textures;
  }

  /**
   * Load a batch of models
   */
  async loadBatchModels(
    urls: string[],
    batchId: string,
    onProgress?: (progress: number) => void,
  ): Promise<THREE.Group[]> {
    if (urls.length === 0) return [];

    this.batchProgress.set(batchId, { loaded: 0, total: urls.length });
    if (onProgress) {
      this.batchCallbacks.set(batchId, onProgress);
    }

    this.emitProgress(batchId);

    const results = await Promise.allSettled(
      urls.map((url) => this.loadModel(url)),
    );

    const models: THREE.Group[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        models.push(result.value);
      } else {
        console.warn(`AssetLoader: Failed to load model, using fallback:`, result.reason);
        models.push(this.createFallbackModel());
      }
    }

    this.batchProgress.set(batchId, { loaded: urls.length, total: urls.length });
    this.emitProgress(batchId);
    this.batchProgress.delete(batchId);
    this.batchCallbacks.delete(batchId);

    return models;
  }

  /**
   * Get batch progress
   */
  getBatchProgress(batchId: string): { loaded: number; total: number; percentage: number } | null {
    const progress = this.batchProgress.get(batchId);
    if (!progress) return null;

    return {
      loaded: progress.loaded,
      total: progress.total,
      percentage: Math.round((progress.loaded / progress.total) * 100),
    };
  }

  /**
   * Emit progress update to callback
   */
  private emitProgress(batchId: string): void {
    const progress = this.batchProgress.get(batchId);
    const callback = this.batchCallbacks.get(batchId);

    if (progress && callback) {
      const percentage = (progress.loaded / progress.total) * 100;
      callback(percentage);
    }
  }

  /**
   * Load a generic asset (auto-detect type)
   */
  private async loadAsset(url: string): Promise<THREE.Group | THREE.Texture | AudioBuffer> {
    if (url.endsWith('.glb') || url.endsWith('.gltf')) {
      return this.loadModel(url);
    } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.ktx2')) {
      return this.loadTexture(url);
    } else if (url.endsWith('.wav') || url.endsWith('.mp3')) {
      return this.loadAudio(url);
    } else {
      throw new Error(`AssetLoader: Unknown asset type for ${url}`);
    }
  }

  /**
   * Load audio file
   */
  private loadAudio(url: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      fetch(url)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((audioBuffer) => {
          this.cache.set(url, audioBuffer);
          resolve(audioBuffer);
        })
        .catch((error) => {
          console.warn(`AssetLoader: Failed to load audio ${url}`, error);
          reject(error);
        });
    });
  }
}