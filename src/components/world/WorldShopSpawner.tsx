import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useWorldStore } from '@/stores/worldStore';
import { useShopStore } from '@/stores/shopStore';
import { SHOP_ITEM_ASSIGNMENTS, SHOP_NAMES } from '@/constants/shops';
import type { Shop, ShopCategory } from '@/types/shop';
import { zoneAtChunk } from '@/systems/ZoneManager';
import type { ZoneType } from '@/types/core';

const SHOP_CHUNK_SIZE = 100;
const SHOP_RADIUS = 4;

const CITY_CATEGORIES: ShopCategory[] = [
  'convenienceStore',
  'coffeeShop',
  'restaurant',
  'shoppingMall',
  'garage',
];

const HIGHWAY_CATEGORIES: ShopCategory[] = ['gasStation', 'restStop', 'restaurant'];

function hash2(cx: number, cz: number, salt = 0) {
  return ((cx * 73856093) ^ (cz * 19349663) ^ (salt * 83492791)) >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pickName(category: ShopCategory, rng: () => number, cx: number, cz: number) {
  const names = SHOP_NAMES[category];
  const base = names[Math.floor(rng() * names.length)] ?? 'Roadside Shop';
  return `${base} ${Math.abs(cx)}-${Math.abs(cz)}`;
}

function buildShop(
  cx: number,
  cz: number,
  index: number,
  category: ShopCategory,
  x: number,
  z: number,
  rng: () => number,
): Shop {
  const isMall = category === 'shoppingMall';
  const isGarage = category === 'garage';
  const isHighway = category === 'gasStation' || category === 'restStop';
  const width = isMall ? 24 : isGarage ? 16 : 10 + rng() * 5;
  const depth = isMall ? 20 : isGarage ? 14 : 8 + rng() * 5;
  const height = isMall ? 18 + rng() * 10 : isHighway ? 7 + rng() * 4 : 8 + rng() * 18;

  return {
    id: `shop_${cx}_${cz}_${index}`,
    name: pickName(category, rng, cx, cz),
    category,
    position: { x, y: 0, z },
    rotation: category === 'gasStation' || category === 'restStop' ? 0 : rng() * Math.PI * 2,
    chunkId: `${cx}_${cz}`,
    items: SHOP_ITEM_ASSIGNMENTS[category] ?? [],
    interactionRadius: isMall ? 15 : 10,
    isOpen: true,
    openHour: 0,
    closeHour: 24,
    buildingWidth: width,
    buildingDepth: depth,
    buildingHeight: height,
    signColor: category === 'garage' ? '#38bdf8' : category === 'shoppingMall' ? '#a78bfa' : '#fbbf24',
    signText: category,
    hasPromotion: rng() > 0.78,
    promotionText: 'Today Special',
    promotionDiscount: 10 + Math.floor(rng() * 25),
  };
}

/** How many storefronts a chunk gets, keyed off its district. */
function shopCountForZone(zone: ZoneType, rng: () => number): number {
  switch (zone) {
    case 'cityCenter':
      return 4 + Math.floor(rng() * 3); // 4-6 dense commercial
    case 'suburban':
      return 1 + Math.floor(rng() * 2); // 1-2 corner stores
    case 'industrial':
      return rng() < 0.4 ? 1 : 0;
    case 'countryside':
    default:
      return rng() < 0.3 ? 1 : 0; // sparse roadside
  }
}

/**
 * Shops for a chunk, driven by the authoritative zone (ZoneManager) rather than
 * hardcoded coordinates. Determinism is preserved via the same seeded rng — only
 * the count/category branch on zone.
 */
function generateChunkShops(cx: number, cz: number): Shop[] {
  const rng = mulberry32(hash2(cx, cz, 5101));
  const shops: Shop[] = [];
  const centerX = cx * SHOP_CHUNK_SIZE;
  const centerZ = cz * SHOP_CHUNK_SIZE;
  const zone = zoneAtChunk(cx, cz);

  if (zone === 'highway') {
    // Highway corridor: an occasional gas/rest stop just off the deck.
    if (rng() < 0.5) {
      const side = rng() < 0.5 ? -1 : 1;
      const category = HIGHWAY_CATEGORIES[Math.floor(rng() * HIGHWAY_CATEGORIES.length)];
      shops.push(buildShop(
        cx,
        cz,
        0,
        category,
        centerX + side * (34 + rng() * 18),
        centerZ + (rng() - 0.5) * 48,
        rng,
      ));
    }
    return shops;
  }

  const count = shopCountForZone(zone, rng);
  for (let i = 0; i < count; i++) {
    const category = CITY_CATEGORIES[Math.floor(rng() * CITY_CATEGORIES.length)];
    const edgeBias = rng() < 0.5 ? -1 : 1;
    const x = centerX + edgeBias * (18 + rng() * 28);
    const z = centerZ - 42 + i * (84 / Math.max(1, count - 1)) + (rng() - 0.5) * 14;
    shops.push(buildShop(cx, cz, i, category, x, z, rng));
  }

  return shops;
}

export function WorldShopSpawner() {
  const loadedIdsRef = useRef<Set<string>>(new Set());
  const lastChunkRef = useRef('unset');

  useFrame(() => {
    const { playerPosition } = useWorldStore.getState();
    const cx = Math.round(playerPosition.x / SHOP_CHUNK_SIZE);
    const cz = Math.round(playerPosition.z / SHOP_CHUNK_SIZE);
    const key = `${cx}_${cz}`;
    if (key === lastChunkRef.current) return;
    lastChunkRef.current = key;

    const requiredIds = new Set<string>();
    const shopStore = useShopStore.getState();

    for (let dx = -SHOP_RADIUS; dx <= SHOP_RADIUS; dx++) {
      for (let dz = -SHOP_RADIUS; dz <= SHOP_RADIUS; dz++) {
        const chunkShops = generateChunkShops(cx + dx, cz + dz);
        for (const shop of chunkShops) {
          requiredIds.add(shop.id);
          if (!loadedIdsRef.current.has(shop.id)) {
            shopStore.registerShop(shop);
            loadedIdsRef.current.add(shop.id);
          }
        }
      }
    }

    for (const shopId of Array.from(loadedIdsRef.current)) {
      if (requiredIds.has(shopId)) continue;
      shopStore.unregisterShop(shopId);
      loadedIdsRef.current.delete(shopId);
    }
  });

  return null;
}
