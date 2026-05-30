// src/components/ui/TutorialOverlay.tsx
import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';

/**
 * TutorialOverlay
 * Step-by-step guidance for new players.
 * Shows contextual hints based on player actions and progress.
 * Dismissible and remembers completion via localStorage.
 */
export function TutorialOverlay() {
  const { gameMode, vehicle } = useGameStore();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const TUTORIAL_STEPS = [
    {
      title: 'Welcome, Driver!',
      text: 'Use WASD or Arrow Keys to control your vehicle. Hold SHIFT for boost, SPACE for handbrake drift.',
      action: null,
      highlight: 'controls'
    },
    {
      title: 'Watch Your Speed',
      text: 'Your speedometer shows current velocity. Higher speeds = more coins from pickups, but harder to control!',
      action: () => vehicle.speed > 50,
      highlight: 'speedometer'
    },
    {
      title: 'Collect Coins',
      text: 'Golden coins on the road give you currency. Spend them in shops to upgrade your vehicle.',
      action: null,
      highlight: 'coins'
    },
    {
      title: 'Complete Quests',
      text: 'Press Q to open your quest log. Complete objectives to earn XP and unlock new vehicles.',
      action: null,
      highlight: 'quest'
    },
    {
      title: 'Visit Shops',
      text: 'Green zones on the highway are shops. Drive into them to buy upgrades and customize your ride.',
      action: null,
      highlight: 'shop'
    },
    {
      title: "You're Ready!",
      text: 'The highway awaits. Drive safely, collect coins, and become the ultimate racer!',
      action: null,
      highlight: null
    }
  ];

  // Check if tutorial should show (first launch)
  useEffect(() => {
    const hasSeen = localStorage.getItem('tutorial_completed_v1');
    if (!hasSeen && (gameMode === 'playing' || gameMode === 'exploration')) {
      setVisible(true);
      setStep(0);
    }
  }, [gameMode]);

  // Auto-advance on action completion
  useEffect(() => {
    if (!visible || step >= TUTORIAL_STEPS.length) return;
    const current = TUTORIAL_STEPS[step];
    if (current.action && current.action()) {
      setTimeout(() => nextStep(), 1500);
    }
  }, [visible, step, vehicle.speed]);

  const nextStep = useCallback(() => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // Complete tutorial
      localStorage.setItem('tutorial_completed_v1', 'true');
      setVisible(false);
      setAcknowledged(true);
    }
  }, [step]);

  const skipTutorial = useCallback(() => {
    localStorage.setItem('tutorial_completed_v1', 'true');
    setVisible(false);
    setAcknowledged(true);
  }, []);

  if (!visible || gameMode === 'shop' || gameMode === 'garage' || gameMode === 'paused') return null;

  const current = TUTORIAL_STEPS[step];

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-end justify-center pb-32">
      <div className="bg-black/90 backdrop-blur-md rounded-2xl border border-indigo-500/50 p-6 max-w-md mx-4 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white">{current.title}</h3>
          <button onClick={skipTutorial} className="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
        </div>
        <p className="text-slate-300 mb-6 leading-relaxed">{current.text}</p>
        
        {/* Progress dots */}
        <div className="flex gap-2 mb-6 justify-center">
          {TUTORIAL_STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'bg-indigo-500 w-4' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
        
        {/* Action button */}
        <div className="flex gap-3">
          <button 
            onClick={nextStep}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all active:scale-95"
          >
            {step === TUTORIAL_STEPS.length - 1 ? 'START DRIVING' : 'NEXT'}
          </button>
          {step > 0 && (
            <button 
              onClick={() => setStep(s => Math.max(0, s - 1))}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
            >
              BACK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
