// src/managers/AudioManager.ts

/**
 * AudioManager handles all spatial and global audio.
 * FALLBACK STRATEGY: Since external audio assets (.mp3/.wav) are not guaranteed 
 * in the early stages or may fail to load, this manager includes a FULL PROCEDURAL 
 * SYNTHESIS fallback using Web Audio API to generate engine drones, wind noise, 
 * and impact sounds dynamically.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Engine Synth Nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineDistortion: WaveShaperNode | null = null;

  // Wind Noise Nodes
  private windNoiseBuffer: AudioBuffer | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error("Web Audio API not supported");
      
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);

      this.setupEngineSynth();
      this.setupWindNoise();
      
      this.windNoiseBuffer = this.createWhiteNoiseBuffer();
      this.isInitialized = true;
    } catch (e) {
      console.error("AudioManager: Initialization failed.", e);
    }
  }

  private createWhiteNoiseBuffer(): AudioBuffer {
    const ctx = this.audioContext!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private setupEngineSynth(): void {
    const ctx = this.audioContext!;
    
    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 80;

    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 40;

    this.engineDistortion = ctx.createWaveShaper();
    this.engineDistortion.curve = this.makeDistortionCurve(400);
    this.engineDistortion.oversample = '4x';

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 300;
    this.engineFilter.Q.value = 5;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1.connect(this.engineDistortion);
    this.engineOsc2.connect(this.engineDistortion);
    this.engineDistortion.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain!);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  private setupWindNoise(): void {
    const ctx = this.audioContext!;
    
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 1000;
    this.windFilter.Q.value = 0.5;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;

    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain!);
  }

  // --- Public API ---

  public resumeContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Updates engine sound based on normalized RPM and Throttle.
   * MUST be called inside R3F's useFrame to prevent audio tearing.
   */
  public updateEngineSound(rpmNorm: number, throttle: number): void {
    if (!this.isInitialized || !this.audioContext || !this.engineOsc1 || !this.engineOsc2) return;

    const baseFreq = 40 + rpmNorm * 160; 
    const harmonicFreq = baseFreq * 2;
    
    this.engineOsc1.frequency.setTargetAtTime(harmonicFreq, this.audioContext.currentTime, 0.01);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq, this.audioContext.currentTime, 0.01);

    const cutoff = 200 + rpmNorm * 2500 + throttle * 1000;
    this.engineFilter!.frequency.setTargetAtTime(cutoff, this.audioContext.currentTime, 0.05);

    const vol = 0.1 + throttle * 0.4 + rpmNorm * 0.3;
    this.engineGain!.gain.setTargetAtTime(Math.min(vol, 0.8), this.audioContext.currentTime, 0.05);
  }

  public startWindNoise(): void {
    if (!this.isInitialized || !this.audioContext || !this.windNoiseBuffer || this.windSource) return;
    
    this.windSource = this.audioContext.createBufferSource();
    this.windSource.buffer = this.windNoiseBuffer;
    this.windSource.loop = true;
    this.windSource.connect(this.windFilter!);
    this.windSource.start();
  }

  public updateWindNoise(speedKmh: number): void {
    if (!this.isInitialized || !this.audioContext) return;
    
    const maxSpeed = 250;
    const normSpeed = Math.min(speedKmh / maxSpeed, 1.0);
    
    const vol = normSpeed * 0.5;
    this.windGain!.gain.setTargetAtTime(vol, this.audioContext.currentTime, 0.1);
    
    const freq = 500 + normSpeed * 2000;
    this.windFilter!.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.1);
  }

  public playImpact(intensity: number = 1.0): void {
    if (!this.isInitialized || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150 * intensity, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.8 * intensity, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  public dispose(): void {
    if (this.engineOsc1) this.engineOsc1.stop();
    if (this.engineOsc2) this.engineOsc2.stop();
    if (this.windSource) this.windSource.stop();
    if (this.audioContext) this.audioContext.close();
    AudioManager.instance = null;
    this.isInitialized = false;
  }
}
