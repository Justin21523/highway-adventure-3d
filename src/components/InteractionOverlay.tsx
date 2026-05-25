/**
 * InteractionOverlay — Context-sensitive interaction prompts.
 *
 * Displays prompts like "Press E to enter shop" when the player
 * is near interactable objects.
 */

import { useShopStore } from '@/stores/shopStore';
import { useGameStore } from '@/stores/gameStore';

/* ─────────────────────────────────────────────
 * InteractionOverlay Component
 * ───────────────────────────────────────────── */

export function InteractionOverlay() {
  const isNearShop = useShopStore((state) => state.isNearShop);
  const nearShopId = useShopStore((state) => state.nearShopId);
  const activeShops = useShopStore((state) => state.activeShops);
  const gameMode = useGameStore((state) => state.gameMode);

  if (gameMode !== 'playing' && gameMode !== 'exploration') return null;

  if (!isNearShop || !nearShopId) return null;

  const shop = activeShops.get(nearShopId);
  if (!shop || !shop.isOpen) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2">
      <div className="rounded-lg bg-black/70 px-6 py-3 text-center backdrop-blur-sm">
        <div className="text-lg font-bold text-white">Press E</div>
        <div className="text-sm text-gray-300">Enter {shop.name}</div>
      </div>
    </div>
  );
}
