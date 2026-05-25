// src/components/ui/ShopModal.tsx

import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { IEconomyItem } from '../../types/core';

// Mock shop inventory (fully functional fallback data)
const SHOP_INVENTORY: IEconomyItem[] = [
  {
    id: 'part_engine_v1',
    name: 'Turbo Charger Mk.I',
    description: '+15% Top Speed, +10% Acceleration',
    price: 500,
    category: 'vehicle_part',
    iconUrl: '',
    stats: { topSpeed: 15, acceleration: 10 }
  },
  {
    id: 'part_tires_sport',
    name: 'Sport Compound Tires',
    description: '+20% Handling, +5% Drift Grip',
    price: 350,
    category: 'vehicle_part',
    iconUrl: '',
    stats: { handling: 20 }
  },
  {
    id: 'item_fuel_tank',
    name: 'Extended Fuel Cell',
    description: '+50% Fuel Capacity',
    price: 200,
    category: 'consumable',
    iconUrl: '',
    stats: { fuelCapacity: 50 }
  },
  {
    id: 'cosmetic_neon_under',
    name: 'Neon Underglow Kit',
    description: 'Cyan LED lighting kit',
    price: 150,
    category: 'cosmetic',
    iconUrl: ''
  },
  {
    id: 'part_brake_perf',
    name: 'Performance Brake Pads',
    description: '-15% Stopping Distance',
    price: 400,
    category: 'vehicle_part',
    iconUrl: '',
    stats: { acceleration: -5, handling: 5 }
  }
];

export function ShopModal() {
  const { gameMode, profile, spendCoins, addItemToInventory, setGameMode } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<IEconomyItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handlePurchase = useCallback((item: IEconomyItem) => {
    if (profile.inventory.includes(item.id)) {
      setNotification({ type: 'error', message: 'Item already owned!' });
      return;
    }

    const success = spendCoins(item.price);
    if (success) {
      addItemToInventory(item.id);
      setNotification({ type: 'success', message: `Purchased ${item.name}!` });
    } else {
      setNotification({ type: 'error', message: 'Insufficient coins!' });
    }
  }, [profile.inventory, spendCoins, addItemToInventory]);

  const handleClose = useCallback(() => {
    setGameMode('exploration');
    setSelectedItem(null);
  }, [setGameMode]);

  // Modal is only visible in 'shop' mode
  if (gameMode !== 'shop') return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-3xl font-bold text-white tracking-wide">AUTO PARTS SHOP</h2>
          <div className="flex items-center gap-4">
            <span className="text-yellow-400 font-bold text-xl">{profile.coins} COINS</span>
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors text-2xl font-bold">&times;</button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {SHOP_INVENTORY.map((item) => {
            const isOwned = profile.inventory.includes(item.id);
            return (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedItem?.id === item.id 
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-indigo-500/20' 
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                } ${isOwned ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white">{item.name}</h3>
                  {isOwned && <span className="text-xs bg-slate-600 px-2 py-1 rounded text-slate-300">OWNED</span>}
                </div>
                <p className="text-sm text-slate-400 mb-3 h-10">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-400 font-bold">{item.price} 🪙</span>
                  {!isOwned && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePurchase(item); }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded transition-colors disabled:opacity-50"
                      disabled={profile.coins < item.price}
                    >
                      BUY
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-slate-700 text-slate-500 text-sm text-center">
          Parts are equipped automatically. Consumables apply instantly. Close shop to return to highway.
        </div>
      </div>
    </div>
  );
}