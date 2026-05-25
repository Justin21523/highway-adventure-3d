// src/components/ui/GarageModal.tsx
import { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

interface VehicleConfig {
  id: string;
  name: string;
  color: string;
  stats: { topSpeed: number; acceleration: number; handling: number };
  price: number;
}

const VEHICLE_CATALOG: VehicleConfig[] = [
  { id: 'veh_sedan_01', name: 'City Sedan', color: '#3b82f6', stats: { topSpeed: 140, acceleration: 60, handling: 70 }, price: 0 },
  { id: 'veh_sports_01', name: 'Apex Racer', color: '#e11d48', stats: { topSpeed: 220, acceleration: 85, handling: 80 }, price: 2000 },
  { id: 'veh_truck_01', name: 'Mud Runner', color: '#65a30d', stats: { topSpeed: 120, acceleration: 50, handling: 90 }, price: 2500 },
  { id: 'veh_hyper_01', name: 'Phantom GT', color: '#a855f7', stats: { topSpeed: 310, acceleration: 98, handling: 65 }, price: 8000 },
];

export function GarageModal() {
  const { gameMode, profile, spendCoins, setGameMode } = useGameStore();
  const [selectedId, setSelectedId] = useState(profile.equippedVehicle);

  const handleEquip = useCallback((vehId: string) => {
    const target = VEHICLE_CATALOG.find(v => v.id === vehId);
    if (!target) return;

    if (profile.unlockedVehicles.includes(vehId)) {
      useGameStore.setState({ profile: { ...profile, equippedVehicle: vehId } });
      setGameMode('exploration');
    } else {
      if (spendCoins(target.price)) {
        useGameStore.setState({
          profile: { ...profile, unlockedVehicles: [...profile.unlockedVehicles, vehId], equippedVehicle: vehId }
        });
        setGameMode('exploration');
      }
    }
  }, [profile, spendCoins, setGameMode]);

  if (gameMode !== 'garage') return null;

  const current = VEHICLE_CATALOG.find(v => v.id === selectedId) || VEHICLE_CATALOG[0];
  const isUnlocked = profile.unlockedVehicles.includes(current.id);
  const canAfford = profile.coins >= current.price;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-5xl bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-8 flex flex-col md:flex-row gap-8 max-h-[90vh]">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white tracking-wide">VEHICLE GARAGE</h2>
            <button onClick={() => setGameMode('exploration')} className="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
          </div>
          
          <div className="w-full h-48 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 120%, #4f46e5 0%, transparent 60%)' }} />
            <div className="w-40 h-16 rounded-2xl shadow-2xl transition-colors duration-300" style={{ backgroundColor: current.color }} />
            <p className="absolute bottom-3 right-4 text-slate-500 text-xs font-mono">PREVIEW MODE</p>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white mb-4">{current.name}</h3>
            <div className="space-y-3">
              {(['topSpeed', 'acceleration', 'handling'] as const).map((stat) => (
                <div key={stat} className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm w-24 capitalize">{stat.replace(/([A-Z])/g, ' $1')}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${current.stats[stat]}%` }} />
                  </div>
                  <span className="text-white text-sm font-bold w-10 text-right">{current.stats[stat]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 border-l border-slate-800 pl-0 md:pl-8 space-y-4">
          <h3 className="text-xl font-bold text-slate-300">FLEET</h3>
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {VEHICLE_CATALOG.map((veh) => {
              const unlocked = profile.unlockedVehicles.includes(veh.id);
              const selected = selectedId === veh.id;
              return (
                <button
                  key={veh.id}
                  onClick={() => setSelectedId(veh.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-bold">{veh.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${unlocked ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {unlocked ? 'OWNED' : `${veh.price} 🪙`}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>SPD: {veh.stats.topSpeed}</span>
                    <span>ACC: {veh.stats.acceleration}</span>
                    <span>HND: {veh.stats.handling}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handleEquip(selectedId)}
            disabled={!canAfford && !isUnlocked}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isUnlocked
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : canAfford
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isUnlocked ? 'EQUIP & DRIVE' : canAfford ? 'UNLOCK & EQUIP' : 'INSUFFICIENT FUNDS'}
          </button>
        </div>
      </div>
    </div>
  );
}