// src/components/world/PostProcessingPipeline.tsx
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PerformanceScaler } from '../../managers/PerformanceScaler';

/**
 * PostProcessingPipeline
 * Lightweight custom shader post-processing (Bloom + Vignette + Film Grain).
 * Dynamically disables effects based on PerformanceScaler tier to maintain FPS.
 * Uses a single full-screen quad to minimize draw calls.
 */
export function PostProcessingPipeline() {
  const { gl, scene, camera, size } = useThree();
  const targetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const quadRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    // Off-screen render target
    targetRef.current = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    // Screen quad
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uBloomStrength;
        uniform float uVignetteIntensity;
        uniform float uGrainIntensity;
        varying vec2 vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Simple bloom approximation (blur + add)
          vec4 bloom = vec4(0.0);
          float sampleDist = 0.003;
          for(int i = -2; i <= 2; i++) {
            for(int j = -2; j <= 2; j++) {
              vec2 offset = vec2(float(i), float(j)) * sampleDist;
              bloom += texture2D(tDiffuse, vUv + offset);
            }
          }
          bloom /= 25.0;
          color.rgb += bloom.rgb * uBloomStrength;
          
          // Vignette
          vec2 vig = vUv * (1.0 - vUv.yx);
          float vigFactor = vig.x * vig.y * 15.0;
          color.rgb *= mix(0.4, 1.0, clamp(vigFactor * uVignetteIntensity, 0.0, 1.0));
          
          // Film Grain
          float grain = hash(vUv * uTime * 100.0) - 0.5;
          color.rgb += grain * uGrainIntensity;
          
          gl_FragColor = color;
        }
      `,
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uBloomStrength: { value: 0.8 },
        uVignetteIntensity: { value: 1.0 },
        uGrainIntensity: { value: 0.04 }
      },
      depthTest: false,
      depthWrite: false
    });

    quadRef.current = new THREE.Mesh(geo, mat);
    quadRef.current.position.z = -1;
    quadRef.current.renderOrder = 9999;
    matRef.current = mat;
  }, []);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      if (targetRef.current) targetRef.current.setSize(size.width, size.height);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useFrame((_, delta) => {
    if (!targetRef.current || !quadRef.current || !matRef.current) return;
    
    const tier = PerformanceScaler.getInstance().getTier();
    // Auto-disable heavy effects on low tier
    matRef.current.uniforms.uBloomStrength.value = tier === 'low' ? 0 : 0.8;
    matRef.current.uniforms.uGrainIntensity.value = tier === 'low' ? 0 : 0.04;
    matRef.current.uniforms.uTime.value += delta;

    // Render scene to target
    gl.setRenderTarget(targetRef.current);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    // Apply post-process to screen
    matRef.current.uniforms.tDiffuse.value = targetRef.current.texture;
    const prevClear = gl.autoClear;
    gl.autoClear = false;
    gl.render(quadRef.current, camera);
    gl.autoClear = prevClear;
  }, 1);

  return null;
}