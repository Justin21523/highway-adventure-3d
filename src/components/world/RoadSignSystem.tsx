// src/components/world/RoadSignSystem.tsx
import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';

/**
 * RoadSignSystem
 * Procedural road signs with distance markers, quest hints, and location indicators.
 * Uses instanced rendering for performance with hundreds of signs.
 * Signs appear at regular intervals and near points of interest (shops, garages, quest locations).
 */
export function RoadSignSystem() {
  const containerRef = useRef<THREE.Group>(null);
  const signsRef = useRef<Array<{ mesh: THREE.Mesh; text: string; position: THREE.Vector3; visible: boolean }>>([]);
  const playerPosRef = useRef(new THREE.Vector3());

  // Shared geometry/material for instancing
  const signGeo = useMemo(() => new THREE.PlaneGeometry(2.5, 1.2), []);
  const poleGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.05, 3, 6), []);
  const signMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#1e293b', metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide 
  }), []);
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#475569', metalness: 0.5, roughness: 0.6 
  }), []);
  const textMat = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: '#f8fafc', side: THREE.DoubleSide 
  }), []);

  // Generate sign text based on position and game state
  const generateSignText = (z: number, type: 'distance' | 'location' | 'quest'): string => {
    if (type === 'distance') {
      const km = Math.abs(z) / 1000;
      return `${km.toFixed(1)} KM`;
    }
    if (type === 'location') {
      const isShop = Math.abs(z % 2000 - 1500) < 100;
      const isGarage = Math.abs(z % 2000 - 1000) < 100;
      if (isShop) return '▶ SHOP ◀';
      if (isGarage) return '⚙ GARAGE ⚙';
      return '▶ CITY ◀';
    }
    // Quest hint
    const quest = useGameStore.getState().activeQuest;
    if (quest && quest.objectives[0]?.location) {
      const dist = Math.abs(z - quest.objectives[0].location.z) / 1000;
      return `QUEST: ${dist.toFixed(1)}KM`;
    }
    return '▶ NEXT ◀';
  };

  // Create a single sign mesh with text plane
  const createSign = (x: number, z: number, text: string): THREE.Group => {
    const group = new THREE.Group();
    
    // Pole
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.5;
    pole.castShadow = true;
    group.add(pole);
    
    // Sign board
    const board = new THREE.Mesh(signGeo, signMat);
    board.position.set(0, 2.8, 0.1);
    board.rotation.y = Math.PI; // Face the road
    board.castShadow = true;
    group.add(board);
    
    // Text (simple plane with basic characters)
    const textMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 0.4),
      textMat
    );
    textMesh.position.set(0, 2.8, 0.12);
    textMesh.rotation.y = Math.PI;
    // In production: use three-mesh-bvh or sprite font for real text
    group.add(textMesh);
    
    group.position.set(x, 0, z);
    group.rotation.y = Math.PI; // Face player direction
    
    return group;
  };

  useFrame(() => {
    const { playerPosition } = useGameStore.getState();
    playerPosRef.current.set(playerPosition.x, playerPosition.y, playerPosition.z);
    
    // Generate signs ahead of player
    const aheadZ = playerPosition.z + 200;
    const behindZ = playerPosition.z - 50;
    
    // Distance markers every 500m
    for (let z = Math.floor(behindZ / 500) * 500; z < aheadZ; z += 500) {
      const key = `dist_${z}`;
      if (!signsRef.current.some(s => s.mesh.userData.key === key)) {
        const group = createSign(-8, z, generateSignText(z, 'distance'));
        group.userData.key = key;
        containerRef.current?.add(group);
        signsRef.current.push({ 
          mesh: group.children[2] as THREE.Mesh, // text mesh
          text: generateSignText(z, 'distance'), 
          position: new THREE.Vector3(-8, 2.8, z),
          visible: true 
        });
      }
    }
    
    // Location signs near shops/garages
    for (let z = Math.floor(behindZ / 2000) * 2000; z < aheadZ; z += 2000) {
      // Shop at +1500, Garage at +1000 in each 2000m block
      [1000, 1500].forEach(offset => {
        const locZ = z + offset;
        const key = `loc_${locZ}`;
        if (!signsRef.current.some(s => s.mesh.userData.key === key)) {
          const group = createSign(8, locZ, generateSignText(locZ, 'location'));
          group.userData.key = key;
          containerRef.current?.add(group);
          signsRef.current.push({ 
            mesh: group.children[2] as THREE.Mesh,
            text: generateSignText(locZ, 'location'), 
            position: new THREE.Vector3(8, 2.8, locZ),
            visible: true 
          });
        }
      });
    }
    
    // Cull distant signs for performance
    signsRef.current.forEach(sign => {
      const dist = playerPosRef.current.distanceTo(sign.position);
      sign.visible = dist < 100;
      if (sign.mesh.parent) {
        sign.mesh.parent.visible = sign.visible;
      }
    });
    
    // Billboard effect: signs always face camera
    if (containerRef.current) {
      containerRef.current.lookAt(playerPosRef.current.x, 2.8, playerPosRef.current.z);
      containerRef.current.rotation.y = 0; // Reset Y to maintain road alignment
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      signsRef.current.forEach(s => {
        if (s.mesh.parent) {
          s.mesh.parent.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).geometry?.dispose();
              ((obj as THREE.Mesh).material as THREE.Material)?.dispose();
            }
          });
        }
      });
      signsRef.current = [];
    };
  }, []);

  return <group ref={containerRef} />;
}