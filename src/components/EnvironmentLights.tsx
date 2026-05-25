/**
 * EnvironmentLights — Dynamic lighting for day/night cycle and weather.
 *
 * Manages ambient, directional, and hemisphere lights that change
 * based on time of day and weather conditions.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EnvironmentSystem } from '@/systems/EnvironmentSystem';
import { usePerformanceStore } from '@/stores/performanceStore';

/* ─────────────────────────────────────────────
 * EnvironmentLights Component
 * ───────────────────────────────────────────── */

export function EnvironmentLights() {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);

  // Reusable color objects
  const _skyColor = new THREE.Color();
  const _groundColor = new THREE.Color();

  useFrame(() => {
    const envSystem = EnvironmentSystem.getInstance();
    const quality = usePerformanceStore.getState().qualityTier;

    // Skip if quality is too low for dynamic lighting
    if (quality === 'low') {
      if (ambientRef.current) ambientRef.current.intensity = 0.3;
      if (directionalRef.current) directionalRef.current.intensity = 0.5;
      return;
    }

    const hour = envSystem.getCurrentHour();
    const weather = envSystem.getWeather();

    // Update ambient light
    if (ambientRef.current) {
      let ambientIntensity = 0.15;

      if (hour >= 6 && hour < 8) {
        ambientIntensity = 0.2 + ((hour - 6) / 2) * 0.2;
      } else if (hour >= 8 && hour < 17) {
        ambientIntensity = 0.4;
      } else if (hour >= 17 && hour < 19) {
        ambientIntensity = 0.4 - ((hour - 17) / 2) * 0.2;
      }

      // Weather affects ambient
      switch (weather) {
        case 'overcast': ambientIntensity *= 0.8; break;
        case 'fog': ambientIntensity *= 0.7; break;
        case 'rain': ambientIntensity *= 0.7; break;
      }

      ambientRef.current.intensity = ambientIntensity;
    }

    // Update directional light (sun/moon)
    if (directionalRef.current) {
      let sunIntensity = 0.1;

      if (hour >= 6 && hour < 8) {
        sunIntensity = 0.3 + ((hour - 6) / 2) * 0.5;
      } else if (hour >= 8 && hour < 17) {
        sunIntensity = 0.8;
      } else if (hour >= 17 && hour < 19) {
        sunIntensity = 0.8 - ((hour - 17) / 2) * 0.5;
      }

      // Weather affects sun
      switch (weather) {
        case 'overcast': sunIntensity *= 0.6; break;
        case 'fog': sunIntensity *= 0.5; break;
        case 'rain': sunIntensity *= 0.4; break;
      }

      directionalRef.current.intensity = sunIntensity;

      // Position sun based on time
      const sunAngle = ((hour - 6) / 12) * Math.PI;
      directionalRef.current.position.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 100,
        50,
      );

      // Street lights activate at night
      const isNight = hour < 6 || hour > 19;
      directionalRef.current.color.setHex(isNight ? 0x4488ff : 0xffffff);
    }

    // Update hemisphere light
    if (hemisphereRef.current) {
      const isDay = hour >= 6 && hour < 20;
      _skyColor.setHex(isDay ? 0x87ceeb : 0x1a1a2e);
      _groundColor.setHex(isDay ? 0x362d1b : 0x1a1a1a);
      hemisphereRef.current.color.copy(_skyColor);
      hemisphereRef.current.groundColor.copy(_groundColor);
    }
  });

  return (
    <>
      {/* Ambient light */}
      <ambientLight ref={ambientRef} intensity={0.3} color="#ffffff" />

      {/* Directional light (sun/moon) */}
      <directionalLight
        ref={directionalRef}
        intensity={0.6}
        position={[50, 100, 50]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      {/* Hemisphere light (sky/ground) */}
      <hemisphereLight
        ref={hemisphereRef}
        skyColor="#87ceeb"
        groundColor="#362d1b"
        intensity={0.3}
      />
    </>
  );
}
