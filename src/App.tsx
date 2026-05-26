/**
 * App — Main application component.
 *
 * This is the root component that assembles the entire game:
 * - WebGL detection and error handling
 * - Audio initialization
 * - Canvas with R3F renderer
 * - All game components (3D scene, UI, modals)
 * - Game state management (loading, playing, paused, shop, etc.)
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, PerspectiveCamera } from '@react-three/drei';
import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { GameScene } from './components/GameScene';
import { HUD } from './components/HUD';
import { QuestLog } from './components/QuestLog';
import { ShopModal } from './components/ShopModal';
import { GarageModal } from './components/GarageModal';
import { NotificationToast } from './components/NotificationToast';
import { InteractionOverlay } from './components/InteractionOverlay';
import { LoadingScreen } from './components/LoadingScreen';
import { StartScreen } from './components/StartScreen';
import { PauseMenu } from './components/PauseMenu';
import { useGameStore } from './stores/gameStore';
import { useShopStore } from './stores/shopStore';
import { ShopSystem } from './systems/ShopSystem';
import { AudioManager } from './managers/AudioManager';
import { VFXManager } from './managers/VFXManager';
import { SaveManager } from './managers/SaveManager';
import { InputManager } from './managers/InputManager';
import { PerformanceScaler } from './managers/PerformanceScaler';
import { detectWebGL, WebGLStatus } from './utils/webglDetect';
import { ParallaxBackground } from './components/world/ParallaxBackground';

/* ─────────────────────────────────────────────
 * VFX Controller — VFX 粒子を初期化してシーンに追加
 * ───────────────────────────────────────────── */

function VFXController() {
  const [points, setPoints] = useState<THREE.Points | null>(null);

  useEffect(() => {
    VFXManager.getInstance().init().then((p) => {
      if (p) setPoints(p);
    });
  }, []);

  useFrame((_, delta) => {
    if (points) VFXManager.getInstance().update(delta);
  });

  if (!points) return null;
  return <primitive object={points} />;
}

/* ─────────────────────────────────────────────
 * WebGL Detection Components
 * ───────────────────────────────────────────── */

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
    'Open Safari → Preferences → Advanced',
    'Check "Show Develop menu"',
    'Develop → Disable GPU Compositing (uncheck)',
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
  const steps = FIX_INSTRUCTIONS[status.browser];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
      <div className="text-left p-8 bg-black/60 backdrop-blur-md rounded-2xl border border-red-500/40 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold text-red-400 mb-1">WebGL Is Disabled</h2>
        <p className="text-gray-400 text-sm mb-5">
          Your browser blocked GPU / WebGL access. Follow the steps below to fix it:
        </p>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-300">
              <span className="text-indigo-400 font-bold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-gray-500">
          After applying the fix, reload this page (<code className="text-indigo-300">F5</code>).
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Error Boundary
 * ───────────────────────────────────────────── */

class WebGLErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const status = detectWebGL();
      if (!status.ok) return <WebGLBlockedScreen status={status} />;
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center p-8 bg-black/60 backdrop-blur-md rounded-2xl border border-red-500/40 max-w-md">
            <h2 className="text-2xl font-bold text-red-400 mb-3">Renderer Error</h2>
            <p className="text-gray-300 text-sm">{String(this.state.error)}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─────────────────────────────────────────────
 * Main App Component
 * ───────────────────────────────────────────── */

export default function App() {
  const [webglStatus, setWebglStatus] = useState<WebGLStatus | null>(null);
  const [gameState, setGameState] = useState<'start' | 'loading' | 'playing'>('start');
  const [isQuestOpen, setIsQuestOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);

  // WebGL detection
  useEffect(() => {
    setWebglStatus(detectWebGL());
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const gameStore = useGameStore.getState();
        if (gameStore.gameMode === 'playing') {
          gameStore.setGameMode('paused');
        } else if (gameStore.gameMode === 'paused') {
          gameStore.setGameMode('playing');
        }
      }

      if (e.key === 'q' || e.key === 'Q') {
        setIsQuestOpen((prev) => !prev);
      }

      if (e.key === 'e' || e.key === 'E') {
        const nearShopId = useShopStore.getState().nearShopId;
        if (nearShopId) {
          ShopSystem.getInstance().openShop(nearShopId);
          setIsShopOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Start game
  const handleStart = useCallback(async () => {
    setGameState('loading');

    // Initialize audio
    const audio = AudioManager.getInstance();
    await audio.init();
    audio.resumeContext();
    audio.startWindNoise();

    // Initialize save manager
    const save = SaveManager.getInstance();
    save.init();

    // Initialize input manager
    const input = InputManager.getInstance();
    input.init();

    // Simulate loading
    setTimeout(() => {
      setGameState('playing');
      useGameStore.getState().setGameMode('playing');
    }, 2000);
  }, []);

  // WebGL not available
  if (!webglStatus) return null;
  if (!webglStatus.ok) return <WebGLBlockedScreen status={webglStatus} />;

  // Start screen
  if (gameState === 'start') {
    return <StartScreen onStart={handleStart} />;
  }

  // Loading screen
  if (gameState === 'loading') {
    return <LoadingScreen onComplete={() => {}} />;
  }

  // Main game
  return (
    <div className="w-screen h-screen bg-gray-900 overflow-hidden relative">
      <WebGLErrorBoundary>
        <Canvas
          shadows
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            stencil: false,
            failIfMajorPerformanceCaveat: false,
            depth: true,
          }}
          dpr={[1, 2]}
          onCreated={({ gl }) => PerformanceScaler.getInstance().init(gl)}
        >
          <color attach="background" args={['#0b132b']} />
          <fog attach="fog" args={['#0b132b', 50, 200]} />
          <PerspectiveCamera makeDefault position={[0, 4, -12]} fov={60} near={0.1} far={300} />
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[30, 50, 20]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <Stars radius={200} depth={80} count={3000} factor={4} saturation={0} />
          <Suspense fallback={null}>
            <GameScene />
            <ParallaxBackground />
            <VFXController />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      {/* UI Overlay */}
      <HUD />
      <NotificationToast />
      <InteractionOverlay />

      {/* Modals */}
      <QuestLog isOpen={isQuestOpen} onClose={() => setIsQuestOpen(false)} />
      <ShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
      <GarageModal isOpen={isGarageOpen} onClose={() => setIsGarageOpen(false)} />

      {/* Pause Menu */}
      <PauseMenu
        onResume={() => useGameStore.getState().setGameMode('playing')}
        onGarage={() => setIsGarageOpen(true)}
        onMainMenu={() => setGameState('start')}
      />
    </div>
  );
}
