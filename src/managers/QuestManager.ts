// src/managers/QuestManager.ts
/**
 * QuestManager
 * Centralized quest orchestration: dynamic generation, NPC assignment, progress tracking,
 * and chunk-based distribution. Quests are procedurally generated based on player level,
 * chunk coordinates, and category weights—never hardcoded.
 * 
 * Architecture:
 * - Quests are tied to ChunkId for spatial distribution
 * - NPCs spawn at road intersections with quest-giver roles
 * - Dynamic templates generate objectives based on road type (highway/city)
 * - All state syncs to useGameStore for UI reactivity
 */

import { useGameStore } from '../stores/gameStore';
import { useShopStore } from '../stores/shopStore';
import type { Shop } from '../types/shop';
import { Quest, QuestObjective, QuestReward, QuestCategory, ObjectiveType, ZoneType } from '../types/core';
import { ZONE_GRID_SIZE, zoneAtChunk } from '../systems/ZoneManager';

/* ─────────────────────────────────────────────
 * Deterministic seeding — quests for a chunk are reproducible (drive away and
 * back, or reload with the global seed, and the same quests reappear).
 * ───────────────────────────────────────────── */

/** FNV-1a hash of a string → unsigned 32-bit. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Deterministic rng for a chunk + salt. */
function chunkRng(chunkId: string, salt = 0): () => number {
  return mulberry32(hashStr(chunkId) ^ Math.imul(salt, 0x9e3779b1));
}

/** Quest categories in a fixed order, paired with per-zone weights below. */
const CATEGORY_ORDER: QuestCategory[] = ['main', 'side', 'daily', 'exploration', 'delivery', 'challenge', 'tour'];

/** Per-district category bias. Order matches {@link CATEGORY_ORDER}. */
function zoneCategoryWeights(zone: ZoneType): number[] {
  switch (zone) {
    case 'highway':     return [0.10, 0.30, 0.10, 0.05, 0.00, 0.25, 0.20]; // side/challenge/tour
    case 'cityCenter':  return [0.10, 0.05, 0.25, 0.10, 0.35, 0.05, 0.10]; // delivery/daily
    case 'suburban':    return [0.10, 0.10, 0.15, 0.40, 0.10, 0.05, 0.10]; // exploration
    case 'industrial':  return [0.10, 0.10, 0.20, 0.20, 0.20, 0.10, 0.10];
    case 'countryside':
    default:            return [0.10, 0.10, 0.10, 0.35, 0.05, 0.05, 0.25]; // exploration/tour
  }
}

