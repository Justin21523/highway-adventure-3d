// src/components/ui/HUD.tsx
import { useGameStore } from '../../store/gameStore';

export function HUD() {
  const vehicle = useGameStore(state => state.vehicle);
  const profile = useGameStore(state => state.profile);
  const gameMode = useGameStore(state => state.gameMode);
  const activeQuest = useGameStore(state => state.activeQuest);
  const setGameMode = useGameStore(state => state.setGameMode);

  if (gameMode === 'shop' || gameMode === 'garage' || gameMode === 'paused') return null;

  const rpmPercent = Math.min((vehicle.rpm / 8000) * 100, 100);
  const healthPercent = Math.max(0, (vehicle.health / vehicle.maxHealth) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* Top Left: Quest */}
      <div className="absolute top-4 left-4 space-y-2 pointer-events-auto">
        {activeQuest && activeQuest.status === 'active' && (
          <div className="bg-black/70 backdrop-blur p-3 rounded-lg border-l-4 border-indigo-500 text-white max-w-xs shadow-lg">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Current Objective</p>
            <p className="text-sm font-medium">{activeQuest.title}</p>
            {activeQuest.objectives.map(obj => (
              <div key={obj.id} className="text-xs text-slate-400 mt-1 flex justify-between">
                <span>• {obj.type.replace(/_/g, ' ')}</span>
                <span className={obj.isCompleted ? 'text-green-400' : 'text-white'}>{Math.floor(obj.current)}/{obj.target}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Right: Wallet & Pause */}
      <div className="absolute top-4 right-4 flex gap-3">
        <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg border border-yellow-500/30 shadow-lg">
          <span className="text-yellow-400 font-bold text-lg">{profile.coins}</span>
          <span className="text-yellow-600 text-xs ml-1">💰</span>
        </div>
        <button onClick={() => setGameMode('paused')} className="bg-black/70 backdrop-blur px-3 py-2 rounded-lg border border-slate-600 text-white font-bold hover:bg-slate-700 transition-colors pointer-events-auto shadow-lg">
          ⏸
        </button>
      </div>

      {/* Bottom Left: Status Bars */}
      <div className="absolute bottom-6 left-6 w-48 space-y-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-300 font-mono"><span>HEALTH</span><span>{healthPercent.toFixed(0)}%</span></div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${healthPercent}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-300 font-mono"><span>FUEL</span><span>{vehicle.fuel.toFixed(0)}%</span></div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className={`h-full transition-all duration-300 ${vehicle.fuel < 20 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} style={{ width: `${vehicle.fuel}%` }} />
          </div>
        </div>
      </div>

      {/* Bottom Right: Speed & Gear */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3">
        <div className={`px-3 py-1 rounded-md text-xs font-bold tracking-widest transition-all duration-200 shadow-lg ${vehicle.isDrifting ? 'bg-orange-500/90 text-white scale-110' : 'bg-transparent text-transparent'}`}>
          🌪️ DRIFTING
        </div>
        <div className={`px-3 py-1 rounded-md text-xs font-bold tracking-widest transition-all duration-200 shadow-lg ${vehicle.isBoosting ? 'bg-cyan-500/90 text-white scale-110' : 'bg-transparent text-transparent'}`}>
          🔥 BOOST
        </div>
        
        <div className="w-44 h-44 bg-black/80 backdrop-blur-xl rounded-full border-4 border-slate-700 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={rpmPercent > 85 ? '#ef4444' : '#6366f1'} strokeWidth="6" strokeDasharray="283" strokeDashoffset={283 - (283 * rpmPercent) / 100} strokeLinecap="round" className="transition-all duration-75" />
          </svg>
          <span className="text-5xl font-black text-white tabular-nums relative z-10">{Math.round(vehicle.speed)}</span>
          <span className="text-slate-400 text-xs tracking-widest mt-1">KM/H</span>
          <div className="flex gap-1 mt-2 relative z-10">
            <span className="text-indigo-400 font-mono text-lg font-bold bg-indigo-900/50 px-2 rounded border border-indigo-500/30">N{vehicle.gear}</span>
          </div>
        </div>
      </div>

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1 h-4 bg-white/30 mx-auto" />
        <div className="h-1 w-4 bg-white/30 my-1" />
      </div>

      {/* Controls Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-mono">
        WASD/ARROWS: Drive | SPACE: Handbrake | SHIFT: Boost | Q: Quest | G: Garage
      </div>
    </div>
  );
}