/**
 * GarageModal — Vehicle garage and upgrade UI.
 *
 * Displays available vehicles, upgrades, and current vehicle stats.
 */

import { useGameStore } from '@/stores/gameStore';
import { formatSpeed, formatDecimal } from '@/utils/format';

/* ─────────────────────────────────────────────
 * GarageModal Component
 * ───────────────────────────────────────────── */

export function GarageModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const vehicle = useGameStore((state) => state.vehicle);
  const profile = useGameStore((state) => state.profile);
  const updateVehicleState = useGameStore((state) => state.updateVehicleState);
  const spendCoins = useGameStore((state) => state.spendCoins);
  const addNotification = useGameStore((state) => state.addNotification);

  if (!isOpen) return null;

  const handleUpgrade = (upgradeName: string, cost: number, applyUpgrade: (v: typeof vehicle) => typeof vehicle) => {
    if (!spendCoins(cost)) {
      addNotification(`Insufficient coins for ${upgradeName}!`);
      return;
    }
    updateVehicleState(applyUpgrade(vehicle));
    addNotification(`${upgradeName} upgraded!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-xl border border-white/20 bg-gray-900/95 p-6 backdrop-blur-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🔧 Garage</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            ✕ Close
          </button>
        </div>

        {/* Current vehicle stats */}
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
          <h3 className="mb-3 text-lg font-bold text-blue-400">Current Vehicle</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatBar label="Speed" value={vehicle.speed} max={vehicle.maxSpeed} unit="km/h" color="blue" />
            <StatBar label="Health" value={vehicle.health} max={100} unit="%" color={vehicle.health > 50 ? 'green' : 'red'} />
            <StatBar label="Fuel" value={vehicle.fuel} max={100} unit="%" color={vehicle.fuel > 30 ? 'yellow' : 'orange'} />
            <StatBar label="XP" value={profile.xp} max={profile.xpToNext} unit="" color="purple" />
          </div>
        </div>

        {/* Vehicle actions */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => updateVehicleState({ health: Math.min(vehicle.maxHealth, vehicle.health + 25) })}
            className="rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-500"
          >
            <div className="text-lg font-bold">🔧 Repair</div>
            <div className="text-sm text-gray-300">+25 Health</div>
          </button>

          <button
            onClick={() => updateVehicleState({ fuel: Math.min(100, vehicle.fuel + 25) })}
            className="rounded-lg bg-orange-600 px-4 py-3 text-white hover:bg-orange-500"
          >
            <div className="text-lg font-bold">⛽ Refuel</div>
            <div className="text-sm text-gray-300">+25 Fuel</div>
          </button>
        </div>

        {/* Upgrades */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-yellow-400">Upgrades</h3>
          <div className="space-y-3">
            <UpgradeCard
              name="Engine Tuning"
              description="Increase max speed by 20 km/h"
              cost={1000}
              level={profile.level}
              onUpgrade={() => handleUpgrade('Engine Tuning', 1000, (v) => ({ ...v, maxSpeed: v.maxSpeed + 20 }))}
            />
            <UpgradeCard
              name="Fuel Tank"
              description="Increase fuel capacity by 25%"
              cost={800}
              level={profile.level}
              onUpgrade={() => handleUpgrade('Fuel Tank', 800, (v) => ({ ...v, fuel: Math.min(100, v.fuel + 25) }))}
            />
            <UpgradeCard
              name="Armor Plating"
              description="Increase max health by 25"
              cost={1200}
              level={profile.level}
              onUpgrade={() => handleUpgrade('Armor Plating', 1200, (v) => ({ ...v, health: Math.min(100, v.health + 25) }))}
            />
          </div>
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
