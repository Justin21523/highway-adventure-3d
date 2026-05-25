/**
 * WorldGenerator — Procedural road network generation.
 *
 * Generates the infinite world's road network as a graph of nodes and edges.
 * Each chunk gets assigned a zone type (highway, suburban, cityCenter, etc.)
 * and the appropriate road layout.
 *
 * This system does NOT create 3D meshes — that's handled by ChunkBuilder.
 * This system only generates logical world data (road segments, nodes, shops, POIs).
 */

import type { Vector3Data, ChunkId, ZoneType } from '@/types/core';
import type { RoadSegment, RoadNode, ChunkData, PointOfInterest, RoadType, ElevationLevel } from '@/types/world';
import { useWorldStore } from '@/stores/worldStore';
import { useShopStore } from '@/stores/shopStore';
import { useQuestStore } from '@/stores/questStore';
import { WORLD, ROAD, HIGHWAY, CITY_ROAD, DECORATION, ZONE_DISTRIBUTION } from '@/constants/world';
import { ROAD_PRESETS } from '@/config/roadPresets';
import { ITEM_CATALOG_MAP, SHOP_ITEM_ASSIGNMENTS, SHOP_COLORS, SHOP_NAMES } from '@/constants/shops';
import { SeededRandom } from '@/utils/seedRandom';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

/** Result of generating a single chunk */
interface GeneratedChunk {
  chunkId: ChunkId;
  chunkData: ChunkData;
  shops: import('@/types/shop').Shop[];
  pois: PointOfInterest[];
}

/* ─────────────────────────────────────────────
 * Seeded Random Utility
 * ───────────────────────────────────────────── */

/** Create a seeded random from chunk grid coordinates */
function createChunkRandom(cx: number, cz: number): SeededRandom {
  const seed = cx * 73856093 ^ cz * 19349663 ^ 0x5A5A5A5A;
  return new SeededRandom(seed);
}

/* ─────────────────────────────────────────────
 * WorldGenerator Singleton
 * ───────────────────────────────────────────── */

export class WorldGenerator {
  private static instance: WorldGenerator | null = null;

  /** Cache of already-generated chunk data */
  private chunkCache = new Map<string, GeneratedChunk>();

  /** Global seed for deterministic generation */
  private globalSeed = 42;

  private constructor() {}

  static getInstance(): WorldGenerator {
    if (!WorldGenerator.instance) {
      WorldGenerator.instance = new WorldGenerator();
    }
    return WorldGenerator.instance;
  }

  /* ── Initialization ── */

  setGlobalSeed(seed: number): void {
    this.globalSeed = seed;
    this.chunkCache.clear();
  }

  /* ── Core Generation ── */

  /**
   * Generate a chunk at the given grid coordinates.
   * Results are cached — calling again with the same coordinates returns the cached result.
   */
  generateChunk(cx: number, cz: number): GeneratedChunk {
    const chunkId = `${cx}_${cz}`;

    // Return cached result if available
    const cached = this.chunkCache.get(chunkId);
    if (cached) return cached;

    const rng = createChunkRandom(cx, cz);

    // Determine zone type based on position and seed
    const zone = this.determineZone(cx, cz, rng);

    // Generate chunk data
    const chunkData = this.generateChunkData(cx, cz, zone, rng);

    // Generate shops for this chunk
    const shops = this.generateShops(cx, cz, zone, chunkData, rng);

    // Generate POIs for this chunk
    const pois = this.generatePOIs(cx, cz, zone, shops, rng);

    const result: GeneratedChunk = {
      chunkId,
      chunkData,
      shops,
      pois,
    };

    // Cache the result
    this.chunkCache.set(chunkId, result);

    return result;
  }

  /** Clear the chunk cache (call when quality settings change) */
  clearCache(): void {
    this.chunkCache.clear();
  }

  /* ── Zone Determination ── */

  /** Determine the zone type for a chunk based on its position */
  private determineZone(cx: number, cz: number, rng: SeededRandom): ZoneType {
    // Highway corridors run along the Z axis at specific X positions
    const isHighwayCorridor = Math.abs(cx % 5) === 0;

    // City centers cluster around the origin
    const distFromCenter = Math.sqrt(cx * cx + cz * cz);
    const isCityCenter = distFromCenter < 3;

    // Suburban areas surround city centers
    const isSuburban = distFromCenter < 6 && !isCityCenter;

    if (isHighwayCorridor && !isCityCenter) return 'highway';
    if (isCityCenter) return 'cityCenter';
    if (isSuburban) return 'suburban';

    // Industrial areas near highways but not in cities
    if (isHighwayCorridor && distFromCenter >= 6) return 'industrial';

    // Countryside for everything else
    return 'countryside';
  }

  /* ── Chunk Data Generation ── */

