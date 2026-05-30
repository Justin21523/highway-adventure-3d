import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useShopStore } from '@/stores/shopStore';
import { SHOP_COLORS } from '@/constants/shops';
import type { ShopCategory } from '@/types/shop';

const WALK_SPEED = 9;
const TURN_SPEED = 2.8;

interface InteriorControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

function useInteriorInput() {
  const inputRef = useRef<InteriorControls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyW' || event.code === 'ArrowUp') inputRef.current.forward = true;
      if (event.code === 'KeyS' || event.code === 'ArrowDown') inputRef.current.backward = true;
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') inputRef.current.left = true;
      if (event.code === 'KeyD' || event.code === 'ArrowRight') inputRef.current.right = true;
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.code === 'KeyW' || event.code === 'ArrowUp') inputRef.current.forward = false;
      if (event.code === 'KeyS' || event.code === 'ArrowDown') inputRef.current.backward = false;
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') inputRef.current.left = false;
      if (event.code === 'KeyD' || event.code === 'ArrowRight') inputRef.current.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return inputRef;
}

function Avatar({ bounds }: { bounds: { x: number; z: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const inputRef = useInteriorInput();
  const { camera } = useThree();
  const headingRef = useRef(0);
  const cameraTarget = useRef(new THREE.Vector3(0, 4, 8));
  const lookTarget = useRef(new THREE.Vector3(0, 1.4, 0));

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const input = inputRef.current;
    if (input.left) headingRef.current += TURN_SPEED * dt;
    if (input.right) headingRef.current -= TURN_SPEED * dt;

    let move = 0;
    if (input.forward) move += 1;
    if (input.backward) move -= 0.65;
    if (move !== 0) {
      group.position.x += Math.sin(headingRef.current) * WALK_SPEED * move * dt;
      group.position.z += Math.cos(headingRef.current) * WALK_SPEED * move * dt;
      group.position.x = THREE.MathUtils.clamp(group.position.x, -bounds.x + 2, bounds.x - 2);
      group.position.z = THREE.MathUtils.clamp(group.position.z, -bounds.z + 2, bounds.z - 2);
    }

    group.rotation.y = headingRef.current;

    cameraTarget.current.set(
      group.position.x - Math.sin(headingRef.current) * 7,
      4.2,
      group.position.z - Math.cos(headingRef.current) * 7,
    );
    lookTarget.current.set(group.position.x, 1.35, group.position.z + 2);
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-7 * dt));
    camera.lookAt(lookTarget.current);
  });

  return (
    <group ref={groupRef} position={[0, 0, -8]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.35, 1.1, 8, 12]} />
        <meshStandardMaterial color="#2563eb" roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#f1c27d" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.85, 0.28]} castShadow>
        <boxGeometry args={[0.65, 0.4, 0.08]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
    </group>
  );
}

interface FixtureProps {
  category: ShopCategory;
  bounds: { x: number; z: number };
}

