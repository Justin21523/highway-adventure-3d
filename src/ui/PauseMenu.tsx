// src/components/ui/PauseMenu.tsx
import { useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { SaveManager } from '../managers/SaveManager';
import { InputManager } from '../managers/InputManager';
import { AudioManager } from '../managers/AudioManager';

export function PauseMenu() {
  const { gameMode, setGameMode, updatePerformanceMetrics } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');

  const handleResume = useCallback(() => setGameMode('playing'), [setGameMode]);
  const handleSave = useCallback(() => { SaveManager.getInstance().save(); setGameMode('playing'); }, []);
  const handleQuit = useCallback(() => { window.location.reload(); }, []);
  
  const updateVolume = useCallback((v: number) => {
    setVolume(v);
    AudioManager.getInstance().setMasterVolume(v);
  }, []);

  const updateQuality = useCallback((q: string) => {
    const tier = q as any;
    setQuality(tier);
    updatePerformanceMetrics({ qualityTier: tier });
  }, [updatePerformanceMetrics]);

  if (gameMode !== 'paused') return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center pointer-events-auto">
      <div className="w-full max-w-md bg-slate-900/90 rounded-2xl border border-slate-700 p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white text-center mb-6 tracking-wide">GAME PAUSED</h2>
        
        {!showSettings ? (
          <div className="space-y-3">
            <button onClick={handleResume} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all">RESUME</button>
            <button onClick={() => setShowSettings(true)} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all">SETTINGS</button>
            <button onClick={handleSave} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all">SAVE PROGRESS</button>
            <button onClick={handleQuit} className="w-full py-3 bg-red-900/40 hover:bg-red-800/60 text-red-300 font-bold rounded-lg transition-all">QUIT TO MENU</button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-2">Master Volume</label>
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => updateVolume(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-2">Render Quality</label>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'ultra'].map(q => (
                  <button key={q} onClick={() => updateQuality(q)} className={`py-2 text-xs font-bold rounded ${quality === q ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{q.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg mt-2">BACK</button>
          </div>
        )}
      </div>
    </div>
  );
}
