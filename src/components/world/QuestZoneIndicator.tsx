// src/components/world/QuestZoneIndicator.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

/**
 * QuestZoneIndicator
 * Visual marker for quest objective locations.
 * Renders a floating beacon with pulse animation and distance label.
 * Only visible when quest is active and objective has location data.
 */
export function QuestZoneIndicator() {
  const beaconRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Mesh>(null);
  
  // Shared resources
  const shared = useMemo(() => {
    const beaconGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
    const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 24);
    const labelGeo = new THREE.PlaneGeometry(3, 0.8);
    
    const beaconMat = new THREE.MeshStandardMaterial({ 
      color: '#22c55e', 
      emissive: '#22c55e', 
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: '#22c55e', 
      transparent: true, 
      opacity: 0.7 
    });
    const labelMat = new THREE.MeshBasicMaterial({ 
      color: '#1e293b', 
      side: THREE.DoubleSide 
    });
    
    return { beaconGeo, ringGeo, labelGeo, beaconMat, ringMat, labelMat };
  }, []);
  
  useFrame((state) => {
    const { activeQuest, playerPosition } = useGameStore.getState();
    
    if (!activeQuest || activeQuest.status !== 'active' || !beaconRef.current) {
      if (beaconRef.current) beaconRef.current.visible = false;
      return;
    }
    
    // Find location-based objective
    const locationObj = activeQuest.objectives.find(o => o.type === 'reachLocation' && o.location);
    if (!locationObj || !locationObj.location) {
      beaconRef.current.visible = false;
      return;
    }
    
    // Position beacon at objective
    beaconRef.current.position.set(
      locationObj.location.x,
      locationObj.location.y || 0.5,
      locationObj.location.z
    );
    beaconRef.current.visible = true;
    
    // Pulse animation for beacon
    const time = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(time * 3) * 0.15;
    beaconRef.current.scale.set(pulse, pulse, pulse);
    
    // Rotate ring
    const ring = beaconRef.current.children.find(c => (c as THREE.Mesh).geometry?.type === 'TorusGeometry') as THREE.Mesh;
    if (ring) {
      ring.rotation.x = time * 0.5;
      ring.rotation.y = time * 0.3;
      // ✅ Handle both single material and material array
      const mat = ring.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => { if ('opacity' in m) m.opacity = 0.5 + Math.sin(time * 2) * 0.2; });
      } else if ('opacity' in mat) {
        mat.opacity = 0.5 + Math.sin(time * 2) * 0.2;
      }
    }
    
    // Billboard label to face camera
    if (labelRef.current && state.camera) {
      labelRef.current.lookAt(state.camera.position);
      
      // Update distance text (simplified - in production use canvas texture)
      const dist = Math.sqrt(
        Math.pow(playerPosition.x - locationObj.location.x, 2) +
        Math.pow(playerPosition.z - locationObj.location.z, 2)
      );
      // Text would be rendered via sprite or canvas texture here
    }
    
    // Cull when very close (objective reached)
    const playerDist = Math.sqrt(
      Math.pow(playerPosition.x - locationObj.location.x, 2) +
      Math.pow(playerPosition.z - locationObj.location.z, 2)
    );
    if (playerDist < (locationObj.radius || 15)) {
      beaconRef.current.visible = false;
    }
  });
  
  return (
    <group ref={beaconRef} visible={false}>
      {/* Main beacon */}
      <mesh geometry={shared.beaconGeo} material={shared.beaconMat} position={[0, 1, 0]} castShadow />
      
      {/* Rotating ring */}
      <mesh geometry={shared.ringGeo} material={shared.ringMat} position={[0, 1, 0]} />
      
      {/* Ground marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.5, 2, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.4} />
      </mesh>
      
      {/* Distance label (placeholder - use sprite in production) */}
      <mesh ref={labelRef} position={[0, 3, 0]} geometry={shared.labelGeo} material={shared.labelMat}>
        {/* Text would be rendered via canvas texture */}
      </mesh>
      
      {/* Light for visibility at night */}
      <pointLight color="#22c55e" intensity={2} distance={15} decay={2} />
    </group>
  );
}