/**
 * useAudioSync — Hook for audio system synchronization.
 *
 * Provides reactive access to audio state from the AudioManager.
 * Used by UI components and audio-related systems.
 */

import { useEffect, useCallback, useRef } from 'react';
import { AudioManager } from '@/managers/AudioManager';

/* ─────────────────────────────────────────────
 * useAudioSync Hook
 * ───────────────────────────────────────────── */

export function useAudioSync() {
  const audioManagerRef = useRef<AudioManager | null>(null);

  useEffect(() => {
    audioManagerRef.current = AudioManager.getInstance();
    audioManagerRef.current.init();

    return () => {
      audioManagerRef.current?.dispose();
    };
  }, []);

  const playSound = useCallback((name: string, volume: number = 1) => {
    audioManagerRef.current?.playSound(name, volume);
  }, []);

  const playMusic = useCallback((name: string, volume: number = 0.5) => {
    audioManagerRef.current?.playMusic(name, volume);
  }, []);

  const stopMusic = useCallback(() => {
    audioManagerRef.current?.stopMusic();
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    audioManagerRef.current?.setMasterVolume(volume);
  }, []);

  const setSFXVolume = useCallback((volume: number) => {
    audioManagerRef.current?.setSFXVolume(volume);
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    audioManagerRef.current?.setMusicVolume(volume);
  }, []);

  const toggleMute = useCallback(() => {
    audioManagerRef.current?.toggleMute();
  }, []);

  return {
    playSound,
    playMusic,
    stopMusic,
    setMasterVolume,
    setSFXVolume,
    setMusicVolume,
    toggleMute,
  };
}

/* ─────────────────────────────────────────────
 * useEngineSound Hook
 * ───────────────────────────────────────────── */

export function useEngineSound() {
  const audioManagerRef = useRef<AudioManager | null>(null);

  useEffect(() => {
    audioManagerRef.current = AudioManager.getInstance();
  }, []);

  const updateEnginePitch = useCallback((speed: number, maxSpeed: number) => {
    const pitch = 0.5 + (speed / maxSpeed) * 0.5;
    audioManagerRef.current?.setEnginePitch(pitch);
  }, []);

  const updateEngineVolume = useCallback((speed: number) => {
    const volume = Math.min(1, speed / 50);
    audioManagerRef.current?.setEngineVolume(volume);
  }, []);

  return {
    updateEnginePitch,
    updateEngineVolume,
  };
}
