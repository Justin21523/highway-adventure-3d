// src/components/world/PostProcessing.tsx
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PerformanceScaler } from '../../managers/PerformanceScaler';

const POST_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const POST_FRAGMENT = `
  uniform sampler2D tDiffuse;
  uniform float vignetteIntensity;
  uniform float noiseIntensity;
  uniform float time;
  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    
    vec2 uv = vUv * (1.0 - vUv.yx);
    float vig = clamp(uv.x * uv.y * 15.0, 0.0, 1.0);
    color.rgb *= mix(0.3, 1.0, vig);

    float noise = rand(vUv + time * 0.5) - 0.5;
    color.rgb += noise * noiseIntensity;

    gl_FragColor = color;
  }
`;

export function PostProcessing() {
  const { gl, scene, camera, size } = useThree();
  const targetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const quadRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    targetRef.current = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: POST_VERTEX,
      fragmentShader: POST_FRAGMENT,
      uniforms: {
        tDiffuse: { value: null },
        vignetteIntensity: { value: 0.0 },
        noiseIntensity: { value: 0.0 },
        time: { value: 0 }
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending
    });

    quadRef.current = new THREE.Mesh(geo, mat);
    quadRef.current.position.set(0, 0, -1);
    quadRef.current.renderOrder = 9999;
    matRef.current = mat;
  }, [size]);

  useEffect(() => {
    const handleResize = () => {
      if (targetRef.current) targetRef.current.setSize(size.width, size.height);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  useFrame((_, delta) => {
    if (!targetRef.current || !quadRef.current || !matRef.current) return;
    
    const tier = PerformanceScaler.getInstance().getTier();
    if (tier === 'low') return;

    const vigTarget = tier === 'medium' ? 0.2 : 0.6;
    const noiseTarget = tier === 'medium' ? 0.005 : 0.015;

    matRef.current.uniforms.vignetteIntensity.value = THREE.MathUtils.lerp(
      matRef.current.uniforms.vignetteIntensity.value, vigTarget, 0.05
    );
    matRef.current.uniforms.noiseIntensity.value = THREE.MathUtils.lerp(
      matRef.current.uniforms.noiseIntensity.value, noiseTarget, 0.05
    );
    matRef.current.uniforms.time.value += delta;

    gl.setRenderTarget(targetRef.current);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    matRef.current.uniforms.tDiffuse.value = targetRef.current.texture;
    const prevClear = gl.autoClear;
    gl.autoClear = false;
    gl.render(quadRef.current, camera);
    gl.autoClear = prevClear;
  }, 1);

  return null;
}