/**
 * useGameLoop — R3F hook that drives the game loop.
 *
 * This hook connects React Three Fiber's useFrame to the GameRuntime
 * and all registered systems. It should be used in the main GameScene component.
 *
 * Usage:
 *   function GameScene() {
 *     useGameLoop();
 *     return <group>...</group>;
 *   }
 */

import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { GameRuntime } from '@/systems/GameRuntime';
import { ChunkStreamer } from '@/systems/ChunkStreamer';
import { TrafficAI } from '@/systems/TrafficAI';
import { ShopSystem } from '@/systems/ShopSystem';
import { QuestSystem } from '@/systems/QuestSystem';
import { PickupSystem } from '@/systems/PickupSystem';
import { VehiclePhysics } from '@/systems/VehiclePhysics';
import { EnvironmentSystem } from '@/systems/EnvironmentSystem';
import { useControls } from './useControls';
import type { Scene } from 'three';

/* ─────────────────────────────────────────────
 * useGameLoop Hook
 * ───────────────────────────────────────────── */

export function useGameLoop() {
  const sceneRef = useRef<Scene | null>(null);
  const controlsRef = useControls();

  // Initialize systems once on mount
  useEffect(() => {
    const runtime = GameRuntime.getInstance();

    // Initialize all systems
    const chunkStreamer = ChunkStreamer.getInstance();
    chunkStreamer.init();
    runtime.registerSystem(chunkStreamer);

    const trafficAI = TrafficAI.getInstance();
    trafficAI.init();
    runtime.registerSystem(trafficAI);

    const shopSystem = ShopSystem.getInstance();
    shopSystem.init();
    runtime.registerSystem(shopSystem);

    const questSystem = QuestSystem.getInstance();
    questSystem.init();
    runtime.registerSystem(questSystem);

    const pickupSystem = PickupSystem.getInstance();
    pickupSystem.init();
    runtime.registerSystem(pickupSystem);

    const vehiclePhysics = VehiclePhysics.getInstance();
    vehiclePhysics.init();
    runtime.registerSystem(vehiclePhysics);

    // Start the game loop
    runtime.start();

    // Cleanup on unmount
    return () => {
      runtime.stop();
      runtime.dispose();
    };
  }, []);

  // Initialize environment system when scene is available
  useEffect(() => {
    const envSystem = EnvironmentSystem.getInstance();
    if (sceneRef.current && !envSystem['isInitialized']) {
      envSystem.init(sceneRef.current);
    }
  }, []);

  // Frame update — call all registered systems
  useFrame((_state, delta) => {
    const runtime = GameRuntime.getInstance();
    runtime.update(delta);

    // Update environment system separately (needs scene reference)
    const envSystem = EnvironmentSystem.getInstance();
    if (sceneRef.current) {
      envSystem.update(delta);
    }
  });
}

/* ─────────────────────────────────────────────
 * useScene Hook — Get scene reference for environment
 * ───────────────────────────────────────────── */

export function useScene() {
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    const envSystem = EnvironmentSystem.getInstance();
    if (sceneRef.current && !envSystem['isInitialized']) {
      envSystem.init(sceneRef.current);
    }
  }, []);

  return sceneRef;
}

/* ─────────────────────────────────────────────
 * useSystem Hook — Access a system instance
 * ───────────────────────────────────────────── */

export function useSystem<T>(systemFactory: () => T): T {
  const systemRef = useRef<T | null>(null);

  if (!systemRef.current) {
    systemRef.current = systemFactory();
  }

  return systemRef.current;
}
