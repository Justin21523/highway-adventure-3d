/**
 * Central export file for all game modules.
 *
 * This file provides a clean public API for importing game modules
 * without needing to know the internal directory structure.
 */

/* ─────────────────────────────────────────────
 * Stores
 * ───────────────────────────────────────────── */

export { useGameStore } from './stores/gameStore';
export { useWorldStore } from './stores/worldStore';
export { useTrafficStore } from './stores/trafficStore';
export { useShopStore } from './stores/shopStore';
export { useQuestStore } from './stores/questStore';
export { usePerformanceStore } from './stores/performanceStore';

/* ─────────────────────────────────────────────
 * Systems
 * ───────────────────────────────────────────── */

export { GameRuntime } from './systems/GameRuntime';
export { WorldGenerator } from './systems/WorldGenerator';
export { ChunkStreamer } from './systems/ChunkStreamer';
export { TrafficAI } from './systems/TrafficAI';
export { ShopSystem } from './systems/ShopSystem';
export { QuestSystem } from './systems/QuestSystem';
export { PickupSystem } from './systems/PickupSystem';
export { VehiclePhysics } from './systems/VehiclePhysics';
export { EnvironmentSystem } from './systems/EnvironmentSystem';

/* ─────────────────────────────────────────────
 * Hooks
 * ───────────────────────────────────────────── */

export { useGameLoop } from './hooks/useGameLoop';
export { useWorldStreaming, usePlayerPosition, useChunkInfo, usePOIs, usePerformanceMonitor } from './hooks/useWorldStreaming';
export { useTraffic, useTrafficNearby, useTrafficCollision } from './hooks/useTraffic';
export { useShops, useShopByCategory, useNearestShop, useInventory } from './hooks/useShops';
export { usePickups, usePickupsByType, useCoinCollection } from './hooks/usePickups';
export { useEnvironment, useDayNightCycle } from './hooks/useEnvironment';
export { usePlayerVehicle, useVehicleStats } from './hooks/usePlayerVehicle';
export { useQuests, useQuestsByCategory, useActiveQuest, useQuestStats } from './hooks/useQuests';
export { useFloatingOrigin } from './hooks/useFloatingOrigin';
export { useGameLoopManager } from './hooks/useGameLoopManager';
export { useGameOrchestrator } from './hooks/useGameOrchestrator';
export { useVehicleCustomization } from './hooks/useVehicleCustomization';

/* ─────────────────────────────────────────────
 * Components
 * ───────────────────────────────────────────── */

export { GameScene } from './components/GameScene';
export { PlayerVehicle } from './components/PlayerVehicle';
export { CameraRig } from './components/CameraRig';
export { WorldChunks } from './components/WorldChunks';
export { ShopBuildings } from './components/ShopBuildings';
export { PickupObjects } from './components/PickupObjects';
export { EnvironmentLights } from './components/EnvironmentLights';
export { Obstacles } from './components/Obstacles';
export { PostProcessing } from './components/PostProcessing';
export { HUD } from './components/HUD';
export { QuestLog } from './components/QuestLog';
export { ShopModal } from './components/ShopModal';
export { GarageModal } from './components/GarageModal';
export { NotificationToast } from './components/NotificationToast';
export { InteractionOverlay } from './components/InteractionOverlay';
export { LoadingScreen } from './components/LoadingScreen';
export { StartScreen } from './components/StartScreen';
export { PauseMenu } from './components/PauseMenu';
export { CollisionManager } from './components/world/CollisionManager';
export { ChunkRenderer } from './components/world/ChunkRenderer';
export { CheckpointSystem } from './components/world/CheckpointSystem';
export { DecorationBatchSystem } from './components/world/DecorationBatchSystem';
export { DynamicObstacles } from './components/world/DynamicObstacles';
export { GarageZone } from './components/world/GarageZone';
export { HighwayChunkGenerator } from './components/world/HighwayChunkGenerator';
export { HighwayNetworkSystem } from './components/world/HighwayNetworkSystem';
export { LightingController } from './components/world/LightingController';
export { ParallaxBackground } from './components/world/ParallaxBackground';
export { ParallaxScenery } from './components/world/ParallaxScenery';
export { PickupSystem as WorldPickupSystem } from './components/world/PickupSystem';
export { PostProcessingPipeline } from './components/world/PostProcessingPipeline';
export { QuestProgressTracker } from './components/world/QuestProgressTracker';
export { RoadMarkingBatchSystem } from './components/world/RoadMarkingBatchSystem';
export { RoadNetworkGenerator } from './components/world/RoadNetworkGenerator';
export { RoadSignSystem } from './components/world/RoadSignSystem';
export { TrafficAIController } from './components/world/TrafficAIController';
export { TrafficBatchSystem } from './components/world/TrafficBatchSystem';
export { WorldShopSpawner } from './components/world/WorldShopSpawner';
export { WorldStreamManager } from './components/world/WorldStreamManager';
export { AchievementPanel } from './components/ui/AchievementPanel';
export { CrashOverlay } from './components/ui/CrashOverlay';
export { MinimapRenderer } from './components/ui/MinimapRenderer';
export { GPSNavigator } from './ui/GPSNavigator';
export { ShopInteraction } from './ui/ShopInteraction';
export { TutorialOverlay } from './ui/TutorialOverlay';