  /** Generate the logical data for a chunk (roads, nodes, elevation) */
  private generateChunkData(cx: number, cz: number, zone: ZoneType, rng: SeededRandom): ChunkData {
    const chunkId = `${cx}_${cz}`;
    const bounds = {
      minX: cx * WORLD.CHUNK_SIZE,
      minZ: cz * WORLD.CHUNK_SIZE,
      maxX: (cx + 1) * WORLD.CHUNK_SIZE,
      maxZ: (cz + 1) * WORLD.CHUNK_SIZE,
    };

    // Determine elevation based on zone
    let elevation: number = 0;
    let elevationLevel: ElevationLevel = 'ground';

    if (zone === 'highway') {
      // Highways are often elevated
      if (rng.chance(0.4)) {
        elevation = HIGHWAY.ELEVATED_HEIGHT;
        elevationLevel = 'elevated';
      }
    }

    // Generate road segments based on zone
    const roads = this.generateRoadsForZone(zone, cx, cz, rng);

    // Generate road nodes at segment endpoints
    const nodes = this.generateNodesForRoads(roads, elevation);

    // Determine chunk features
    const hasBridge = elevationLevel === 'elevated' && cz % 3 === 0;
    const hasTunnel = zone === 'highway' && rng.chance(0.15);
    const hasServiceArea = zone === 'highway' && cz % 5 === 0;
    const hasIntersection = zone === 'cityCenter' || zone === 'suburban';

    return {
      id: chunkId,
      gridX: cx,
      gridZ: cz,
      state: 'active',
      zone,
      bounds,
      roads,
      nodes,
      shopIds: [], // Populated when shops are generated
      decorationSeed: rng.int(0, 999999),
      elevation,
      hasBridge,
      hasTunnel,
      hasServiceArea,
      hasIntersection,
    };
  }

  /** Generate road segments appropriate for a zone type */
  private generateRoadsForZone(zone: ZoneType, cx: number, cz: number, rng: SeededRandom): RoadSegment[] {
    const roads: RoadSegment[] = [];
    const startNode = `node_${cx}_${cz}_start`;
    const endNode = `node_${cx}_${cz}_end`;

    switch (zone) {
      case 'highway': {
        // Highway: straight segment through the chunk
        const preset = ROAD_PRESETS.highway;
        roads.push({
          id: `road_${cx}_${cz}_highway`,
          type: 'highway',
          startNode,
          endNode,
          lanes: this.generateLanes(preset.lanesPerDirection, 'forward', preset.speedLimit),
          totalWidth: preset.totalWidth,
          length: WORLD.CHUNK_SIZE,
          elevation: 'elevated',
          speedLimit: preset.speedLimit,
          hasShoulder: true,
          hasMedian: true,
          hasBarrier: true,
          hasStreetLights: preset.hasStreetLights,
        });

        // Add exit ramp occasionally
        if (rng.chance(0.2) && cz % 3 === 0) {
          const rampNode = `node_${cx}_${cz}_ramp`;
          roads.push({
            id: `road_${cx}_${cz}_ramp`,
            type: 'ramp',
            startNode,
            endNode: rampNode,
            lanes: this.generateLanes(1, 'forward', 60),
            totalWidth: ROAD_PRESETS.ramp.totalWidth,
            length: HIGHWAY.RAMP_LENGTH,
            elevation: 'ground',
            speedLimit: 60,
            hasShoulder: true,
            hasMedian: false,
            hasBarrier: true,
            hasStreetLights: false,
          });
        }
        break;
      }

      case 'cityCenter': {
        // City center: grid of intersecting roads
        const preset = ROAD_PRESETS.cityRoad;

        // North-south road
        roads.push({
          id: `road_${cx}_${cz}_ns`,
          type: 'cityRoad',
          startNode,
          endNode,
          lanes: [
            ...this.generateLanes(preset.lanesPerDirection, 'forward', preset.speedLimit),
            ...this.generateLanes(preset.lanesPerDirection, 'backward', preset.speedLimit),
          ],
          totalWidth: preset.totalWidth,
          length: WORLD.CHUNK_SIZE,
          elevation: 'ground',
          speedLimit: preset.speedLimit,
          hasShoulder: false,
          hasMedian: false,
          hasBarrier: false,
          hasStreetLights: true,
        });

        // East-west road
        const ewNode = `node_${cx}_${cz}_ew`;
        roads.push({
          id: `road_${cx}_${cz}_ew`,
          type: 'cityRoad',
          startNode,
          endNode: ewNode,
          lanes: [
            ...this.generateLanes(preset.lanesPerDirection, 'forward', preset.speedLimit),
            ...this.generateLanes(preset.lanesPerDirection, 'backward', preset.speedLimit),
          ],
          totalWidth: preset.totalWidth,
          length: WORLD.CHUNK_SIZE,
          elevation: 'ground',
          speedLimit: preset.speedLimit,
          hasShoulder: false,
          hasMedian: false,
          hasBarrier: false,
          hasStreetLights: true,
        });
        break;
      }

      case 'suburban': {
        // Suburban: single road with occasional intersections
        const preset = ROAD_PRESETS.cityRoad;
        roads.push({
          id: `road_${cx}_${cz}_suburban`,
          type: 'cityRoad',
          startNode,
          endNode,
          lanes: [
            ...this.generateLanes(preset.lanesPerDirection, 'forward', preset.speedLimit),
            ...this.generateLanes(preset.lanesPerDirection, 'backward', preset.speedLimit),
          ],
          totalWidth: preset.totalWidth,
          length: WORLD.CHUNK_SIZE,
          elevation: 'ground',
          speedLimit: preset.speedLimit,
          hasShoulder: true,
          hasMedian: false,
          hasBarrier: false,
          hasStreetLights: true,
        });
        break;
      }

      case 'industrial': {
        // Industrial: wide road with service area
        const preset = ROAD_PRESETS.cityRoad;
        roads.push({
          id: `road_${cx}_${cz}_industrial`,
          type: 'cityRoad',
          startNode,
          endNode,
          lanes: [
            ...this.generateLanes(3, 'forward', 50),
            ...this.generateLanes(3, 'backward', 50),
          ],
          totalWidth: preset.totalWidth + 20,
          length: WORLD.CHUNK_SIZE,
          elevation: 'ground',
          speedLimit: 50,
          hasShoulder: true,
          hasMedian: false,
          hasBarrier: false,
          hasStreetLights: true,
        });
        break;
      }

      default: {
        // Countryside: single lane road
        roads.push({
          id: `road_${cx}_${cz}_countryside`,
          type: 'cityRoad',
          startNode,
          endNode,
          lanes: this.generateLanes(1, 'forward', 80),
          totalWidth: ROAD.LANE_WIDTH * 2 + ROAD.SHOULDER_WIDTH * 2,
          length: WORLD.CHUNK_SIZE,
          elevation: 'ground',
          speedLimit: 80,
          hasShoulder: true,
          hasMedian: false,
          hasBarrier: false,
          hasStreetLights: false,
        });
      }
    }

    return roads;
  }

