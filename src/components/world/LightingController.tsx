// src/components/world/LightingController.tsx
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WeatherSystem } from '../../managers/WeatherSystem';
import { PerformanceScaler } from '../../managers/PerformanceScaler';

/**
 * LightingController
 * Dynamic day/night cycle with smooth transitions, weather-aware lighting,
 * and performance-adaptive shadow quality.
 * Integrates with WeatherSystem for cohesive environmental changes.
 */
export function LightingController() {
  const { scene } = useThree();
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const timeRef = useRef(0.25); // Start at dawn (0=midnight, 0.25=6am, 0.5=noon)
  
  // Pre-compute color gradients for smooth transitions
  const colors = {
    sky: {
      night: new THREE.Color('#020617'),
      dawn: new THREE.Color('#1e3a8a'),
      day: new THREE.Color('#bae6fd'),
      dusk: new THREE.Color('#7c2d12'),
      storm: new THREE.Color('#1e293b')
    },
    fog: {
      night: new THREE.Color('#030712'),
      dawn: new THREE.Color('#1e3a5f'),
      day: new THREE.Color('#e2e8f0'),
      dusk: new THREE.Color('#451a03'),
      storm: new THREE.Color('#0f172a')
    },
    ambient: {
      night: new THREE.Color('#1e293b'),
      dawn: new THREE.Color('#334155'),
      day: new THREE.Color('#f1f5f9'),
      dusk: new THREE.Color('#78350f'),
      storm: new THREE.Color('#334155')
    }
  };

  useEffect(() => {
    // Initial setup
    if (sunRef.current) {
      sunRef.current.castShadow = true;
      sunRef.current.shadow.mapSize.set(1024, 1024);
      sunRef.current.shadow.camera.near = 0.5;
      sunRef.current.shadow.camera.far = 200;
      sunRef.current.shadow.camera.left = -50;
      sunRef.current.shadow.camera.right = 50;
      sunRef.current.shadow.camera.top = 50;
      sunRef.current.shadow.camera.bottom = -50;
    }
  }, []);

  useFrame((_, delta) => {
    const weather = WeatherSystem.getInstance();
    const tier = PerformanceScaler.getInstance().getTier();
    
    // Advance time (1 real minute = 1 full day cycle)
    timeRef.current = (timeRef.current + delta * 0.001) % 1;
    
    // Determine time of day phase
    const phase = timeRef.current;
    const isNight = phase < 0.2 || phase > 0.8;
    const isDawn = phase >= 0.2 && phase < 0.35;
    const isDay = phase >= 0.35 && phase < 0.65;
    const isDusk = phase >= 0.65 && phase <= 0.8;
    
    // Interpolate colors based on phase
    let skyColor, fogColor, ambientColor;
    if (isNight) {
      skyColor = colors.sky.night;
      fogColor = colors.fog.night;
      ambientColor = colors.ambient.night;
    } else if (isDawn) {
      const t = (phase - 0.2) / 0.15;
      skyColor = colors.sky.night.clone().lerp(colors.sky.dawn, t);
      fogColor = colors.fog.night.clone().lerp(colors.fog.dawn, t);
      ambientColor = colors.ambient.night.clone().lerp(colors.ambient.dawn, t);
    } else if (isDay) {
      const t = phase >= 0.5 ? (phase - 0.5) / 0.15 : 1 - (0.5 - phase) / 0.15;
      skyColor = colors.sky.dawn.clone().lerp(colors.sky.day, t);
      fogColor = colors.fog.dawn.clone().lerp(colors.fog.day, t);
      ambientColor = colors.ambient.dawn.clone().lerp(colors.ambient.day, t);
    } else { // Dusk
      const t = (phase - 0.65) / 0.15;
      skyColor = colors.sky.day.clone().lerp(colors.sky.dusk, t);
      fogColor = colors.fog.day.clone().lerp(colors.fog.dusk, t);
      ambientColor = colors.ambient.day.clone().lerp(colors.ambient.dusk, t);
    }
    
    // Apply weather overlay
    const weatherState = weather.getWeatherState?.() || 'clear';
    if (weatherState === 'storm' || weatherState === 'rain') {
      skyColor.lerp(colors.sky.storm, 0.3);
      fogColor.lerp(colors.fog.storm, 0.4);
      ambientColor.lerp(colors.ambient.storm, 0.5);
    }
    
    // Update lights
    if (ambientRef.current) {
      ambientRef.current.color.copy(ambientColor);
      ambientRef.current.intensity = isNight ? 0.15 : isDay ? 0.4 : 0.25;
    }
    
    if (sunRef.current) {
      // Sun position: circular arc based on time
      const sunAngle = phase * Math.PI * 2 - Math.PI / 2;
      const sunHeight = Math.sin(sunAngle);
      const sunDist = 80;
      
      sunRef.current.position.set(
        Math.cos(sunAngle) * sunDist,
        Math.max(10, sunHeight * 60),
        Math.sin(sunAngle) * sunDist * 0.3
      );
      
      // Sun intensity and color
      const sunIntensity = Math.max(0, sunHeight) * 1.5;
      sunRef.current.intensity = THREE.MathUtils.lerp(
        sunRef.current.intensity, 
        sunIntensity * (weatherState === 'storm' ? 0.4 : 1), 
        0.02
      );
      
      // Shadow quality based on performance tier
      const shadowSize = tier === 'ultra' ? 2048 : tier === 'high' ? 1024 : 512;
      if (sunRef.current.shadow.mapSize.x !== shadowSize) {
        sunRef.current.shadow.mapSize.set(shadowSize, shadowSize);
        sunRef.current.shadow.needsUpdate = true;
      }
    }
    
    // Update scene background and fog
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(skyColor, 0.02);
    } else {
      scene.background = skyColor.clone();
    }
    const fog = scene.fog as THREE.FogExp2;
    if (fog) {
      fog.color.lerp(fogColor, 0.02);
      // Denser fog at night and during storms
      const baseDensity = 0.015;
      const nightBonus = isNight ? 0.008 : 0;
      const weatherBonus = weatherState === 'storm' ? 0.01 : weatherState === 'rain' ? 0.005 : 0;
      fog.density = THREE.MathUtils.lerp(
        fog.density,
        baseDensity + nightBonus + weatherBonus,
        0.02
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.3} />
      <directionalLight 
        ref={sunRef} 
        position={[0, 50, 0]} 
        intensity={1.2}
        color="#fef3c7"
        castShadow
      />
      <hemisphereLight 
        ref={hemiRef}
        args={['#bae6fd', '#1e293b', 0.3]}
      />
    </>
  );
}
