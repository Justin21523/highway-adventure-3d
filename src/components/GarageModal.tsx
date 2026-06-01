/**
 * GarageModal — Vehicle garage and upgrade UI.
 *
 * Displays available vehicles, upgrades, and current vehicle stats.
 */

import { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { VEHICLE_CONFIGS } from '@/constants/vehicles';
import { effectiveVehicleStats } from '@/systems/VehicleUpgradeSystem';

type Tab = 'vehicles' | 'upgrades' | 'paint' | 'service';

const UPGRADE_CATALOG = [
  { id: 'part_engine_v1', name: 'Engine V1', desc: '+15 top speed', cost: 1500 },
  { id: 'part_turbo', name: 'Turbo Kit', desc: '+45 top speed, +accel', cost: 4200 },
  { id: 'part_tires_racing', name: 'Racing Tires', desc: '+handling, +grip', cost: 3000 },
  { id: 'part_suspension', name: 'Sport Suspension', desc: '+handling', cost: 2400 },
  { id: 'item_fuel_tank', name: 'Big Fuel Tank', desc: '+fuel capacity', cost: 1800 },
] as const;

const PAINT_COLORS = ['#e63946', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#0ea5e9', '#1f2937', '#e2e8f0'];

/* ─────────────────────────────────────────────
 * GarageModal Component
 * ───────────────────────────────────────────── */

export function GarageModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const vehicle = useGameStore((state) => state.vehicle);
  const profile = useGameStore((state) => state.profile);
  const [tab, setTab] = useState<Tab>('vehicles');

  if (!isOpen) return null;

  const equipVehicle = useGameStore.getState().equipVehicle;
  const purchaseVehicle = useGameStore.getState().purchaseVehicle;
  const setPaint = useGameStore.getState().setPaint;
  const addNotification = useGameStore.getState().addNotification;

  const buyVehicle = (id: string, name: string) => {
    if (purchaseVehicle(id)) {
      equipVehicle(id);
      addNotification(`Purchased ${name}!`, 'success');
    } else {
      addNotification('Not enough coins!', 'error');
    }
  };

  const buyUpgrade = (id: string, name: string, cost: number) => {
    if (profile.inventory.includes(id)) return;
    if (!useGameStore.getState().spendCoins(cost)) {
      addNotification('Not enough coins!', 'error');
      return;
    }
    useGameStore.getState().addItemToInventory(id);
    // Re-equip the current vehicle so the new part applies to physics immediately.
    equipVehicle(profile.equippedVehicle);
    addNotification(`${name} installed!`, 'success');
  };

  const service = (kind: 'repair' | 'fuel') => {
    const v = useGameStore.getState().vehicle;
    const missing = kind === 'repair' ? v.maxHealth - v.health : 100 - v.fuel;
    if (missing <= 0) return;
    const cost = Math.ceil(missing * (kind === 'repair' ? 10 : 8));
    if (!useGameStore.getState().spendCoins(cost)) { addNotification('Not enough coins!', 'error'); return; }
    useGameStore.getState().updateVehicleState(kind === 'repair' ? { health: v.maxHealth } : { fuel: 100 });
    addNotification(kind === 'repair' ? 'Repaired!' : 'Refueled!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-white/20 bg-gray-900/95 p-6 backdrop-blur-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🔧 Garage</h2>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="text-cyan-300">Rank {profile.rank}</span>
            <span className="text-yellow-400">{profile.coins.toLocaleString()} 🪙</span>
            <button onClick={onClose} className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">✕</button>
          </div>
        </div>

        {/* Current vehicle stats */}
        <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-gray-800 p-3">
          <StatBar label="Top Speed" value={vehicle.maxSpeed} max={360} unit="km/h" color="blue" />
          <StatBar label="Health" value={vehicle.health} max={vehicle.maxHealth} unit="%" color={vehicle.health > 50 ? 'green' : 'red'} />
          <StatBar label="Fuel" value={vehicle.fuel} max={100} unit="%" color={vehicle.fuel > 30 ? 'yellow' : 'orange'} />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          {(['vehicles', 'upgrades', 'paint', 'service'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {t === 'vehicles' ? '車輛' : t === 'upgrades' ? '升級' : t === 'paint' ? '外觀' : '維修'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {tab === 'vehicles' && (
            <div className="space-y-3">
              {VEHICLE_CONFIGS.map((cfg) => {
                const owned = profile.unlockedVehicles.includes(cfg.id);
                const equipped = profile.equippedVehicle === cfg.id;
                const stats = effectiveVehicleStats(cfg.id, profile.inventory);
                return (
                  <div key={cfg.id} className={`rounded-lg border p-4 ${equipped ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white">{cfg.name} <span className="text-xs font-normal text-gray-400">· {cfg.category}</span></h4>
                        <p className="text-xs text-gray-400">速度 {stats.maxSpeed} · 加速 {stats.accelMult.toFixed(2)}× · 操控 {stats.handlingMult.toFixed(2)}×</p>
                      </div>
                      {equipped ? (
                        <span className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white">使用中</span>
                      ) : owned ? (
                        <button onClick={() => equipVehicle(cfg.id)} className="rounded bg-green-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-green-500">裝備</button>
                      ) : (
                        <button onClick={() => buyVehicle(cfg.id, cfg.name)} className="rounded bg-yellow-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-yellow-500">{cfg.price.toLocaleString()} 🪙</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'upgrades' && (
            <div className="space-y-3">
              {UPGRADE_CATALOG.map((u) => {
                const owned = profile.inventory.includes(u.id);
                return (
                  <div key={u.id} className={`rounded-lg border p-4 ${owned ? 'border-green-600/50 bg-green-900/10' : 'border-yellow-500/40 bg-yellow-900/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white">{u.name}</h4>
                        <p className="text-xs text-gray-400">{u.desc}</p>
                      </div>
                      {owned ? (
                        <span className="rounded bg-green-700 px-3 py-1.5 text-sm font-bold text-white">已安裝</span>
                      ) : (
                        <button onClick={() => buyUpgrade(u.id, u.name, u.cost)} className="rounded bg-yellow-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-yellow-500">{u.cost.toLocaleString()} 🪙</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'paint' && (
            <div className="flex flex-wrap gap-3">
              {PAINT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPaint(c)}
                  className={`h-14 w-14 rounded-lg border-2 transition ${vehicle.paintColor === c ? 'border-white scale-110' : 'border-gray-600'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`paint ${c}`}
                />
              ))}
            </div>
          )}

          {tab === 'service' && (
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => service('repair')} className="rounded-lg bg-green-600 px-4 py-4 text-white hover:bg-green-500">
                <div className="text-lg font-bold">🔧 全車維修</div>
                <div className="text-sm text-gray-200">恢復滿血（每點 10🪙）</div>
              </button>
              <button onClick={() => service('fuel')} className="rounded-lg bg-orange-600 px-4 py-4 text-white hover:bg-orange-500">
                <div className="text-lg font-bold">⛽ 加滿油</div>
                <div className="text-sm text-gray-200">加滿油箱（每點 8🪙）</div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * StatBar Component
 * ───────────────────────────────────────────── */

function StatBar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const percent = Math.min((value / max) * 100, 100);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-white">
          {Math.round(value)}{unit && ` ${unit}`}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${colorMap[color] || 'bg-blue-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * UpgradeCard Component
 * ───────────────────────────────────────────── */

function UpgradeCard({
  name,
  description,
  cost,
  level,
  onUpgrade,
}: {
  name: string;
  description: string;
  cost: number;
  level: number;
  onUpgrade: () => void;
}) {
  const canAfford = level >= 1; // Simplified cost check

  return (
    <div className={`rounded-lg border p-4 ${!canAfford ? 'border-gray-700 bg-gray-800/50 opacity-50' : 'border-yellow-500/50 bg-yellow-900/20'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-bold text-white">{name}</h4>
        <span className="text-sm font-bold text-yellow-400">{cost} 🪙</span>
      </div>

      <p className="mb-3 text-sm text-gray-300">{description}</p>

      <button
        onClick={onUpgrade}
        disabled={!canAfford}
        className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Upgrade
      </button>
    </div>
  );
}
