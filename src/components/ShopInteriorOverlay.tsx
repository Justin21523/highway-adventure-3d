import { useShopStore } from '@/stores/shopStore';
import { useGameStore } from '@/stores/gameStore';
import { ITEM_CATALOG_MAP } from '@/constants/shops';
import { ShopSystem } from '@/systems/ShopSystem';
import { formatCoins } from '@/utils/format';

export function ShopInteriorOverlay() {
  const shopId = useShopStore((state) => state.interiorShopId);
  const shop = useShopStore((state) => (shopId ? state.activeShops.get(shopId) : undefined));
  const inventory = useShopStore((state) => state.inventory);
  const profile = useGameStore((state) => state.profile);

  if (!shop) return null;

  const exit = () => {
    useShopStore.getState().exitShopInterior();
    useGameStore.getState().setGameMode('playing');
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute left-4 top-4 max-w-sm rounded-lg border border-white/15 bg-black/70 p-4 text-white backdrop-blur">
        <div className="text-lg font-bold">{shop.name}</div>
        <div className="text-xs uppercase tracking-wide text-gray-300">{shop.category}</div>
        <div className="mt-3 text-xs text-gray-300">WASD / Arrow keys to walk. Press X or Esc to leave.</div>
      </div>

      <div className="pointer-events-auto absolute right-4 top-4 w-80 rounded-lg border border-white/15 bg-gray-950/85 p-4 text-white backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-bold">Counter</div>
          <div className="text-sm text-yellow-300">{formatCoins(profile.coins)}</div>
        </div>
        <div className="space-y-2">
          {shop.items.map((itemId) => {
            const item = ITEM_CATALOG_MAP[itemId];
            if (!item) return null;
            const disabled = profile.coins < item.price || profile.level < item.levelRequirement;
            return (
              <button
                key={item.id}
                onClick={() => ShopSystem.getInstance().purchaseItem(item.id)}
                disabled={disabled}
                className="w-full rounded border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-sm text-yellow-300">{formatCoins(item.price)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-300">{item.description}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="mb-2 text-sm font-semibold">Inventory</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            {inventory.length === 0 ? (
              <div className="col-span-2 text-gray-500">Empty</div>
            ) : (
              inventory.map((item) => (
                <div key={item.itemId} className="rounded bg-white/5 px-2 py-1">
                  {item.itemId} x{item.quantity}
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={exit}
          className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
        >
          Exit To Street
        </button>
      </div>
    </div>
  );
}
