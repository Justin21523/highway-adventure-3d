/**
 * ZoneManager — single authoritative source of truth for world zones (世界分區).
 *
 * Every system that needs to know "what district is here?" — the road renderer,
 * shop spawner, decoration system, NPC/quest placement, and the minimap — calls
 * into this module so they all agree. It is a pure, deterministic, allocation-free
 * mapping from a world position (or chunk grid coordinate) to a ZoneType. It does
 * NOT depend on React or any store, so it can be called outside the render loop
 * and before a chunk has been streamed in.
 *
 * Layout: "corridor + along-route themed bands" (see constants/zones.ts):
 *   - Highway runs forever down the central corridor (|cx| <= HALF_WIDTH).
 *   - The mid ring (|cx| in [MID_RING_MIN, MID_RING_MAX]) cycles through
 *     commercial (cityCenter) → residential (suburban) → general (countryside)
 *     both laterally and along +Z, giving distinct themed segments while driving.
 *   - The outer ring is general roads with occasional industrial pockets.
 *
 * District ZoneType ↔ user-facing district:
 *   highway → 高速公路, cityCenter → 商家區, suburban → 住宅區,
 *   countryside → 一般道路, industrial → 工業區.
 */

import type { ZoneType } from '@/types/core';
import { WORLD } from '@/constants/world';
import { ZONE_LAYOUT } from '@/constants/zones';

/** One zone grid cell is one streamed chunk (100m). Alias of WORLD.CHUNK_SIZE. */
export const ZONE_GRID_SIZE = WORLD.CHUNK_SIZE;

/** Deterministic hash → [0,1). Same (cx,cz,salt) always yields the same value. */
function hash01(cx: number, cz: number, salt = 0): number {
  let h = (cx * 73856093) ^ (cz * 19349663) ^ (salt * 83492791);
  h = h >>> 0; // force unsigned 32-bit
  return (h % 100000) / 100000;
}

/** Themed-band districts, in rotation order. */
const BAND_THEMES: readonly ZoneType[] = ['cityCenter', 'suburban', 'countryside'];

/**
 * Zone for a chunk grid coordinate. Pure and deterministic — no RNG state.
 */
export function zoneAtChunk(cx: number, cz: number): ZoneType {
  const adx = Math.abs(cx);

  // Central highway corridor — continuous down +Z forever.
  if (adx <= ZONE_LAYOUT.HIGHWAY_CORRIDOR_HALF_WIDTH) return 'highway';

  // Along-Z themed band index (0..2), rotates every DISTRICT_DEPTH chunks.
  const band = ((Math.floor(cz / ZONE_LAYOUT.DISTRICT_DEPTH) % 3) + 3) % 3;

  // Mid ring: dense commercial/residential/general districts.
  if (adx >= ZONE_LAYOUT.MID_RING_MIN && adx <= ZONE_LAYOUT.MID_RING_MAX) {
    const ring = adx - ZONE_LAYOUT.MID_RING_MIN; // 0 nearest the highway exits
    return BAND_THEMES[(ring + band) % BAND_THEMES.length];
  }

  // Outer ring: general roads with seeded industrial pockets (no stripes).
  if (hash01(cx, cz, 7) < ZONE_LAYOUT.INDUSTRIAL_CHANCE) return 'industrial';
  return 'countryside';
}

/**
 * Zone for an exact world position (meters). Buckets to the 100m chunk grid.
 */
export function zoneAtWorld(x: number, z: number): ZoneType {
  return zoneAtChunk(Math.floor(x / ZONE_GRID_SIZE), Math.floor(z / ZONE_GRID_SIZE));
}

/** Bridge to the quest/NPC code's coarse 'highway' | 'city' road typing. */
export function roadTypeForZone(zone: ZoneType): 'highway' | 'city' {
  return zone === 'highway' ? 'highway' : 'city';
}

/** Minimap / UI fill color per district. */
export function zoneColor(zone: ZoneType): string {
  switch (zone) {
    case 'highway':
      return '#3b82f6'; // blue
    case 'cityCenter':
      return '#f59e0b'; // amber (商家)
    case 'suburban':
      return '#22c55e'; // green (住宅)
    case 'industrial':
      return '#a855f7'; // purple
    case 'countryside':
    default:
      return '#9ca3af'; // gray (一般道路)
  }
}

/** Localized (繁中) district label. */
export function zoneLabel(zone: ZoneType): string {
  switch (zone) {
    case 'highway':
      return '高速公路';
    case 'cityCenter':
      return '商家區';
    case 'suburban':
      return '住宅區';
    case 'industrial':
      return '工業區';
    case 'countryside':
    default:
      return '一般道路';
  }
}
