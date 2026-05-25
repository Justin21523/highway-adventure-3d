/**
 * ShopModal — Shop interaction modal.
 *
 * Displays shop inventory, allows purchases, and shows player inventory.
 */

import { useShopStore } from '@/stores/shopStore';
import { useGameStore } from '@/stores/gameStore';
import { ITEM_CATALOG_MAP } from '@/constants/shops';
import { formatCoins, formatDecimal } from '@/utils/format';

/* ─────────────────────────────────────────────
 * ShopModal Component
 * ───────────────────────────────────────────── */

export function ShopModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const openShop = useShopStore((state) => state.openShopData);
  const inventory = useShopStore((state) => state.inventory);
  const purchaseItem = useShopStore((state) => state.purchaseItem);
  const profile = useGameStore((state) => state.profile);

  if (!isOpen || !openShop) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl rounded-xl border border-white/20 bg-gray-900/95 p-6 backdrop-blur-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{openShop.name}</h2>
            <p className="text-sm text-gray-400">{openShop.category}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            ✕ Close
          </button>
        </div>

        {/* Player coins */}
        <div className="mb-4 rounded-lg bg-gray-800 p-3">
          <div className="text-lg font-bold text-yellow-400">{formatCoins(profile.coins)}</div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Shop items */}
          <div>
            <h3 className="mb-3 text-lg font-bold text-blue-400">Shop Items</h3>
            <div className="space-y-3">
              {openShop.items.map((itemId) => {
                const item = ITEM_CATALOG_MAP[itemId];
                if (!item) return null;

                return (
                  <ShopItemCard
                    key={itemId}
                    item={item}
                    canAfford={profile.coins >= item.price}
                    meetsLevel={profile.level >= item.levelRequirement}
                    onPurchase={() => purchaseItem(itemId)}
                  />
                );
              })}
            </div>
          </div>

          {/* Player inventory */}
          <div>
            <h3 className="mb-3 text-lg font-bold text-green-400">Your Inventory</h3>
            <div className="space-y-2">
              {inventory.length === 0 ? (
                <div className="rounded-lg bg-gray-800 p-4 text-center text-gray-400">
                  Empty
                </div>
              ) : (
                inventory.map((invItem, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg bg-gray-800 p-3">
                    <div>
                      <div className="font-bold text-white">{invItem.name}</div>
                      <div className="text-xs text-gray-400">Qty: {invItem.quantity}</div>
                    </div>
                    <button className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500">
                      Use
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Promotion banner */}
        {openShop.hasPromotion && (
          <div className="mt-4 rounded-lg bg-gradient-to-r from-yellow-500/30 to-orange-500/30 p-3 text-center">
            <div className="text-lg font-bold text-yellow-300">{openShop.promotionText}</div>
            <div className="text-sm text-gray-300">
              {openShop.promotionDiscount}% off selected items
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * ShopItemCard Component
 * ───────────────────────────────────────────── */

function ShopItemCard({
  item,
  canAfford,
  meetsLevel,
  onPurchase,
}: {
  item: ReturnType<typeof ITEM_CATALOG_MAP>[string];
  canAfford: boolean;
  meetsLevel: boolean;
  onPurchase: () => void;
}) {
  return (
    <div className={`rounded-lg border p-4 ${!canAfford || !meetsLevel ? 'border-gray-700 bg-gray-800/50 opacity-50' : 'border-blue-500/50 bg-blue-900/20'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-bold text-white">{item.name}</h4>
        <span className="text-sm font-bold text-yellow-400">{formatCoins(item.price)}</span>
      </div>

      <p className="mb-2 text-sm text-gray-300">{item.description}</p>

      {item.levelRequirement > 1 && (
        <div className="mb-2 text-xs text-gray-400">
          Requires Level {item.levelRequirement}
        </div>
      )}

      {item.effects && item.effects.length > 0 && (
        <div className="mb-3 text-xs text-gray-400">
          Effects: {item.effects.map((e) => e.type).join(', ')}
        </div>
      )}

      <button
        onClick={onPurchase}
        disabled={!canAfford || !meetsLevel}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {canAfford && meetsLevel ? 'Purchase' : !canAfford ? 'Not Enough Coins' : 'Level Required'}
      </button>
    </div>
  );
}
