/**
 * App - Main application component.
 *
 * Keeps top-level setup focused on renderer, global managers, and UI overlays.
 * Scene systems are mounted through GameScene so the player vehicle, camera,
 * world, traffic, shops, pickups, and collision systems share one scene graph.
 */
import React, { RefObject, Suspense, useCallback, useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, Object3DNode } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

import { GameScene } from './components/GameScene';
import { HUD } from './components/HUD';
import { QuestLog } from './components/QuestLog';
import { ShopModal } from './components/ShopModal';
import { GarageModal } from './components/GarageModal';
import { PauseMenu } from './components/PauseMenu';
import { NotificationToast } from './components/NotificationToast';
import { InteractionOverlay } from './components/InteractionOverlay';
import { LoadingScreen } from './components/LoadingScreen';
import { StartScreen } from './components/StartScreen';
import { ShopInteriorScene } from './components/ShopInteriorScene';
import { ShopInteriorOverlay } from './components/ShopInteriorOverlay';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { AchievementPanel } from './components/ui/AchievementPanel';
import { CrashOverlay } from './components/ui/CrashOverlay';
import { MinimapRenderer } from './components/ui/MinimapRenderer';
import { ActivityHUD } from './components/ui/ActivityHUD';
import { ComboIndicator } from './components/ui/ComboIndicator';
import { DailyChallenges } from './components/ui/DailyChallenges';

import { AudioManager } from './managers/AudioManager';
import { InputManager } from './managers/InputManager';
import { SaveManager } from './managers/SaveManager';
import { PerformanceScaler } from './managers/PerformanceScaler';
import { VFXManager } from './managers/VFXManager';
import { NotificationManager } from './managers/NotificationManager';
import { MusicManager } from './managers/MusicManager';
import { useGameLoopManager } from './hooks/useGameLoopManager';
import { useGameOrchestrator } from './hooks/useGameOrchestrator';
import { useGameStore } from './stores/gameStore';
import { useShopStore } from './stores/shopStore';
import { detectWebGL, type WebGLStatus } from './utils/webglDetect';

// 新增 Quest 系統相關元件
import { QuestDialog } from './components/ui/QuestDialog';
import { QuestZoneIndicator } from './components/world/QuestZoneIndicator';
import { QuestProgressTracker } from './components/world/QuestProgressTracker';
import { NPCSpawner } from './components/world/NPCSpawner';

import { PlayerVehicle } from './components/PlayerVehicle';
import { CameraRig } from './components/CameraRig';
import { WorldSyncManager } from './components/world/WorldSyncManager';

import type { InputState, InteractionTarget, QuestStats } from './types/core';

const FIX_INSTRUCTIONS: Record<string, string[]> = {
  chrome: [
    'Open chrome://flags',
    'Search for "GPU rasterization"',
    'Enable it',
    'Relaunch Chrome',
  ],
  firefox: [
    'Open about:config',
    'Search for "webgl.disabled"',
    'Set it to false',
    'Restart Firefox',
  ],
  safari: [
    'Open Safari Preferences > Advanced',
    'Enable the Develop menu',
    'Check Develop browser GPU options',
    'Restart Safari',
  ],
  edge: [
    'Open edge://flags',
    'Search for "Hardware Acceleration"',
    'Enable it',
    'Relaunch Edge',
  ],
};

function WebGLBlockedScreen({ status }: { status: Extract<WebGLStatus, { ok: false }> }) {
  const steps = FIX_INSTRUCTIONS[status.browser] ?? FIX_INSTRUCTIONS.chrome;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-red-500/40 bg-black/60 p-8 text-left backdrop-blur-md">
        <h2 className="mb-1 text-2xl font-bold text-red-400">WebGL Is Disabled</h2>
        <p className="mb-5 text-sm text-gray-400">
          Your browser blocked GPU or WebGL access. Follow the steps below to fix it:
        </p>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-gray-300">
              <span className="shrink-0 font-bold text-indigo-400">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

class WebGLErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    const status = detectWebGL();
    if (!status.ok) return <WebGLBlockedScreen status={status} />;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <div className="max-w-md rounded-2xl border border-red-500/40 bg-black/60 p-8 text-center backdrop-blur-md">
          <h2 className="mb-3 text-2xl font-bold text-red-400">Renderer Error</h2>
          <p className="text-sm text-gray-300">{String(this.state.error)}</p>
        </div>
      </div>
    );
  }
}

function RuntimeManagers() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    PerformanceScaler.getInstance().init(gl);
    useGameStore.setState({ sceneRef: { current: scene }, cameraRef: { current: camera } });
  }, [gl, scene, camera]);

  useGameLoopManager();
  useGameOrchestrator();
  return null;
}

