// src/components/ui/GPSNavigator.tsx

import { useGameStore } from '../stores/gameStore';

export function GPSNavigator() {
  const { playerPosition, vehicle, activeQuest } = useGameStore();
  
  const headingDeg = -(vehicle.rotation.y * (180 / Math.PI)) % 360;
  const speed = Math.round(vehicle.speed);
  const fuel = vehicle.fuel;

  let targetDist: number | null = null;
  if (activeQuest && activeQuest.status === 'active') {
    const locObj = activeQuest.objectives.find(o => o.type === 'reachLocation' && o.location);
    if (locObj && locObj.location) {
      const dx = locObj.location.x - playerPosition.x;
      const dz = locObj.location.z - playerPosition.z;
      targetDist = Math.sqrt(dx * dx + dz * dz);
    }
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none">
      <div className="relative w-44 h-44 bg-black/70 backdrop-blur-md rounded-full border-4 border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden">
        {/* Rotating Compass Ring */}
        <div 
          className="absolute inset-0 transition-transform duration-100 ease-linear"
          style={{ transform: `rotate(${-headingDeg}deg)` }}
        >
          <div className="w-full h-full flex items-center justify-center relative">
            <span className="absolute top-3 text-xs font-bold text-red-500 drop-shadow-md">N</span>
            <span className="absolute bottom-3 text-xs font-bold text-slate-500">S</span>
            <span className="absolute left-3 text-xs font-bold text-slate-500">W</span>
            <span className="absolute right-3 text-xs font-bold text-slate-500">E</span>
            <div className="absolute inset-4 border border-slate-600 rounded-full opacity-40"></div>
            <div className="absolute inset-8 border border-slate-600 rounded-full opacity-20"></div>
          </div>
        </div>

        {/* Center Car Icon */}
        <div className="z-10 w-12 h-12 bg-indigo-600/90 rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg backdrop-blur-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4.5 15H8V22H16V15H19.5L12 2Z"/>
          </svg>
        </div>

        {/* Objective Distance Badge */}
        {targetDist !== null && (
          <div className="absolute top-3 right-3 bg-green-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md border border-green-400/50">
            📍 {targetDist.toFixed(0)}m
          </div>
        )}

        {/* Fuel Warning */}
        {fuel < 20 && (
          <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md animate-pulse border border-red-400/50">
            ⛽ LOW FUEL
          </div>
        )}

        {/* Speed Readout */}
        <div className="absolute -bottom-11 bg-slate-900/90 px-4 py-2 rounded-lg border border-slate-600 shadow-xl flex items-center gap-2 backdrop-blur-md">
          <span className="text-2xl font-bold text-white tabular-nums">{speed}</span>
          <span className="text-slate-400 text-xs font-medium">KM/H</span>
        </div>
      </div>
    </div>
  );
}