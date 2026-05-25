/**
 * ShopBuildings — Renders shop buildings from shopStore.
 *
 * Displays shop structures with signs, colors, and interaction zones.
 * Only renders shops that are currently active and visible.
 */

import { useMemo } from 'react';
import { useShopStore } from '@/stores/shopStore';
import { SHOP_COLORS, SHOP_NAMES } from '@/constants/shops';

/* ─────────────────────────────────────────────
 * ShopBuildings Component
 * ───────────────────────────────────────────── */

export function ShopBuildings() {
  const activeShops = useShopStore((state) => state.activeShops);

  const shopEntries = useMemo(() => Array.from(activeShops.entries()), [activeShops]);

  if (shopEntries.length === 0) return null;

  return (
    <group>
      {shopEntries.map(([shopId, shop]) => (
        <ShopBuilding key={shopId} shop={shop} />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Single ShopBuilding Component
 * ───────────────────────────────────────────── */

interface ShopBuildingProps {
  shop: import('@/types/shop').Shop;
}

function ShopBuilding({ shop }: ShopBuildingProps) {
  const color = SHOP_COLORS[shop.category] || '#888888';
  const isNear = useShopStore((state) => state.nearShopId === shop.id);

  return (
    <group
      position={[shop.position.x, shop.position.y, shop.position.z]}
      rotation={[0, shop.rotation, 0]}
    >
      {/* Building base */}
      <mesh position={[0, shop.buildingHeight / 2, 0]} castShadow>
        <boxGeometry args={[shop.buildingWidth, shop.buildingHeight, shop.buildingDepth]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, shop.buildingHeight + 0.5, 0]}>
        <boxGeometry args={[shop.buildingWidth + 1, 0.3, shop.buildingDepth + 1]} />
        <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Sign */}
      <mesh position={[0, shop.buildingHeight + 1.5, shop.buildingDepth / 2 + 0.1]}>
        <boxGeometry args={[shop.buildingWidth * 0.8, 1.2, 0.1]} />
        <meshStandardMaterial color={shop.signColor} emissive={shop.signColor} emissiveIntensity={isNear ? 0.5 : 0.2} />
      </mesh>

      {/* Sign text (represented as a white rectangle) */}
      <mesh position={[0, shop.buildingHeight + 1.5, shop.buildingDepth / 2 + 0.2]}>
        <boxGeometry args={[shop.buildingWidth * 0.6, 0.6, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Door */}
      <mesh position={[0, 1, shop.buildingDepth / 2 + 0.05]}>
        <boxGeometry args={[1.2, 2.5, 0.1]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>

      {/* Windows */}
      <mesh position={[-shop.buildingWidth * 0.25, shop.buildingHeight * 0.6, shop.buildingDepth / 2 + 0.05]}>
        <boxGeometry args={[1.2, 1, 0.05]} />
        <meshStandardMaterial color="#a8dadc" metalness={0.9} roughness={0.1} transparent opacity={0.5} />
      </mesh>
      <mesh position={[shop.buildingWidth * 0.25, shop.buildingHeight * 0.6, shop.buildingDepth / 2 + 0.05]}>
        <boxGeometry args={[1.2, 1, 0.05]} />
        <meshStandardMaterial color="#a8dadc" metalness={0.9} roughness={0.1} transparent opacity={0.5} />
      </mesh>

      {/* Interaction zone indicator (visible when near) */}
      {isNear && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[shop.interactionRadius - 0.5, shop.interactionRadius, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