export default function App() {
  const [webglStatus, setWebglStatus] = useState<WebGLStatus | null>(null);
  const [gameState, setGameState] = useState<'start' | 'loading' | 'playing'>('start');
  const [isQuestOpen, setIsQuestOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const interiorShopId = useShopStore((state) => state.interiorShopId);
  const gameMode = useGameStore((state) => state.gameMode);

  const vRef = useRef<THREE.Group>(null);   // 共有車両 ref（PlayerVehicle / CameraRig / NPCSpawner で共有）
  const worldRef = useRef<THREE.Group>(null);
  const musicRef = useRef(MusicManager.getInstance()); // 程序化音樂引擎（WorldSyncManager が速度に応じて駆動）

  useEffect(() => {
    setWebglStatus(detectWebGL());
  }, []);

  useEffect(() => {
    InputManager.getInstance().init();
    SaveManager.getInstance().init();
    NotificationManager.getInstance().init();

    return () => {
      InputManager.getInstance().dispose();
      VFXManager.getInstance().dispose();
      SaveManager.getInstance().dispose();
      NotificationManager.getInstance().clear();
      MusicManager.getInstance().stop();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const gameStore = useGameStore.getState();
      const shopStore = useShopStore.getState();

      if (e.key === 'Escape') {
        if (shopStore.interiorShopId) {
          shopStore.exitShopInterior();
          gameStore.setGameMode('playing');
          return;
        }
        gameStore.setGameMode(gameStore.gameMode === 'playing' ? 'paused' : 'playing');
      }

      if (e.key === 'q' || e.key === 'Q') {
        setIsQuestOpen((prev) => !prev);
      }

      if ((e.key === 'e' || e.key === 'E') && shopStore.nearestShopId && !shopStore.interiorShopId) {
        shopStore.enterShopInterior(shopStore.nearestShopId);
        gameStore.setGameMode('shop');
        setIsShopOpen(false);
      }

      if ((e.key === 'x' || e.key === 'X') && shopStore.interiorShopId) {
        shopStore.exitShopInterior();
        gameStore.setGameMode('playing');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStart = useCallback(async () => {
    setGameState('loading');

    const audio = AudioManager.getInstance();
    await audio.init();
    audio.resumeContext();
    audio.startWindNoise();
    const ctx = audio.getContext();
    if (ctx) {
      MusicManager.getInstance().init(ctx);
      MusicManager.getInstance().start();
    }

    SaveManager.getInstance().init();
    InputManager.getInstance().init();

    window.setTimeout(() => {
      setGameState('playing');
      useGameStore.getState().setGameMode('playing');
    }, 800);
  }, []);

  if (!webglStatus) return null;
  if (!webglStatus.ok) return <WebGLBlockedScreen status={webglStatus} />;
  if (gameState === 'start') return <StartScreen onStart={handleStart} />;
  if (gameState === 'loading') return <LoadingScreen onComplete={() => setGameState('playing')} />;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
      <WebGLErrorBoundary>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            stencil: false,
            failIfMajorPerformanceCaveat: false,
            depth: true,
          }}
        >
          <color attach="background" args={['#0b132b']} />
          <fog attach="fog" args={['#0b132b', 50, 220]} />
          {!interiorShopId && <Stars radius={200} depth={80} count={3000} factor={4} saturation={0} />}
          <RuntimeManagers />
          <Suspense fallback={null}>
            {interiorShopId ? <ShopInteriorScene /> : <GameScene vehicleRef={vRef} />}
            <QuestProgressTracker />
            <PlayerVehicle vehicleRef={vRef} />
            <CameraRig vehicleRef={vRef} />
            <WorldSyncManager vRef={vRef} musicRef={musicRef} />
            {/* NPC 生成器 - 動態任務發放 */}
            {gameState === 'playing' && <NPCSpawner vehicleRef={vRef} />}
            {/* 任務視覺指示器 - 顯示目標位置 */}
            <QuestZoneIndicator />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      {!interiorShopId && <HUD />}
      <NotificationToast />
      {interiorShopId ? <ShopInteriorOverlay /> : <InteractionOverlay />}
      {!interiorShopId && <MinimapRenderer />}
      {!interiorShopId && <ActivityHUD />}
      {!interiorShopId && <ComboIndicator />}
      {!interiorShopId && <DailyChallenges />}
      <TutorialOverlay />
      <AchievementPanel />
      <CrashOverlay />
      <QuestDialog />

      <QuestLog isOpen={isQuestOpen} onClose={() => setIsQuestOpen(false)} />
      <ShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
      <GarageModal
        isOpen={isGarageOpen || gameMode === 'garage'}
        onClose={() => {
          setIsGarageOpen(false);
          if (useGameStore.getState().gameMode === 'garage') {
            useGameStore.getState().setGameMode('playing');
          }
        }}
      />
      <PauseMenu
        onResume={() => useGameStore.getState().setGameMode('playing')}
        onGarage={() => setIsGarageOpen(true)}
        onMainMenu={() => setGameState('start')}
      />
    </div>
  );
}
