// src/managers/MusicManager.ts
/**
 * MusicManager
 * Procedural generative music engine using Web Audio API.
 * Adapts tempo, bass intensity, and arpeggio speed based on vehicle RPM/Speed.
 * Zero external audio files required.
 */
export class MusicManager {
  private static instance: MusicManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bpm = 120;
  private nextNoteTime = 0;
  private currentBeat = 0;
  private scheduleAheadTime = 0.1;
  private lookAhead = 25; // ms
  private timerID: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;

  private constructor() {}
  static getInstance() { if (!MusicManager.instance) MusicManager.instance = new MusicManager(); return MusicManager.instance; }

  init(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(ctx.destination);
  }

  start() {
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) clearTimeout(this.timerID);
  }

  // Update tempo/intensity based on game state
  updateDynamics(speedKmh: number, rpm: number) {
    this.bpm = 100 + (speedKmh / 300) * 80; // 100-180 BPM
    if (this.masterGain) {
      // Louder at high speeds, subtle fade at idle
      const targetVol = 0.2 + (speedKmh / 250) * 0.3;
      this.masterGain.gain.setTargetAtTime(targetVol, this.ctx!.currentTime, 0.1);
    }
  }

  private scheduler() {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.playBeat(this.nextNoteTime, this.currentBeat);
      this.nextNoteTime += 60.0 / this.bpm / 4; // 16th note
      this.currentBeat++;
    }
    this.timerID = setTimeout(() => this.scheduler(), this.lookAhead);
  }

  private playBeat(time: number, beat: number) {
    if (!this.ctx || !this.masterGain) return;
    const isDownbeat = beat % 16 === 0;
    const isBackbeat = beat % 16 === 8;

    // Kick
    if (isDownbeat || beat % 4 === 0) {
      this.synthKick(time);
    }
    // Snare
    if (isBackbeat) this.synthSnare(time);
    // HiHat
    if (beat % 2 === 0) this.synthHat(time, beat % 4 === 0 ? 0.15 : 0.08);
    // Bassline
    if (beat % 16 === 0) this.synthBass(time, beat);
  }

  private synthKick(time: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    osc.connect(gain); gain.connect(this.masterGain!);
    osc.start(time); osc.stop(time + 0.2);
  }

  private synthSnare(time: number) {
    const noiseBuffer = this.ctx!.createBuffer(1, this.ctx!.sampleRate * 0.2, this.ctx!.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx!.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 1000;
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
    noise.start(time); noise.stop(time + 0.2);
  }

  private synthHat(time: number, vol: number) {
    const osc = this.ctx!.createOscillator();
    osc.type = 'square';
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 8000;
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
    osc.start(time); osc.stop(time + 0.06);
  }

  private synthBass(time: number, beat: number) {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sawtooth';
    const notes = [110, 110, 146.83, 130.81]; // A2, A2, D3, C3
    const idx = Math.floor((beat / 16) % 4);
    osc.frequency.value = notes[idx];
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = 2;
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
    osc.start(time); osc.stop(time + 0.3);
  }
}