/* ─────────────────────────────────────────────
 * Utils
 * ───────────────────────────────────────────── */

export { SeededRandom } from './utils/seedRandom';
export { ObjectPool } from './utils/objectPool';
export {
  clamp,
  lerp,
  smoothstep,
  smootherstep,
  mapRange,
  inRange,
  distance2D,
  distance3D,
  distanceSquared2D,
  distanceSquared3D,
  roundTo,
  degToRad,
  radToDeg,
  randomInt,
  randomFloat,
  randomPick,
  approximately,
  angleBetween,
  dotProduct2D,
  crossProduct2D,
  normalize,
  generateId,
} from './utils/math';
export {
  worldToChunkCoords,
  chunkId,
  parseChunkId,
  chunkToWorldCenter,
  chunkToWorldBounds,
  areChunksAdjacent,
  areChunksEdgeAdjacent,
  chunkDistance,
  getChunksInRange,
  getNearestChunk,
  isPositionInChunk,
} from './utils/distance';
export {
  formatNumber,
  formatDecimal,
  formatSpeed,
  formatDistance,
  formatTime,
  formatTimeExtended,
  formatPercent,
  formatCoins,
  formatXP,
  formatLevel,
  formatFileSize,
  formatChunkId,
  formatZone,
  formatShopCategory,
  formatQuestCategory,
  formatWeather,
  formatTime12Hour,
  formatCompactNumber,
  formatFraction,
} from './utils/format';

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

export type {
  GameMode,
  Vector3Data,
  VehicleState,
  PlayerProfile,
  Controls,
  Notification,
} from './types/core';

export type {
  ChunkId,
  ChunkData,
  ChunkState,
  ZoneType,
  RoadSegment,
  RoadNode,
  LaneDefinition,
  ElevationLevel,
  PointOfInterest,
} from './types/world';

export type {
  VehicleCategory,
  VehicleConfig,
} from './types/vehicle';

export type {
  TrafficCar,
  TrafficState,
  TrafficConfig,
} from './types/traffic';

export type {
  Shop,
  ShopCategory,
  ShopItem,
  InventoryItem,
} from './types/shop';

export type {
  Quest,
  ActiveQuest,
  QuestCategory,
  QuestObjective,
  QuestStatus,
  GameEvent,
  WorldPickup,
  PickupType,
  QuestStats,
} from './types/quest';

export type {
  ItemCatalogEntry,
  ItemEffect,
  EconomyConfig,
} from './types/economy';

export type {
  InputState,
  InputAction,
} from './types/input';

export type {
  PerformanceMetrics,
  QualityTier,
  QualityPreset,
  PerformanceSettings,
} from './types/performance';

export type { POIType, POI, POIDiscovery, POIManagerConfig } from './types/poi';
export type { BuildingType, BuildingConfig, BuildingFacade, BuildingBatchInstance } from './types/building';
export type { AudioType, AudioConfig, AudioClip, AudioManagerConfig } from './types/audio';
export type { VFXType, VFXConfig, VFXInstance, VFXManagerConfig } from './types/vfx';

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

export { PHYSICS } from './constants/physics';
export { VEHICLE_CONFIGS } from './constants/vehicles';
export { WORLD, ROAD, HIGHWAY, CITY_ROAD, DECORATION } from './constants/world';
export { ECONOMY_CONFIG, XP_TABLE, QUEST_REWARDS } from './constants/economy';
export { SHOP_CONFIG, ITEM_CATALOG_MAP, SHOP_ITEM_ASSIGNMENTS, SHOP_COLORS, SHOP_NAMES, SHOP_INTERACTION_RADIUS } from './constants/shops';
export { TRAFFIC_CONFIG, TRAFFIC_VEHICLE_TEMPLATES, TRAFFIC_TOTAL_WEIGHT } from './constants/traffic';

/* ─────────────────────────────────────────────
 * Configs
 * ───────────────────────────────────────────── */

export { gameConfig } from './config/gameConfig';
export { qualityPresets } from './config/qualityPresets';
export { ROAD_PRESETS } from './config/roadPresets';

/* ─────────────────────────────────────────────
 * Managers
 * ───────────────────────────────────────────── */

export { AudioManager } from './managers/AudioManager';
export { VFXManager } from './managers/VFXManager';
export { PerformanceScaler } from './managers/PerformanceScaler';
export { InputManager } from './managers/InputManager';
export { SaveManager } from './managers/SaveManager';
export { AchievementManager } from './managers/AchievementManager';
export { MusicManager } from './managers/MusicManager';
export { NotificationManager } from './managers/NotificationManager';
export { StatsTracker } from './managers/StatsTracker';
export { WeatherSystem } from './managers/WeatherSystem';
export { DayNightCycle } from './systems/DayNightCycle';
export {
  DEFAULT_STATS,
  UPGRADE_EFFECTS,
  applyStatsToPhysics,
  calculateEffectiveStats,
} from './systems/VehicleUpgradeSystem';
export type { VehicleStats } from './systems/VehicleUpgradeSystem';