  /** Generate lane definitions for a road */
  private generateLanes(count: number, direction: 'forward' | 'backward', speedLimit: number): import('@/types/world').LaneDefinition[] {
    const lanes: import('@/types/world').LaneDefinition[] = [];
    for (let i = 0; i < count; i++) {
      lanes.push({
        index: i,
        width: ROAD.LANE_WIDTH,
        direction,
        speedLimit,
        markingLeft: i === 0 ? 'solid' : 'dashed',
        markingRight: i === count - 1 ? 'solid' : 'dashed',
      });
    }
    return lanes;
  }

  /** Generate road nodes from road segments */
  private generateNodesForRoads(roads: RoadSegment[], elevation: number): RoadNode[] {
    const nodeMap = new Map<string, RoadNode>();

    for (const road of roads) {
      // Start node
      if (!nodeMap.has(road.startNode)) {
        const pos: Vector3Data = { x: 0, y: elevation, z: 0 };
        nodeMap.set(road.startNode, {
          id: road.startNode,
          position: pos,
          type: 'intersection',
          connectedEdges: [],
          hasTrafficLight: road.type === 'cityRoad',
        });
      }

      // End node
      if (!nodeMap.has(road.endNode)) {
        const pos: Vector3Data = { x: 0, y: elevation, z: WORLD.CHUNK_SIZE };
        nodeMap.set(road.endNode, {
          id: road.endNode,
          position: pos,
          type: road.type === 'ramp' ? 'highwayExit' : 'intersection',
          connectedEdges: [],
          hasTrafficLight: false,
        });
      }

      // Add edge to connected edges
      const startNode = nodeMap.get(road.startNode);
      const endNode = nodeMap.get(road.endNode);
      if (startNode) startNode.connectedEdges.push(road.id);
      if (endNode) endNode.connectedEdges.push(road.id);
    }

    return Array.from(nodeMap.values());
  }

  /* ── Shop Generation ── */

