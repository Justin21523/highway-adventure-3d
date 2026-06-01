// src/components/world/NPCSpawner.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useShopStore } from '../../stores/shopStore';
import { QuestManager } from '../../managers/QuestManager';
import { ZONE_GRID_SIZE, zoneAtChunk, roadTypeForZone } from '../../systems/ZoneManager';
import type { ZoneType } from '../../types/core';

/* ─────────────────────────────────────────────
 * Deterministic helpers — same chunk/slot reproduces the same spawn decision
 * and NPC name on return or reload.
 * ───────────────────────────────────────────── */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Stable [0,1) for a chunk + slot index. */
function slotHash(chunkId: string, i: number): number {
  return (hashStr(`${chunkId}#${i}`) % 100000) / 100000;
}

const NPC_FIRST_NAMES = ['Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Quinn', 'Avery'];
const NPC_LAST_NAMES = ['Drive', 'Road', 'Lane', 'Shift', 'Gear', 'Turbo', 'Apex', 'Drift'];

/** Deterministic NPC name from its id. */
function npcName(npcId: string): string {
  const h = hashStr(npcId);
  return `${NPC_FIRST_NAMES[h % NPC_FIRST_NAMES.length]} ${NPC_LAST_NAMES[(h >>> 8) % NPC_LAST_NAMES.length]}`;
}

/**
 * NPCSpawner
 * Procedurally spawns quest-giving NPCs along road networks.
 * Uses chunk-based streaming: NPCs appear at road intersections, rest stops,
 * and scenic points. Each NPC has assigned quests from QuestManager.
 * 
 * Architecture:
 * - NPCs spawn at deterministic positions based on chunk coordinates
 * - Uses object pooling for performance (max 20 active NPCs)
 * - Interaction zone: 8m radius trigger for quest dialog
 * - Visual: Simple low-poly character with nameplate and quest indicator
 */
