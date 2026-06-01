// src/components/world/NPCQuestGiver.tsx
import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { QuestChunkManager } from '../../managers/QuestChunkManager';

/**
 * NPCQuestGiver
 * Interactive NPC entity that offers quests to players.
 * Features: proximity detection, nameplate billboard, quest indicator,
 * and interaction trigger zone.
 */
export function NPCQuestGiver({ 
  position, 
  chunkId, 
  npcId,
  roadType 
}: { 
  position: THREE.Vector3; 
  chunkId: string;
  npcId: string;
  roadType: 'highway' | 'city';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const triggerRef = useRef<THREE.Mesh>(null);
  const nameplateRef = useRef<THREE.Mesh>(null);
  
  const [showInteractionPrompt, setShowInteractionPrompt] = useState(false);
  const questManager = useMemo(() => QuestChunkManager.getInstance(), []);
  
  // Shared geometry/materials
  const shared = useMemo(() => {
    return {
      bodyGeo: new THREE.CylinderGeometry(0.35, 0.3, 1.1, 8),
      headGeo: new THREE.SphereGeometry(0.32, 8, 6),
      triggerGeo: new THREE.CylinderGeometry(7, 7, 0.1, 16),
      nameplateGeo: new THREE.PlaneGeometry(2.2, 0.6),
      
      bodyMat: new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.3, roughness: 0.7 }),
      headMat: new THREE.MeshStandardMaterial({ color: '#fcd34d', metalness: 0.2, roughness: 0.5 }),
      triggerMat: new THREE.MeshBasicMaterial({ color: '#22c55e', transparent: true, opacity: 0.12 }),
      nameplateMat: new THREE.MeshBasicMaterial({ color: '#1e293b', side: THREE.DoubleSide })
    };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const { playerPosition, gameMode } = useGameStore.getState();
    const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    const dist = playerPos.distanceTo(position);
    
    // Show/hide interaction prompt based on distance
    const wasNear = showInteractionPrompt;
    const isNear = dist < 7 && gameMode === 'playing';
    setShowInteractionPrompt(isNear);
    
    // Pulse trigger zone when player is near
    if (triggerRef.current) {
      triggerRef.current.visible = isNear;
      if (isNear) {
        const pulse = 0.12 + Math.sin(state.clock.getElapsedTime() * 4) * 0.04;
        // ✅ Type-safe material opacity access
        const mat = triggerRef.current.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) {
          mat.forEach(m => { if ('opacity' in m) m.opacity = pulse; });
        } else if ('opacity' in mat) {
          mat.opacity = pulse;
        }
      }
    }
    
    // Billboard nameplate to face camera
    if (nameplateRef.current && state.camera) {
      nameplateRef.current.lookAt(state.camera.position);
    }
    
    // Subtle idle animation
    if (groupRef.current) {
      groupRef.current.position.y = 0.02 + Math.sin(state.clock.getElapsedTime() * 2) * 0.01;
    }
  });

  // Generate quests for this NPC on mount
  useEffect(() => {
    const [cx, cz] = chunkId.split('_').map(Number);
    const playerLevel = useGameStore.getState().profile.level;
    questManager.generateChunkQuests(cx, cz, playerLevel);
  }, [chunkId, questManager]);

  const handleInteract = useCallback(() => {
    if (showInteractionPrompt) {
      useGameStore.getState().setInteractionTarget({
        type: 'npc',
        id: npcId,
        name: questManager['generateNPCName'](parseInt(npcId.split('_').pop() || '0')),
        position: { x: position.x, y: position.y, z: position.z },
        radius: 7
      });
    }
  }, [showInteractionPrompt, npcId, position, questManager]);

  return (
    <group ref={groupRef} position={position}>
      {/* NPC Body */}
      <mesh geometry={shared.bodyGeo} material={shared.bodyMat} position={[0, 0.55, 0]} castShadow />
      
      {/* NPC Head */}
      <mesh geometry={shared.headGeo} material={shared.headMat} position={[0, 1.35, 0]} castShadow />
      
      {/* Nameplate (billboard) */}
      <mesh ref={nameplateRef} geometry={shared.nameplateGeo} material={shared.nameplateMat} position={[0, 2.1, 0]} />
      
      {/* Interaction trigger zone (invisible until player is near) */}
      <mesh 
        ref={triggerRef} 
        geometry={shared.triggerGeo} 
        material={shared.triggerMat} 
        position={[0, 0.05, 0]}
        visible={false}
        userData={{ isTrigger: true, npcId, onInteract: handleInteract }}
      />
      
      {/* Quest indicator icon when quests available */}
      {showInteractionPrompt && (
        <mesh position={[0, 2.8, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}
    </group>
  );
}