function ConvenienceStoreFixtures({ bounds }: FixtureProps) {
  const productColors = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#a855f7'];
  return (
    <group>
      {/* Aisle shelves with colored products */}
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={i} position={[-bounds.x + 4 + i * 4.5, 0, 0]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[1.4, 2.2, bounds.z * 1.4]} />
            <meshStandardMaterial color="#475569" roughness={0.6} />
          </mesh>
          {Array.from({ length: 4 }).map((_, row) => (
            <group key={row} position={[0, 0.4 + row * 0.55, 0]}>
              {Array.from({ length: 8 }).map((_, j) => (
                <mesh key={j} position={[0.75, 0, -bounds.z * 0.65 + j * 1.6]}>
                  <boxGeometry args={[0.3, 0.4, 0.4]} />
                  <meshStandardMaterial color={productColors[(i + row + j) % productColors.length]} roughness={0.4} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
      {/* Cooler at back wall */}
      <mesh position={[bounds.x - 3, 1.5, -bounds.z + 1.2]} castShadow>
        <boxGeometry args={[6, 3, 1]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[bounds.x - 3, 1.5, -bounds.z + 1.85]}>
        <boxGeometry args={[5.8, 2.8, 0.05]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.55} metalness={0.4} />
      </mesh>
    </group>
  );
}

function GasStationFixtures({ bounds }: FixtureProps) {
  return (
    <group>
      {/* Fuel pumps in the middle */}
      {[-3, 3].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[1.2, 2, 0.8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 1.5, 0.45]}>
            <boxGeometry args={[0.8, 0.6, 0.1]} />
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0.7, 1, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        </group>
      ))}
      {/* Snack racks on side */}
      <mesh position={[-bounds.x + 2.5, 1, -bounds.z + 2]} castShadow>
        <boxGeometry args={[3, 2.2, 1]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.75} />
      </mesh>
      <mesh position={[bounds.x - 2.5, 1.4, -bounds.z + 2]} castShadow>
        <boxGeometry args={[3, 2.8, 1]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

function CoffeeShopFixtures({ bounds }: FixtureProps) {
  return (
    <group>
      {/* Long bar counter */}
      <mesh position={[0, 0.55, -bounds.z + 3]} castShadow>
        <boxGeometry args={[bounds.x * 1.5, 1.1, 1.4]} />
        <meshStandardMaterial color="#451a03" roughness={0.45} />
      </mesh>
      {/* Espresso machine */}
      <mesh position={[-2, 1.5, -bounds.z + 3]} castShadow>
        <boxGeometry args={[2, 0.8, 1]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[2, 1.4, -bounds.z + 3]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.7, 8]} />
        <meshStandardMaterial color="#fb923c" emissive="#ea580c" emissiveIntensity={0.4} />
      </mesh>
      {/* Cafe tables */}
      {[-1, 0, 1].map((c) =>
        [-1, 1].map((r) => (
          <group key={`${c}_${r}`} position={[c * 4.5, 0, r * 3.2]}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.55, 0.55, 0.1, 12]} />
              <meshStandardMaterial color="#fed7aa" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.65, 6]} />
              <meshStandardMaterial color="#3f3f46" metalness={0.5} />
            </mesh>
          </group>
        )),
      )}
      {/* Hanging pendant lights */}
      {[-3, 0, 3].map((x) => (
        <group key={x} position={[x, 4.5, 0]}>
          <mesh>
            <coneGeometry args={[0.3, 0.5, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fcd34d" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RestaurantFixtures({ bounds }: FixtureProps) {
  return (
    <group>
      {/* Dining tables in grid */}
      {[-1, 0, 1].map((c) =>
        [-1, 1].map((r) => (
          <group key={`${c}_${r}`} position={[c * 5, 0, r * 4]}>
            <mesh position={[0, 0.75, 0]} castShadow>
              <boxGeometry args={[2.2, 0.1, 2.2]} />
              <meshStandardMaterial color="#fef3c7" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <boxGeometry args={[0.18, 0.75, 0.18]} />
              <meshStandardMaterial color="#1f2937" metalness={0.5} />
            </mesh>
            {/* Chairs */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 1.5, 0.5, 0]} castShadow>
                <boxGeometry args={[0.6, 1, 0.6]} />
                <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
              </mesh>
            ))}
            {/* Plate on table */}
            <mesh position={[0, 0.82, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 0.04, 16]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          </group>
        )),
      )}
      {/* Kitchen counter at back */}
      <mesh position={[0, 1.1, -bounds.z + 2.5]} castShadow>
        <boxGeometry args={[bounds.x * 1.4, 2.2, 1.6]} />
        <meshStandardMaterial color="#52525b" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function ShoppingMallFixtures({ bounds }: FixtureProps) {
  const palette = ['#a855f7', '#ec4899', '#06b6d4', '#facc15', '#22d3ee'];
  return (
    <group>
      {/* Central atrium fountain */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[3, 3.4, 0.55, 24]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[2.7, 2.7, 0.05, 24]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.65} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.4, 1.4, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} />
      </mesh>
      {/* Surrounding storefronts */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = bounds.x * 0.7;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <mesh position={[0, 1.2, 0]} castShadow>
              <boxGeometry args={[4.5, 2.4, 1.6]} />
              <meshStandardMaterial color={palette[i % palette.length]} emissive={palette[i % palette.length]} emissiveIntensity={0.18} />
            </mesh>
            <mesh position={[0, 2.7, 0.81]}>
              <boxGeometry args={[3.6, 0.6, 0.1]} />
              <meshStandardMaterial color="#f8fafc" emissive="#fef3c7" emissiveIntensity={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* Escalator-like ramp */}
      <mesh position={[bounds.x - 3, 1.5, bounds.z - 4]} rotation={[Math.PI / 8, 0, 0]}>
        <boxGeometry args={[2.4, 0.2, 7]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function GarageFixtures({ bounds }: FixtureProps) {
  return (
    <group>
      {/* Vehicle lift */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[5, 0.6, 2.5]} />
        <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4.6, 0.4, 2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* A car body on the lift */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[3.8, 0.8, 1.7]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.7, -0.2]} castShadow>
        <boxGeometry args={[2.2, 0.55, 1.4]} />
        <meshStandardMaterial color="#0c4a6e" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Tool boards on walls */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (bounds.x - 0.6), 1.5, -bounds.z + 5]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 2.5, 4]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[-s * 0.18, -0.8 + i * 0.4, -1.5 + i * 0.6]}>
              <boxGeometry args={[0.06, 0.18, 0.4]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Tire stack */}
      <group position={[bounds.x - 4, 0, bounds.z - 3]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0.3 + i * 0.55, 0]} castShadow>
            <torusGeometry args={[0.6, 0.22, 8, 18]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function RestStopFixtures({ bounds }: FixtureProps) {
  return (
    <group>
      {/* Lounge seating */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 5, 0, 1]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[3, 1, 1.4]} />
            <meshStandardMaterial color="#10b981" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.1, -0.55]} castShadow>
            <boxGeometry args={[3, 1.1, 0.3]} />
            <meshStandardMaterial color="#059669" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Coffee table */}
      <mesh position={[0, 0.45, 1]} castShadow>
        <boxGeometry args={[3, 0.15, 1.4]} />
        <meshStandardMaterial color="#92400e" roughness={0.55} />
      </mesh>
      {/* Vending machines */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (bounds.x - 1.5), 1.3, -bounds.z + 1.5]} castShadow>
          <boxGeometry args={[1.4, 2.6, 0.9]} />
          <meshStandardMaterial color={s > 0 ? '#dc2626' : '#1d4ed8'} emissive={s > 0 ? '#7f1d1d' : '#1e3a8a'} emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Info kiosk in middle-back */}
      <mesh position={[0, 1.2, -bounds.z + 3]} castShadow>
        <boxGeometry args={[2, 2.4, 0.5]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.4, -bounds.z + 3.27]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function CategoryFixtures({ category, bounds }: FixtureProps) {
  switch (category) {
    case 'convenienceStore':
      return <ConvenienceStoreFixtures category={category} bounds={bounds} />;
    case 'gasStation':
      return <GasStationFixtures category={category} bounds={bounds} />;
    case 'coffeeShop':
      return <CoffeeShopFixtures category={category} bounds={bounds} />;
    case 'restaurant':
      return <RestaurantFixtures category={category} bounds={bounds} />;
    case 'shoppingMall':
      return <ShoppingMallFixtures category={category} bounds={bounds} />;
    case 'garage':
      return <GarageFixtures category={category} bounds={bounds} />;
    case 'restStop':
      return <RestStopFixtures category={category} bounds={bounds} />;
    default:
      return null;
  }
}

/** Category-specific floor color and pattern. */
function floorPalette(category: ShopCategory): { color: string; trim: string } {
  switch (category) {
    case 'convenienceStore':
      return { color: '#cbd5e1', trim: '#475569' };
    case 'gasStation':
      return { color: '#3f3f46', trim: '#fbbf24' };
    case 'coffeeShop':
      return { color: '#78350f', trim: '#f5deb3' };
    case 'restaurant':
      return { color: '#7f1d1d', trim: '#fcd34d' };
    case 'shoppingMall':
      return { color: '#e5e7eb', trim: '#a855f7' };
    case 'garage':
      return { color: '#1f2937', trim: '#facc15' };
    case 'restStop':
      return { color: '#86efac', trim: '#15803d' };
    default:
      return { color: '#374151', trim: '#1f2937' };
  }
}

export function ShopInteriorScene() {
  const shopId = useShopStore((state) => state.interiorShopId);
  const shop = useShopStore((state) => (shopId ? state.activeShops.get(shopId) : undefined));
  const color = shop ? SHOP_COLORS[shop.category] : '#334155';
  const bounds = useMemo(() => {
    if (!shop) return { x: 14, z: 13 };
    if (shop.category === 'shoppingMall') return { x: 22, z: 22 };
    if (shop.category === 'garage') return { x: 18, z: 16 };
    if (shop.category === 'restStop') return { x: 16, z: 14 };
    return { x: 14, z: 13 };
  }, [shop]);
  const floor = useMemo(() => (shop ? floorPalette(shop.category) : floorPalette('restStop')), [shop]);

  if (!shop) return null;

  return (
    <group>
      <color attach="background" args={['#0b1120']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[0, 5.5, -4]} intensity={1.8} color="#fff7ed" />
      <pointLight position={[bounds.x - 3, 4, bounds.z - 3]} intensity={0.8} color={color} />
      <pointLight position={[-(bounds.x - 3), 4, bounds.z - 3]} intensity={0.8} color={color} />

      {/* Floor with checkerboard trim ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[bounds.x * 2, bounds.z * 2]} />
        <meshStandardMaterial color={floor.color} roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[Math.min(bounds.x, bounds.z) - 1.2, Math.min(bounds.x, bounds.z) - 0.9, 48]} />
        <meshStandardMaterial color={floor.trim} emissive={floor.trim} emissiveIntensity={0.2} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 3, -bounds.z]} receiveShadow>
        <boxGeometry args={[bounds.x * 2, 6, 0.35]} />
        <meshStandardMaterial color="#1f2937" roughness={0.65} />
      </mesh>
      <mesh position={[-bounds.x, 3, 0]} receiveShadow>
        <boxGeometry args={[0.35, 6, bounds.z * 2]} />
        <meshStandardMaterial color="#243244" roughness={0.65} />
      </mesh>
      <mesh position={[bounds.x, 3, 0]} receiveShadow>
        <boxGeometry args={[0.35, 6, bounds.z * 2]} />
        <meshStandardMaterial color="#243244" roughness={0.65} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 6.1, 0]} receiveShadow>
        <boxGeometry args={[bounds.x * 2, 0.3, bounds.z * 2]} />
        <meshStandardMaterial color="#111827" roughness={0.75} />
      </mesh>

      {/* Storefront sign on the back wall */}
      <mesh position={[0, 4.6, -bounds.z + 0.25]}>
        <boxGeometry args={[Math.min(bounds.x * 1.2, 22), 1.6, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 4.6, -bounds.z + 0.35]}>
        <boxGeometry args={[Math.min(bounds.x * 0.95, 18), 0.7, 0.05]} />
        <meshStandardMaterial color="#f8fafc" emissive="#fef3c7" emissiveIntensity={0.4} />
      </mesh>

      {/* Entrance door behind avatar */}
      <mesh position={[0, 1.2, bounds.z - 0.2]}>
        <boxGeometry args={[2.4, 2.4, 0.1]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.4} transparent opacity={0.65} />
      </mesh>

      {/* Generic counter / cashier desk near entrance */}
      <mesh position={[bounds.x - 5, 0.8, bounds.z - 4]} castShadow>
        <boxGeometry args={[5, 1.6, 1.3]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      <mesh position={[bounds.x - 5, 2.1, bounds.z - 4]} castShadow>
        <capsuleGeometry args={[0.3, 1.0, 8, 12]} />
        <meshStandardMaterial color="#dc2626" roughness={0.55} />
      </mesh>

      {/* Category-specific fixtures */}
      <CategoryFixtures category={shop.category} bounds={bounds} />

      <Avatar bounds={bounds} />
    </group>
  );
}