export function NPCSpawner({ vehicleRef }: { vehicleRef: React.RefObject<THREE.Group> }) {
  const containerRef = useRef<THREE.Group>(null);
  const npcsRef = useRef<Array<{
    id: string;
    mesh: THREE.Group;
    trigger: THREE.Mesh;
    position: THREE.Vector3;
    chunkId: string;
    roadType: 'highway' | 'city';
    name: string;
    questIds: string[];
    active: boolean;
  }>>([]);
  const poolSize = 20;
  const spawnInterval = 3; // NPCs per chunk on average
  const interactionRadius = 8;

  // Shared NPC geometry/materials
  const shared = useMemo(() => {
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.3, 1.2, 8);
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const triggerGeo = new THREE.CylinderGeometry(interactionRadius, interactionRadius, 0.1, 16);
    
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.3 });
    const headMat = new THREE.MeshStandardMaterial({ color: '#fcd34d', metalness: 0.2 });
    const triggerMat = new THREE.MeshBasicMaterial({ color: '#22c55e', transparent: true, opacity: 0.15, visible: false });
    const nameplateMat = new THREE.MeshBasicMaterial({ color: '#1e293b', side: THREE.DoubleSide });
    
    return { bodyGeo, headGeo, triggerGeo, bodyMat, headMat, triggerMat, nameplateMat };
  }, []);

  // Create NPC mesh with nameplate
  const createNPC = (id: string, name: string, x: number, z: number): THREE.Group => {
    const group = new THREE.Group();
    
    // Body
    const body = new THREE.Mesh(shared.bodyGeo, shared.bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const head = new THREE.Mesh(shared.headGeo, shared.headMat);
    head.position.y = 1.4;
    head.castShadow = true;
    group.add(head);
    
    // Nameplate (facing camera)
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 0.5),
      shared.nameplateMat
    );
    plate.position.set(0, 2.2, 0);
    plate.rotation.x = -0.2;
    group.add(plate);
    
    // Interaction trigger (invisible)
    const trigger = new THREE.Mesh(shared.triggerGeo, shared.triggerMat);
    trigger.position.y = 0.05;
    trigger.userData = { isTrigger: true, npcId: id };
    group.add(trigger);
    
    group.position.set(x, 0, z);
    group.userData = { id, name };
    
    return group;
  };

  // Determine spawn positions within a chunk, keyed off the authoritative zone.
  const getSpawnPositions = (gx: number, gz: number, zone: ZoneType): THREE.Vector3[] => {
    const positions: THREE.Vector3[] = [];
    const chunkCenterX = gx * ZONE_GRID_SIZE;
    const chunkCenterZ = gz * ZONE_GRID_SIZE;

    if (zone === 'highway') {
      // Highway: spawn at rest stops off the deck (every 2 chunks).
      if (gz % 2 === 0) {
        positions.push(new THREE.Vector3(chunkCenterX + ZONE_GRID_SIZE * 0.3, 0, chunkCenterZ + ZONE_GRID_SIZE * 0.3));
        positions.push(new THREE.Vector3(chunkCenterX - ZONE_GRID_SIZE * 0.3, 0, chunkCenterZ - ZONE_GRID_SIZE * 0.3));
      }
    } else if (zone === 'cityCenter') {
      // Commercial: stand at the doors of real shops registered for this chunk.
      const shops = useShopStore.getState().getShopsInChunk(`${gx}_${gz}`);
      for (const shop of shops.slice(0, 4)) {
        const doorOffset = (shop.interactionRadius ?? 6) + 1;
        positions.push(new THREE.Vector3(shop.position.x, 0, shop.position.z - doorOffset));
      }
      if (positions.length === 0) {
        // Fallback to intersections if shops haven't streamed in yet.
        const offset = ZONE_GRID_SIZE * 0.4;
        positions.push(new THREE.Vector3(chunkCenterX - offset, 0, chunkCenterZ - offset));
        positions.push(new THREE.Vector3(chunkCenterX + offset, 0, chunkCenterZ + offset));
      }
    } else if (zone === 'suburban') {
      // Residential: a couple of figures out on the street.
      positions.push(new THREE.Vector3(chunkCenterX + ZONE_GRID_SIZE * 0.15, 0, chunkCenterZ - ZONE_GRID_SIZE * 0.2));
      positions.push(new THREE.Vector3(chunkCenterX - ZONE_GRID_SIZE * 0.15, 0, chunkCenterZ + ZONE_GRID_SIZE * 0.2));
    } else {
      // Countryside / industrial: a lone roadside/scenic figure near the centre.
      positions.push(new THREE.Vector3(chunkCenterX, 0, chunkCenterZ));
    }

    return positions;
  };

  useFrame(() => {
    if (!vehicleRef.current) return;
    const { playerPosition } = useGameStore.getState();
    const playerChunkX = Math.floor(playerPosition.x / ZONE_GRID_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / ZONE_GRID_SIZE);
    const playerLevel = useGameStore.getState().profile.level;
    
    const questManager = QuestManager.getInstance();
    
    // Spawn NPCs in nearby chunks
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const gx = playerChunkX + dx;
        const gz = playerChunkZ + dz;
        const chunkId = `${gx}_${gz}`;
        const zone = zoneAtChunk(gx, gz);
        const roadType = roadTypeForZone(zone);

        // Check if NPCs already spawned for this chunk
        const existing = npcsRef.current.filter(n => n.chunkId === chunkId && n.active);
        if (existing.length >= spawnInterval) continue;

        // Get spawn positions
        const positions = getSpawnPositions(gx, gz, zone);
        
        for (let i = 0; i < positions.length && npcsRef.current.filter(n => n.active).length < poolSize; i++) {
          // Deterministic sparse spawning — same chunk/slot decides the same way
          // on return or reload (no Math.random).
          if (slotHash(chunkId, i) > 0.6) continue;

          const pos = positions[i];
          const npcId = `npc_${chunkId}_${i}`;
          
          // Check if already exists in pool
          if (npcsRef.current.some(n => n.id === npcId && n.active)) continue;
          
          // Find inactive slot or create new
          let npc = npcsRef.current.find(n => !n.active);
          if (!npc && npcsRef.current.length < poolSize) {
            const mesh = createNPC(npcId, npcName(npcId), pos.x, pos.z);
            containerRef.current?.add(mesh);
            npc = {
              id: npcId,
              mesh,
              trigger: mesh.children.find(c => (c as THREE.Mesh).userData?.isTrigger) as THREE.Mesh,
              position: pos.clone(),
              chunkId,
              roadType,
              name: mesh.userData.name,
              questIds: [],
              active: false
            };
            npcsRef.current.push(npc);
          }
          
          if (npc) {
            // Activate and assign quests
            npc.active = true;
            npc.mesh.visible = true;
            npc.mesh.position.copy(pos);
            npc.trigger.visible = false; // Hide trigger by default
            
            // Assign quests from manager
            npc.questIds = questManager.assignQuestsToNPC(npcId, chunkId, roadType, playerLevel);
          }
        }
      }
    }
    
    // Handle interaction detection
    const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    npcsRef.current.forEach(npc => {
      if (!npc.active) return;
      
      const dist = playerPos.distanceTo(npc.position);
      const wasNear = npc.trigger.visible;
      const isNear = dist < interactionRadius;
      
      // Show/hide trigger indicator
      if (npc.trigger) {
        npc.trigger.visible = isNear && !wasNear; // Only flash on enter
        if (isNear) {
          const pulse = 0.15 + Math.sin(Date.now() * 0.005) * 0.05;
          // Handle both single material and material array
          const mat = npc.trigger.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) {
            mat.forEach(m => { if (m.transparent) m.opacity = pulse; });
          } else if (mat.transparent) {
            mat.opacity = pulse;
          }
        }
      }
      
      // Auto-open quest dialog on key press when near
      if (isNear && useGameStore.getState().inputState?.interact) {
        useGameStore.getState().setInteractionTarget({ type: 'npc', id: npc.id, name: npc.name });
      }
    });
    
    // Despawn distant NPCs
    npcsRef.current.forEach(npc => {
      if (!npc.active) return;
      const dist = playerPos.distanceTo(npc.position);
      if (dist > ZONE_GRID_SIZE * 3) {
        npc.active = false;
        npc.mesh.visible = false;
        questManager.unloadChunk(npc.chunkId);
      }
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      npcsRef.current.forEach(npc => {
        npc.mesh.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).geometry?.dispose();
            ((obj as THREE.Mesh).material as THREE.Material)?.dispose();
          }
        });
      });
      npcsRef.current = [];
    };
  }, []);

  return <group ref={containerRef} />;
}