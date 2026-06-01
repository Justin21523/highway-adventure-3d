// src/components/world/TrafficAIController.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useWorldStore } from '../../stores/worldStore';
import { CollisionSystem } from '../../physics/CollisionSystem';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';
import { NotificationManager } from '../../managers/NotificationManager';
import { GameRuntime } from '../../systems/GameRuntime';
import { useDailyStore } from '../../stores/dailyStore';

/** A collidable traffic car (only the fields the collision/near-miss code needs). */
type CollidableCar = { mesh: THREE.Group; z: number; active: boolean; missed?: boolean };

/**
 * Arcade-forgiving collision: light tap (slow) vs heavy crash (fast). Always
 * recoverable — reduces speed, knocks the car aside, applies capped damage, then
 * grants 0.8s i-frames so it can never freeze inside a car. Breaks the combo.
 */
function applyPlayerHit(car: CollidableCar, overlap: { x: number }, now: number) {
  const gs = useGameStore.getState();
  const heavy = gs.vehicle.speed > 70;
  const speedMul = heavy ? 0.6 : 0.9;
  const dmg = Math.min(heavy ? 14 : 5, (heavy ? 8 : 2) + Math.random() * (heavy ? 6 : 3));
  const newHealth = Math.max(0, gs.vehicle.health - dmg);

  // Shove the player laterally away from the car (VehiclePhysics continues from
  // worldStore.playerPosition next frame, so this reads as knockback).
  const shove = (overlap.x !== 0 ? Math.sign(overlap.x) : (Math.random() < 0.5 ? -1 : 1)) * 1.6;
  const p = gs.playerPosition;
  useWorldStore.getState().setPlayerPosition({ x: p.x + shove, y: p.y, z: p.z });

  gs.updateVehicleState({ speed: gs.vehicle.speed * speedMul, health: newHealth, isDrifting: true });
  useGameStore.setState({ invulnerableUntil: now + 800, combo: 0, comboExpiresAt: 0 });

  VFXManager.getInstance().spawn('spark', { x: car.mesh.position.x, y: 0.8, z: car.z }, heavy ? 1.5 : 0.9, heavy ? 14 : 8);
  VFXManager.getInstance().spawn('smoke', { x: car.mesh.position.x, y: 0.4, z: car.z }, 1.0, 6);
  AudioManager.getInstance().playImpact(heavy ? 0.9 : 0.5);
  GameRuntime.getInstance().dispatchEvent({ type: 'traffic_collision', timestamp: now, data: { heavy } });

  // Reckless high-speed crashes occasionally draw police attention.
  if (heavy && Math.random() < 0.5) gs.addWanted(1);

  car.active = false;
  car.mesh.visible = false;
  if (newHealth <= 0) gs.setGameMode('crashed');
}

/** Reward for threading traffic at speed without touching anything. */
function registerNearMiss(now: number) {
  const gs = useGameStore.getState();
  const combo = (now < gs.comboExpiresAt ? gs.combo : 0) + 1;
  useGameStore.setState({ combo, comboExpiresAt: now + 3000 });
  const coins = 5 * combo;
  const xp = 2 * combo;
  gs.addCoins(coins);
  gs.addXp(xp);
  useDailyStore.getState().bump('nearMiss');
  if (combo === 1 || combo % 3 === 0) {
    NotificationManager.getInstance().notify({
      title: `Near Miss x${combo}`,
      message: `+${coins}🪙 +${xp}XP`,
      priority: 'low',
      duration: 1200,
    });
  }
}

/**
 * TrafficAIController
 * Advanced traffic system with player-aware braking, lane changing, and curve following.
 * Uses object pooling for zero-GC performance.
 */
