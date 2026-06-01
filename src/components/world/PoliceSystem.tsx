/**
 * PoliceSystem — wanted-level pursuit.
 *
 * When the player's wantedLevel rises (heavy crashes, sustained speeding), police
 * cars spawn around the player and give chase, colliding with recoverable damage
 * (shared i-frames with the traffic collision, so it can never freeze the car).
 * Staying far from all police bleeds off the heat; fully escaping pays out.
 *
 * Object-pooled, mounted in GameScene. Never changes gameMode or snaps the car.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useWorldStore } from '../../stores/worldStore';
import { CollisionSystem } from '../../physics/CollisionSystem';
import { VFXManager } from '../../managers/VFXManager';
import { AudioManager } from '../../managers/AudioManager';
import { NotificationManager } from '../../managers/NotificationManager';

const MAX_POLICE = 4;

export function PoliceSystem() {
  const containerRef = useRef<THREE.Group>(null);
  const carsRef = useRef<Array<{ mesh: THREE.Group; active: boolean; x: number; z: number; speed: number; hitCd: number }>>([]);
  const farTimer = useRef(0);
  const speedTimer = useRef(0);

  const shared = useMemo(() => ({
    body: new THREE.BoxGeometry(1.9, 0.8, 4.3),
    bodyMat: new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.4 }),
    roof: new THREE.BoxGeometry(1.6, 0.5, 2.0),
    roofMat: new THREE.MeshStandardMaterial({ color: '#f1f5f9' }),
    bar: new THREE.BoxGeometry(0.5, 0.18, 0.4),
    red: new THREE.MeshBasicMaterial({ color: '#ef4444' }),
    blue: new THREE.MeshBasicMaterial({ color: '#3b82f6' }),
  }), []);

  useEffect(() => {
    for (let i = 0; i < MAX_POLICE; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(shared.body, shared.bodyMat); body.position.y = 0.4; body.castShadow = true; g.add(body);
      const roof = new THREE.Mesh(shared.roof, shared.roofMat); roof.position.set(0, 1.05, -0.2); g.add(roof);
      const lR = new THREE.Mesh(shared.bar, shared.red); lR.position.set(-0.3, 1.42, -0.2); g.add(lR);
      const lB = new THREE.Mesh(shared.bar, shared.blue); lB.position.set(0.3, 1.42, -0.2); g.add(lB);
      g.visible = false;
      containerRef.current?.add(g);
      carsRef.current.push({ mesh: g, active: false, x: 0, z: 0, speed: 0, hitCd: 0 });
    }
    return () => { for (const v of Object.values(shared)) (v as THREE.BufferGeometry | THREE.Material).dispose?.(); };
  }, [shared]);

  useFrame((_, delta) => {
    const gs = useGameStore.getState();
    const wanted = gs.wantedLevel;
    const p = gs.playerPosition;
    const now = Date.now();

    // Sustained speeding raises heat.
    if (gs.vehicle.speed > 150 && (gs.gameMode === 'playing' || gs.gameMode === 'exploration')) {
      speedTimer.current += delta;
      if (speedTimer.current > 4) {
        speedTimer.current = 0;
        if (wanted < 3) {
          gs.addWanted(1);
          NotificationManager.getInstance().notify({ title: 'Wanted!', message: '超速駕駛，警察出動！', priority: 'high', duration: 2000, icon: 'warning' });
        }
      }
    } else {
      speedTimer.current = 0;
    }

    const desired = Math.min(MAX_POLICE, wanted);
    let activeCount = 0;
    let nearest = Infinity;
    const flash = Math.sin(now * 0.012) > 0;

    carsRef.current.forEach((car, idx) => {
      if (!car.active) {
        if (idx >= desired) { car.mesh.visible = false; return; }
        const ang = Math.random() * Math.PI * 2;
        car.active = true; car.x = p.x + Math.cos(ang) * 95; car.z = p.z + Math.sin(ang) * 95; car.speed = 0;
        car.mesh.visible = true;
      } else if (idx >= desired) {
        car.active = false; car.mesh.visible = false; return;
      }

      activeCount++;

      // Chase the player (a touch faster than them so they must shake pursuit).
      const dx = p.x - car.x, dz = p.z - car.z;
      const dist = Math.hypot(dx, dz) || 1;
      const target = Math.min(62, Math.max(gs.vehicle.speed / 3.6 + 4, 18));
      car.speed = THREE.MathUtils.lerp(car.speed, target, delta * 1.5);
      car.x += (dx / dist) * car.speed * delta;
      car.z += (dz / dist) * car.speed * delta;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = Math.atan2(dx, dz);
      nearest = Math.min(nearest, dist);

      // Flashing light bar.
      (car.mesh.children[2] as THREE.Mesh).visible = flash;
      (car.mesh.children[3] as THREE.Mesh).visible = !flash;

      if (dist > 420) { car.active = false; car.mesh.visible = false; return; }

      // Recoverable collision with the player.
      if (car.hitCd > 0) car.hitCd -= delta;
      if (now >= gs.invulnerableUntil && car.hitCd <= 0) {
        const playerAABB = CollisionSystem.createAABB({ x: p.x, y: p.y, z: p.z }, { x: 1.0, y: 0.6, z: 2.2 });
        const carAABB = CollisionSystem.createAABB({ x: car.x, y: 0.4, z: car.z }, { x: 1.0, y: 0.5, z: 2.2 });
        const overlap = CollisionSystem.checkAABB(playerAABB, carAABB);
        if (overlap) {
          car.hitCd = 1;
          const nh = Math.max(0, gs.vehicle.health - (6 + Math.random() * 4));
          const shove = (overlap.x !== 0 ? Math.sign(overlap.x) : 1) * 1.6;
          useWorldStore.getState().setPlayerPosition({ x: p.x + shove, y: p.y, z: p.z });
          gs.updateVehicleState({ speed: gs.vehicle.speed * 0.7, health: nh });
          useGameStore.setState({ invulnerableUntil: now + 800 });
          VFXManager.getInstance().spawn('spark', { x: car.x, y: 0.8, z: car.z }, 1.2, 12);
          AudioManager.getInstance().playImpact(0.8);
          if (nh <= 0) gs.setGameMode('crashed');
        }
      }
    });

    // Heat bleeds off when you keep clear of every pursuer.
    if (wanted > 0) {
      if (activeCount === 0 || nearest > 135) {
        farTimer.current += delta;
        if (farTimer.current > 8) {
          farTimer.current = 0;
          gs.addWanted(-1);
          if (useGameStore.getState().wantedLevel === 0) {
            const reward = 150 * wanted;
            gs.addCoins(reward);
            gs.addReputation(8);
            NotificationManager.getInstance().notify({ title: 'Escaped!', message: `甩開警察 +${reward}🪙`, priority: 'high', duration: 2500, icon: 'success' });
          }
        }
      } else {
        farTimer.current = 0;
      }
    } else {
      farTimer.current = 0;
    }
  });

  return <group ref={containerRef} />;
}