  /** Generate shops for a chunk based on its zone */
  private generateShops(cx: number, cz: number, zone: ZoneType, chunkData: ChunkData, rng: SeededRandom): import('@/types/shop').Shop[] {
    const shops: import('@/types/shop').Shop[] = [];
    const chunkCenterX = (cx + 0.5) * WORLD.CHUNK_SIZE;
    const chunkCenterZ = (cz + 0.5) * WORLD.CHUNK_SIZE;

    // Shop density varies by zone
    const shopCount = this.getShopCountForZone(zone, rng);

    for (let i = 0; i < shopCount; i++) {
      const category = this.selectShopCategory(zone, rng);
      const names = SHOP_NAMES[category];
      const name = names[rng.int(0, names.length - 1)];
      const color = SHOP_COLORS[category];

      const position: Vector3Data = {
        x: chunkCenterX + (rng.range(-20, 20)),
        y: chunkData.elevation,
        z: chunkCenterZ + (rng.range(-20, 20)),
      };

      const itemIds = SHOP_ITEM_ASSIGNMENTS[category];

      const shop: import('@/types/shop').Shop = {
        id: `shop_${cx}_${cz}_${i}`,
        name,
        category,
        position,
        rotation: rng.range(0, Math.PI * 2),
        chunkId: `${cx}_${cz}`,
        items: itemIds,
        interactionRadius: 8,
        isOpen: true,
        openHour: category === 'gasStation' ? 0 : 7,
        closeHour: category === 'gasStation' ? 24 : 22,
        buildingWidth: 10,
        buildingDepth: 8,
        buildingHeight: 5,
        signColor: color,
        signText: name,
        hasPromotion: rng.chance(0.3),
        promotionText: rng.chance(0.5) ? '20% OFF' : 'SALE',
        promotionDiscount: rng.range(10, 30),
      };

      shops.push(shop);
    }

    // Update chunk data with shop IDs
    chunkData.shopIds = shops.map((s) => s.id);

    return shops;
  }

  /** Get number of shops to spawn in a zone */
  private getShopCountForZone(zone: ZoneType, rng: SeededRandom): number {
    switch (zone) {
      case 'cityCenter': return rng.int(2, 4);
      case 'suburban': return rng.int(1, 2);
      case 'highway': return rng.chance(0.5) ? 1 : 0;
      case 'industrial': return rng.chance(0.3) ? 1 : 0;
      default: return 0;
    }
  }

  /** Select a shop category appropriate for a zone */
  private selectShopCategory(zone: ZoneType, rng: SeededRandom): import('@/types/shop').ShopCategory {
    const categories: import('@/types/shop').ShopCategory[] = [
      'convenienceStore',
      'gasStation',
      'coffeeShop',
      'restaurant',
      'shoppingMall',
      'garage',
      'restStop',
    ];

    // Weighted selection based on zone
    switch (zone) {
      case 'cityCenter':
        return rng.pick(['shoppingMall', 'restaurant', 'coffeeShop', 'convenienceStore']);
      case 'highway':
        return rng.pick(['gasStation', 'restStop', 'convenienceStore', 'restaurant']);
      case 'suburban':
        return rng.pick(['convenienceStore', 'restaurant', 'gasStation', 'garage']);
      case 'industrial':
        return rng.pick(['gasStation', 'convenienceStore', 'restaurant']);
      default:
        return rng.pick(['convenienceStore', 'gasStation']);
    }
  }

  /* ── POI Generation ── */

  /** Generate points of interest for a chunk */
  private generatePOIs(cx: number, cz: number, zone: ZoneType, shops: import('@/types/shop').Shop[], rng: SeededRandom): PointOfInterest[] {
    const pois: PointOfInterest[] = [];
    const chunkCenterX = (cx + 0.5) * WORLD.CHUNK_SIZE;
    const chunkCenterZ = (cz + 0.5) * WORLD.CHUNK_SIZE;

    // Add shop POIs
    for (const shop of shops) {
      pois.push({
        id: `poi_${shop.id}`,
        type: 'shop',
        position: shop.position,
        name: shop.name,
        icon: this.getShopIcon(shop.category),
        chunkId: `${cx}_${cz}`,
        discovered: false,
      });
    }

    // Add scenic POIs in certain zones
    if (zone === 'highway' && rng.chance(0.2)) {
      pois.push({
        id: `poi_landmark_${cx}_${cz}`,
        type: 'scenic',
        position: { x: chunkCenterX + rng.range(-30, 30), y: chunkData_elevation_or_0(), z: chunkCenterZ + rng.range(-30, 30) },
        name: rng.pick(['Scenic Overlook', 'Viewpoint', 'Photo Spot']),
        icon: '📍',
        chunkId: `${cx}_${cz}`,
        discovered: false,
      });
    }

    return pois;
  }

  private getShopIcon(category: import('@/types/shop').ShopCategory): string {
    const icons: Record<import('@/types/shop').ShopCategory, string> = {
      convenienceStore: '🏪',
      gasStation: '⛽',
      coffeeShop: '☕',
      restaurant: '🍽️',
      shoppingMall: '🛍️',
      garage: '🔧',
      restStop: '🏕️',
    };
    return icons[category] || '📍';
  }
}

// Helper to avoid reference issue above
function chunkData_elevation_or_0(): number { return 0; }
