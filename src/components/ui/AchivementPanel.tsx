// src/components/ui/AchievementPanel.tsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { AchievementManager } from '../../managers/AchievementManager';

/**
 * AchievementPanel
 * Collapsible UI panel displaying player achievements with progress bars.
 * Shows locked/unlocked state, rewards, and completion percentage.
 * Auto-updates via AchievementManager integration.
 */
export function AchievementPanel() {
  const { gameMode } = useGameStore();
  const [expanded, setExpanded] = useState(false);
  const [achievements, setAchievements] = useState(
    AchievementManager.getInstance().getAll()
  );

  // Sync with AchievementManager updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAchievements([...AchievementManager.getInstance().getAll()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hide in non-exploration modes
  if (gameMode === 'shop' || gameMode === 'garage' || gameMode === 'paused') return null;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className={`absolute top-4 left-4 z-40 transition-all duration-300 ${expanded ? 'w-80' : 'w-12'}`}>
      {/* Toggle button / header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full bg-black/70 backdrop-blur-md rounded-xl border border-slate-700 p-3 flex items-center gap-3 hover:bg-slate-800/70 transition-colors ${expanded ? 'justify-between' : 'justify-center'}`}
      >
        {expanded ? (
          <>
            <span className="text-white font-bold text-sm">ACHIEVEMENTS</span>
            <span className="text-indigo-400 text-xs font-bold">{unlockedCount}/{totalCount}</span>
            <span className="text-slate-400 text-xl leading-none">&times;</span>
          </>
        ) : (
          <span className="text-2xl">🏆</span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
          {achievements.map(ach => {
            const progress = Math.min(100, Math.round((ach.progress / ach.maxProgress) * 100));
            return (
              <div
                key={ach.id}
                className={`p-3 rounded-lg border transition-all ${
                  ach.unlocked
                    ? 'bg-green-900/30 border-green-700/50'
                    : 'bg-slate-800/40 border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold ${ach.unlocked ? 'text-green-400' : 'text-slate-300'}`}>
                    {ach.title}
                  </span>
                  {ach.unlocked && <span className="text-green-400 text-xs">✓</span>}
                </div>
                <p className="text-[10px] text-slate-400 mb-2 leading-tight">{ach.description}</p>
                
                {/* Progress bar */}
                {!ach.unlocked && (
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                
                {/* Reward preview */}
                {(ach.unlocked || progress > 0) && (
                  <div className="flex gap-2 text-[10px] text-slate-500">
                    {ach.reward.coins > 0 && <span>🪙{ach.reward.coins}</span>}
                    {ach.reward.xp > 0 && <span>✨{ach.reward.xp}XP</span>}
                    {ach.reward.item && <span>🎁Item</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}