/** Weighted pick using a single [0,1) sample. */
function weightedPick<T>(items: T[], weights: number[], r: number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** A real storefront near a chunk (searches commercial chunks just ahead). */
function pickNearbyShop(gx: number, gz: number, rng: () => number): Shop | undefined {
  const shopStore = useShopStore.getState();
  for (let dz = 0; dz <= 2; dz++) {
    for (const dx of [0, 1, -1, 2, -2]) {
      const cx = gx + dx;
      const cz = gz + dz;
      if (zoneAtChunk(cx, cz) !== 'cityCenter') continue;
      const shops = shopStore.getShopsInChunk(`${cx}_${cz}`);
      if (shops.length > 0) return shops[Math.floor(rng() * shops.length)];
    }
  }
  return undefined;
}

// Quest template library for procedural generation
const QUEST_TEMPLATES: Record<QuestCategory, Array<{
  title: string;
  description: string;
  objectiveType: ObjectiveType;
  baseTarget: number;
  baseReward: QuestReward;
  levelMin: number;
  roadType?: 'highway' | 'city';
}>> = {
  main: [
    {
      title: 'Highway Pioneer',
      description: 'Reach the next major checkpoint',
      objectiveType: 'reachLocation',
      baseTarget: 1,
      baseReward: { coins: 300, xp: 150, items: ['part_engine_v1'] },
      levelMin: 1,
      roadType: 'highway'
    },
    {
      title: 'City Explorer',
      description: 'Discover hidden routes in the urban district',
      objectiveType: 'driveDistance',
      baseTarget: 2000,
      baseReward: { coins: 250, xp: 120, items: [] },
      levelMin: 3,
      roadType: 'city'
    }
  ],
  side: [
    {
      title: 'Drift Master',
      description: 'Master the art of controlled sliding',
      objectiveType: 'driftDistance',
      baseTarget: 300,
      baseReward: { coins: 180, xp: 90, items: ['part_tires_sport'] },
      levelMin: 2,
      // Drift/speed challenges need open road — highway corridor only.
      roadType: 'highway'
    },
    {
      title: 'Speed Demon',
      description: 'Push your vehicle to its limits',
      objectiveType: 'reachSpeed',
      baseTarget: 180,
      baseReward: { coins: 200, xp: 100, items: [] },
      levelMin: 4,
      roadType: 'highway'
    }
  ],
  daily: [
    {
      title: 'Coin Collector',
      description: 'Gather scattered currency along the route',
      objectiveType: 'collectCoins',
      baseTarget: 800,
      baseReward: { coins: 150, xp: 75, items: [] },
      levelMin: 1
    },
    {
      title: 'Survival Run',
      description: 'Drive without crashing for an extended distance',
      objectiveType: 'driveDistance',
      baseTarget: 3000,
      baseReward: { coins: 220, xp: 110, items: ['item_repair_kit'] },
      levelMin: 3
    }
  ],
  exploration: [
    {
      title: 'Scenic Route',
      description: 'Visit the overlook point for a breathtaking view',
      objectiveType: 'reachLocation',
      baseTarget: 1,
      baseReward: { coins: 100, xp: 50, items: ['cosmetic_neon_under'] },
      levelMin: 1
    }
  ],
  delivery: [
    {
      title: 'Express Delivery',
      description: 'Transport cargo to the next depot',
      objectiveType: 'reachLocation',
      baseTarget: 1,
      baseReward: { coins: 400, xp: 200, items: ['part_fuel_injector'] },
      levelMin: 5
    }
  ],
  challenge: [
    {
      title: 'No Brakes',
      description: 'Complete a segment without using the brake pedal',
      objectiveType: 'driveDistance',
      baseTarget: 1500,
      baseReward: { coins: 350, xp: 175, items: ['part_brake_perf'] },
      levelMin: 6
    }
  ],
  tour: [
    {
      title: 'Sunset Cruise',
      description: 'Enjoy the golden hour along the coastal highway',
      objectiveType: 'driveDistance',
      baseTarget: 2500,
      baseReward: { coins: 280, xp: 140, items: ['cosmetic_spoiler'] },
      levelMin: 2
    }
  ]
};

export class QuestManager {
  private static instance: QuestManager | null = null;
  private activeQuestsByChunk = new Map<string, Quest[]>();
  private npcQuestAssignments = new Map<string, string[]>(); // npcId -> questIds
  private generatedQuestIds = new Set<string>();
  
  private constructor() {}
  
  static getInstance(): QuestManager {
    if (!QuestManager.instance) QuestManager.instance = new QuestManager();
    return QuestManager.instance;
  }
  
  /**
   * Generate a quest procedurally based on chunk, player level, and category
   */
  generateQuest(chunkId: string, category: QuestCategory, playerLevel: number, roadType: 'highway' | 'city', seedSalt = 0): Quest | null {
    const templates = QUEST_TEMPLATES[category].filter(t =>
      playerLevel >= t.levelMin &&
      (!t.roadType || t.roadType === roadType)
    );

    if (templates.length === 0) return null;

    // Deterministic per chunk + category + slot — no Math.random.
    const rng = chunkRng(chunkId, 100 + seedSalt + category.length);
    const template = templates[Math.floor(rng() * templates.length)];
    const questId = `q_${category}_${chunkId}_${seedSalt}`;

    // Calculate dynamic target based on player progression
    const difficultyMult = 1 + (playerLevel - 1) * 0.15;
    const target = Math.round(template.baseTarget * difficultyMult);

    // Generate objective location if needed
    const [gx, gz] = chunkId.split('_').map(Number);
    let location: { x: number; y: number; z: number } | undefined;
    let giverShopId: string | undefined;
    if (template.objectiveType === 'reachLocation') {
      // Place objective 1-3 chunks ahead on same road type
      const aheadChunks = 1 + Math.floor(rng() * 3);
      location = {
        x: (gx + (roadType === 'highway' ? 0 : rng() > 0.5 ? 1 : -1)) * ZONE_GRID_SIZE,
        y: 0.5,
        z: (gz + aheadChunks) * ZONE_GRID_SIZE + rng() * ZONE_GRID_SIZE * 0.5
      };

      // Delivery objectives target a real storefront when one exists nearby.
      if (category === 'delivery') {
        const shop = pickNearbyShop(gx, gz, rng);
        if (shop) {
          location = { x: shop.position.x, y: 0.5, z: shop.position.z };
          giverShopId = shop.id;
        }
      }
    }

    const objective: QuestObjective = {
      id: `obj_${questId}`,
      type: template.objectiveType,
      description: template.description,
      target: template.objectiveType === 'reachLocation' ? 1 : target,
      current: 0,
      isCompleted: false,
      location,
      radius: template.objectiveType === 'reachLocation' ? 15 : undefined
    };

    // Scale rewards
    const reward: QuestReward = {
      coins: Math.round(template.baseReward.coins * difficultyMult),
      xp: Math.round(template.baseReward.xp * difficultyMult),
      items: template.baseReward.items,
      unlockVehicle: playerLevel > 8 && rng() > 0.7 ? `veh_hyper_01` : undefined
    };

    return {
      id: questId,
      title: template.title,
      description: template.description,
      category,
      objectives: [objective],
      rewards: reward,
      prerequisites: [],
      levelRequirement: template.levelMin,
      timeLimitSeconds: category === 'daily' ? 1800 : 0, // 30 min for daily
      isRepeatable: category === 'daily',
      giverName: this.generateNPCName(chunkRng(chunkId, 7 + seedSalt)),
      giverShopId: giverShopId ?? (category === 'delivery' ? `shop_depot_${questId}` : undefined),
      chunkId
    };
  }

  /**
   * Generate NPC name procedurally. Pass a seeded rng for deterministic names;
   * defaults to Math.random for incidental callers.
   */
  private generateNPCName(rng: () => number = Math.random): string {
    const firstNames = ['Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Quinn', 'Avery'];
    const lastNames = ['Drive', 'Road', 'Lane', 'Shift', 'Gear', 'Turbo', 'Apex', 'Drift'];
    return `${firstNames[Math.floor(rng() * firstNames.length)]} ${lastNames[Math.floor(rng() * lastNames.length)]}`;
  }
  
  /**
   * Register quests for a chunk when it loads
   */
  loadChunkQuests(chunkId: string, roadType: 'highway' | 'city', playerLevel: number): Quest[] {
    if (this.activeQuestsByChunk.has(chunkId)) return this.activeQuestsByChunk.get(chunkId)!;

    const quests: Quest[] = [];
    const [gx, gz] = chunkId.split('_').map(Number);
    const zone = zoneAtChunk(gx, gz);
    const weights = zoneCategoryWeights(zone);

    // Deterministic count and category selection per chunk.
    const rng = chunkRng(chunkId, 1);
    const numQuests = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < numQuests; i++) {
      const category = weightedPick(CATEGORY_ORDER, weights, rng());
      const quest = this.generateQuest(chunkId, category, playerLevel, roadType, i + 1);
      if (quest && !this.generatedQuestIds.has(quest.id)) {
        quests.push(quest);
        this.generatedQuestIds.add(quest.id);
      }
    }

    this.activeQuestsByChunk.set(chunkId, quests);
    return quests;
  }
  
  /**
   * Assign quests to an NPC at a specific location
   */
  assignQuestsToNPC(npcId: string, chunkId: string, roadType: 'highway' | 'city', playerLevel: number): string[] {
    const quests = this.loadChunkQuests(chunkId, roadType, playerLevel);
    const available = quests.filter(q => !this.npcQuestAssignments.has(q.id));
    const assigned = available.slice(0, 2).map(q => q.id);
    
    this.npcQuestAssignments.set(npcId, assigned);
    return assigned;
  }
  
  /**
   * Get quests available from an NPC
   */
  getNPCQuests(npcId: string): Quest[] {
    const questIds = this.npcQuestAssignments.get(npcId) || [];
    const allQuests = Array.from(this.activeQuestsByChunk.values()).flat();
    return allQuests.filter(q => questIds.includes(q.id));
  }
  
  /**
   * Accept a quest: move from available to active in store
   */
  acceptQuest(questId: string, npcId: string): boolean {
    const allQuests = Array.from(this.activeQuestsByChunk.values()).flat();
    const quest = allQuests.find(q => q.id === questId);
    if (!quest) return false;
    
    const state = useGameStore.getState();
    if (state.profile.level < quest.levelRequirement) return false;
    
    // Add to available quests in store if not already there
    if (!state.availableQuests.some(q => q.id === questId)) {
      useGameStore.setState(s => ({
        availableQuests: [...s.availableQuests, {
          ...quest,
          objectives: quest.objectives.map(o => ({ ...o }))
        }]
      }));
    }
    
    // Remove from NPC assignment pool
    const assigned = this.npcQuestAssignments.get(npcId) || [];
    this.npcQuestAssignments.set(npcId, assigned.filter(id => id !== questId));
    
    return true;
  }
  
  /**
   * Update quest progress based on game events
   */
  updateQuestProgress(eventType: ObjectiveType, value: number, location?: { x: number; z: number }) {
    const state = useGameStore.getState();
    if (!state.activeQuest || state.activeQuest.status !== 'active') return;
    
    const updated = state.activeQuest.objectives.map(obj => {
      if (obj.isCompleted) return obj;
      
      let newCurrent = obj.current;
      let completed = false;
      
      if (obj.type === eventType) {
        if (eventType === 'driftDistance' || eventType === 'driveDistance' || eventType === 'collectCoins') {
          newCurrent += value;
        } else if (eventType === 'reachSpeed') {
          newCurrent = Math.max(newCurrent, value);
        } else if (eventType === 'reachLocation' && location && obj.location) {
          const dist = Math.sqrt(
            Math.pow(location.x - obj.location.x, 2) + 
            Math.pow(location.z - obj.location.z, 2)
          );
          if (dist <= (obj.radius || 15)) completed = true;
        }
      }
      
      if (newCurrent >= obj.target) completed = true;
      
      return {
        ...obj,
        current: completed ? obj.target : newCurrent,
        isCompleted: completed
      };
    });
    
    const allCompleted = updated.every(o => o.isCompleted);
    useGameStore.setState({
      activeQuest: {
        ...state.activeQuest,
        objectives: updated,
        status: allCompleted ? 'completed' : 'active'
      }
    });
    
    if (allCompleted) {
      this.completeQuest(state.activeQuest.id);
    }
  }
  
  /**
   * Complete quest and award rewards
   */
  completeQuest(questId: string) {
    const state = useGameStore.getState();
    const quest = state.availableQuests.find(q => q.id === questId) || 
                  state.activeQuest?.id === questId ? state.activeQuest : null;
    
    if (!quest) return;
    
    // Award rewards
    if (quest.rewards?.coins) useGameStore.getState().addCoins(quest.rewards.coins);
    if (quest.rewards?.xp) useGameStore.getState().addXp(quest.rewards.xp);
    // Reputation toward the next driver rank, weighted by quest category.
    const repByCategory: Record<string, number> = { main: 30, challenge: 25, tour: 20, delivery: 15, exploration: 12, daily: 10, side: 8 };
    useGameStore.getState().addReputation(repByCategory[quest.category || 'side'] ?? 8);
    quest.rewards?.items?.forEach(item => useGameStore.getState().addItemToInventory(item));
    if (quest.rewards?.unlockVehicle) {
      useGameStore.setState(s => ({
        profile: {
          ...s.profile,
          unlockedVehicles: [...s.profile.unlockedVehicles, quest.rewards!.unlockVehicle!]
        }
      }));
    }
    
    // Update stats
    useGameStore.getState().updateQuestStats({
      totalCompleted: 1,
      // A single-category delta; updateQuestStats merges it into the full record.
      categoryCompleted: { [quest.category || 'side']: 1 } as Record<QuestCategory, number>
    });
    
    // Clear active quest if this was it
    if (state.activeQuest?.id === questId) {
      useGameStore.setState({ activeQuest: null });
    }
    
    // Remove from available pool
    useGameStore.setState(s => ({
      availableQuests: s.availableQuests.filter(q => q.id !== questId)
    }));
  }
  
  /**
   * Get hint text for active quest objective
   */
  getQuestHint(questId: string): string | null {
    const state = useGameStore.getState();
    const quest = state.activeQuest?.id === questId ? state.activeQuest : 
                  state.availableQuests.find(q => q.id === questId);
    
    if (!quest || quest.objectives.length === 0) return null;
    
    const obj = quest.objectives[0];
    switch (obj.type) {
      case 'reachLocation':
        return obj.location ? `Head toward the marked location (${Math.round(obj.target - obj.current)}m remaining)` : null;
      case 'driftDistance':
        return `Keep drifting! ${Math.round(obj.target - obj.current)}m to go`;
      case 'reachSpeed':
        return `Push your speed to ${obj.target} km/h (current: ${Math.round(obj.current)} km/h)`;
      case 'collectCoins':
        return `Collect ${Math.round(obj.target - obj.current)} more coins`;
      case 'driveDistance':
        return `Drive ${Math.round((obj.target - obj.current) / 1000)}km more without crashing`;
      default:
        return obj.description;
    }
  }
  
  /**
   * Cleanup chunk quests when unloaded
   */
  unloadChunk(chunkId: string) {
    // Keep quests that are active/accepted, remove only unaccepted ones
    const state = useGameStore.getState();
    const activeQuestIds = new Set([
      ...(state.activeQuest ? [state.activeQuest.id] : []),
      ...state.availableQuests.map(q => q.id)
    ]);
    
    const chunkQuests = this.activeQuestsByChunk.get(chunkId) || [];
    const toRemove = chunkQuests.filter(q => !activeQuestIds.has(q.id)).map(q => q.id);
    
    toRemove.forEach(id => this.generatedQuestIds.delete(id));
    // Don't delete from activeQuestsByChunk to allow re-accepting if player returns
  }
}