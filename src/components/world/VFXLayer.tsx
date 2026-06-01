/**
 * VFXLayer — mounts the global particle system (VFXManager) into the scene.
 *
 * VFXManager.spawn() (sparks, smoke, exhaust, boost) writes into a single
 * THREE.Points buffer, but that buffer was never added to the scene nor ticked,
 * so every spawn was silent. This component adds the points mesh once and advances
 * the simulation each frame, making collision sparks / drift smoke actually visible.
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VFXManager } from '../../managers/VFXManager';

export function VFXLayer() {
  const groupRef = useRef<THREE.Group>(null);
  const [points, setPoints] = useState<THREE.Points | null>(null);

  useEffect(() => {
    let mounted = true;
    VFXManager.getInstance().init().then((p) => {
      if (!mounted) return;
      p.frustumCulled = false; // particles live at arbitrary world positions
      setPoints(p);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const g = groupRef.current;
    if (points && g) {
      g.add(points);
      return () => { g.remove(points); };
    }
  }, [points]);

  useFrame((_, delta) => {
    VFXManager.getInstance().update(delta);
  });

  return <group ref={groupRef} />;
}