export function TrafficAIController() {
  const containerRef = useRef<THREE.Group>(null);
  const carsRef = useRef<Array<{
    mesh: THREE.Group;
    baseSpeed: number;
    currentSpeed: number;
    lane: number;
    targetLane: number;
    z: number;
    active: boolean;
    missed?: boolean;
  }>>([]);
  const nextIdRef = useRef(0);
  const poolSize = 20;

  const shared = useMemo(() => ({
    matA: new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.4 }),
    matB: new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.4 }),
    matC: new THREE.MeshStandardMaterial({ color: '#22c55e', metalness: 0.4 }),
    bodyGeo: new THREE.BoxGeometry(1.9, 0.8, 4.2),
    roofGeo: new THREE.BoxGeometry(1.6, 0.5, 2.2)
  }), []);

  useEffect(() => {
    for (let i = 0; i < poolSize; i++) {
      const group = new THREE.Group();
      const mat = [shared.matA, shared.matB, shared.matC][i % 3];
      const body = new THREE.Mesh(shared.bodyGeo, mat);
      body.position.y = 0.4; body.castShadow = true; group.add(body);
      const roof = new THREE.Mesh(shared.roofGeo, new THREE.MeshStandardMaterial({ color: '#1e293b' }));
      roof.position.set(0, 1.05, -0.2); roof.castShadow = true; group.add(roof);
      
      containerRef.current?.add(group);
      carsRef.current.push({
        mesh: group, baseSpeed: 15 + Math.random() * 20, currentSpeed: 0,
        lane: 0, targetLane: 0, z: 0, active: false
      });
    }
    return () => { shared.matA.dispose(); shared.matB.dispose(); shared.matC.dispose(); shared.bodyGeo.dispose(); shared.roofGeo.dispose(); };
  }, []);

  useFrame((_, delta) => {
    const { playerPosition, vehicle, invulnerableUntil } = useGameStore.getState();
    const playerZ = playerPosition.z;
    const playerSpeed = vehicle.speed / 3.6; // m/s

    // Player collision box (skip entirely during i-frames so a hit can never
    // re-trigger every frame and trap the car).
    const now = Date.now();
    const playerAABB = now >= invulnerableUntil
      ? CollisionSystem.createAABB(
          { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
          { x: 1.0, y: 0.6, z: 2.2 },
        )
      : null;
    let hitThisFrame = false;

    // Respawn & Logic
    carsRef.current.forEach(car => {
      // Spawn logic
      if (!car.active && Math.random() < 0.04) {
        car.active = true;
        car.missed = false;
        car.z = playerZ + 120 + Math.random() * 60;
        car.lane = (Math.floor(Math.random() * 3) - 1);
        car.targetLane = car.lane;
        car.currentSpeed = car.baseSpeed;
      }
      if (!car.active) { car.mesh.visible = false; return; }

      // Despawn
      if (playerZ - car.z > 30) { car.active = false; return; }

      // AI Behavior: Brake if too close to player
      const distToPlayer = car.z - playerZ;
      let targetSpeed = car.baseSpeed;
      if (distToPlayer > 0 && distToPlayer < 15 && playerSpeed > car.baseSpeed) {
        targetSpeed = Math.max(5, playerSpeed - 5); // Slow down to match player
      }

      // AI Behavior: Lane change if blocked or randomly
      if (Math.random() < 0.005) {
        car.targetLane = (Math.floor(Math.random() * 3) - 1);
      }

      // Smooth speed & lane interpolation
      car.currentSpeed = THREE.MathUtils.lerp(car.currentSpeed, targetSpeed, delta * 2);
      car.z -= car.currentSpeed * delta;
      const targetX = car.lane * 3.5;
      const actualX = car.mesh.position.x;
      car.mesh.position.x = THREE.MathUtils.lerp(actualX, targetX, delta * 3);
      car.mesh.position.z = car.z;

      // Visual heading tilt based on lane change
      car.mesh.rotation.y = (targetX - car.mesh.position.x) * 0.08;
      car.mesh.visible = true;

      // ── Player interaction: collision (recoverable) + near-miss reward ──
      if (playerAABB) {
        const carAABB = CollisionSystem.createAABB(
          { x: car.mesh.position.x, y: 0.4, z: car.z },
          { x: 1.0, y: 0.5, z: 2.2 },
        );
        const overlap = !hitThisFrame ? CollisionSystem.checkAABB(playerAABB, carAABB) : null;
        if (overlap) {
          hitThisFrame = true;
          applyPlayerHit(car, overlap, now);
        } else if (
          !car.missed &&
          vehicle.speed > 55 &&
          Math.abs(playerPosition.x - car.mesh.position.x) < 3.5 &&
          Math.abs(playerPosition.z - car.z) < 3
        ) {
          car.missed = true;
          registerNearMiss(now);
        }
      }
    });
  });

  return <group ref={containerRef} />;
}