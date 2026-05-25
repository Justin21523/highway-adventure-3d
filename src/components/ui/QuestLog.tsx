// src/components/ui/QuestLog.tsx
import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function QuestLog() {
  const activeQuest = useGameStore((state) => state.activeQuest);
  const gameMode = useGameStore((state) => state.gameMode);
  const startQuest = useGameStore((state) => state.startQuest);
  const availableQuests = useGameStore((state) => state.availableQuests);

  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    const handleToggle = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setShowLog((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleToggle);
    return () => window.removeEventListener('keydown', handleToggle);
  }, []);

  if (!showLog && !activeQuest) return null;
  if (gameMode === 'shop' || gameMode === 'paused') return null;

  return (
    <div className="absolute top-24 left-6 w-72 bg-black/60 backdrop-blur-md rounded-xl border border-slate-700 p-4 pointer-events-auto transition-all duration-300 shadow-2xl">
      <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
        <h3 className="text-lg font-bold text-indigo-400 tracking-wide">MISSION LOG</h3>
        <button onClick={() => setShowLog(false)} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">&times;</button>
      </div>

      {activeQuest ? (
        <div className="space-y-3">
          <div>
            <p className="text-white font-semibold text-sm uppercase">{activeQuest.title}</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">{activeQuest.description}</p>
          </div>
          <div className="space-y-2.5">
            {activeQuest.objectives.map((obj) => (
              <div key={obj.id} className="text-xs">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="capitalize">{obj.type.replace(/_/g, ' ')}</span>
                  <span className={obj.isCompleted ? 'text-green-400 font-bold' : 'text-slate-400'}>
                    {Math.floor(obj.current)}/{obj.target}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${obj.isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, (obj.current / obj.target) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {activeQuest.status === 'completed' && (
            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs text-center font-bold animate-pulse">
              ✅ QUEST COMPLETE! REWARDS DISPENSED
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-400 text-xs text-center uppercase tracking-wider mb-2">Available Contracts</p>
          {availableQuests.length > 0 ? (
            availableQuests.slice(0, 3).map((q) => (
              <button
                key={q.id}
                onClick={() => startQuest(q.id)}
                className="w-full text-left p-3 bg-slate-800/40 hover:bg-indigo-600/20 border border-slate-700 hover:border-indigo-500 rounded-lg transition-all group"
              >
                <p className="text-white text-xs font-bold group-hover:text-indigo-300 uppercase">{q.title}</p>
                <p className="text-slate-500 text-[10px] mt-1 flex gap-2">
                  <span>{q.reward.coins} 🪙</span>
                  <span>•</span>
                  <span>{q.reward.xp} XP</span>
                </p>
              </button>
            ))
          ) : (
            <div className="text-center py-4 text-slate-600 text-xs">No available missions nearby.</div>
          )}
        </div>
      )}
    </div>
  );
}