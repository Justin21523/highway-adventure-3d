// src/components/world/Environment.tsx

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PerformanceScaler } from '../../managers/PerformanceScaler';

export function Environment() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const timeRef = useRef(0.5);
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const geo = new THREE.BufferGeometry();
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rainGeoRef.current = geo;
  }, []);

  useFrame((state, delta) => {
    const tier = PerformanceScaler.getInstance().getTier();
    if (tier === 'low' || tier === 'medium') return;

    timeRef.current += delta * 0.04;
    const dayPhase = (Math.sin(timeRef.current) + 1) / 2;

    if (sunRef.current) {
      const angle = timeRef.current * 0.5;
      sunRef.current.position.set(Math.cos(angle) * 90, Math.sin(angle) * 70 + 10, Math.sin(angle) * 50);
      sunRef.current.intensity = dayPhase * 1.6;
      sunRef.current.color.setHSL(0.08, 0.7, 0.35 + dayPhase * 0.65);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.15 + dayPhase * 0.45;
      ambientRef.current.color.setHSL(0.6, 0.3, 0.2 + dayPhase * 0.6);
    }

    const fog = state.scene.fog as THREE.FogExp2;
    if (fog) {
      const nightColor = new THREE.Color('#030712');
      const dayColor = new THREE.Color('#bae6fd');
      fog.color.lerpColors(nightColor, dayColor, dayPhase);
      fog.density = THREE.MathUtils.lerp(0.028, 0.012, dayPhase);
    }
    if (state.scene.background instanceof THREE.Color) {
      const nightBg = new THREE.Color('#0b132b');
      const dayBg = new THREE.Color('#f8fafc');
      state.scene.background.lerpColors(nightBg, dayBg, dayPhase);
    }

    if (rainGeoRef.current) {
      const pos = rainGeoRef.current.getAttribute('position');
      for (let i = 0; i < pos.array.length; i += 3) {
        pos.array[i + 1] -= 30 * delta;
        if (pos.array[i + 1] < 0) {
          pos.array[i + 1] = 50;
          pos.array[i] = (Math.random() - 0.5) * 120;
          pos.array[i + 2] = (Math.random() - 0.5) * 120;
        }
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <>
      <directionalLight ref={sunRef} castShadow position={[0, 50, 0]} intensity={1.2} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <ambientLight ref={ambientRef} intensity={0.3} />
      {rainGeoRef.current && (
        <points geometry={rainGeoRef.current}>
          <pointsMaterial size={0.12} color="#94a3b8" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
      )}
    </>
  );
}