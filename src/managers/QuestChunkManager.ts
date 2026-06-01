// src/managers/QuestChunkManager.ts
/**
 * QuestChunkManager
 * Manages quest distribution across world chunks with deterministic seeding.
 * Ensures quests are generated consistently for the same chunk coordinates,
 * while adapting to player level and progression.
 */

import { IQuest, QuestCategory, ObjectiveType, IVec3 } from '../types/core';
import { ZONE_GRID_SIZE, zoneAtChunk, roadTypeForZone } from '../systems/ZoneManager';

// Seeded random number generator for deterministic quest placement
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Quest generation templates by category
const QUEST_TEMPLATES: Record<QuestCategory, Array<{
  title: string;
  description: string;
  objectiveType: ObjectiveType;
  baseTarget: number;
  rewardCoins: number;
  rewardXp: number;
  levelMin: number;
  roadType?: 'highway' | 'city';
}>> = {
  main: [
    {
      title: 'Highway Pioneer',
      description: 'Reach the next major checkpoint',
      objectiveType: 'reachLocation',
      baseTarget: 1,
      rewardCoins: 300,
      rewardXp: 150,
      levelMin: 1,
      roadType: 'highway'
    }
  ],
  side: [
    {
      title: 'Drift Master',
      description: 'Master controlled sliding techniques',
      objectiveType: 'driftDistance',
      baseTarget: 300,
      rewardCoins: 180,
      rewardXp: 90,
      levelMin: 2
    }
  ],
  daily: [
    {
      title: 'Coin Collector',
      description: 'Gather scattered currency along the route',
      objectiveType: 'collectCoins',
      baseTarget: 800,
      rewardCoins: 150,
      rewardXp: 75,
      levelMin: 1
    }
  ],
  exploration: [
    {
      title: 'Scenic Route',
      description: 'Visit the overlook point for a breathtaking view',
      objectiveType: 'reachLocation',
      baseTarget: 1,
      rewardCoins: 100,
      rewardXp: 50,
      levelMin: 1
    }
  ],
  delivery: [],
  challenge: [],
  tour: []
};

export class QuestChunkManager {
  private static instance: QuestChunkManager | null = null;
  private chunkQuestCache = new Map<string, IQuest[]>();
  
  private constructor() {}
  
  static getInstance(): QuestChunkManager {
    if (!QuestChunkManager.instance) {
      QuestChunkManager.instance = new QuestChunkManager();
    }
    return QuestChunkManager.instance;
  }
  
  /**
   * Generate quests for a specific chunk using deterministic seeding
   */
  generateChunkQuests(chunkX: number, chunkZ: number, playerLevel: number): IQuest[] {
    const chunkId = `${chunkX}_${chunkZ}`;
    
    // Return cached if already generated
    if (this.chunkQuestCache.has(chunkId)) {
      return this.chunkQuestCache.get(chunkId)!;
    }
    
    const quests: IQuest[] = [];
    const roadType = roadTypeForZone(zoneAtChunk(chunkX, chunkZ));
    const seedBase = chunkX * 1000 + chunkZ * 50 + playerLevel;
    
    // Generate 1-3 quests per chunk based on seeded randomness
    const questCount = 1 + Math.floor(seededRandom(seedBase) * 3);
    
    for (let i = 0; i < questCount; i++) {
      const categorySeed = seededRandom(seedBase + i * 17);
      const categories = Object.keys(QUEST_TEMPLATES) as QuestCategory[];
      const category = categories[Math.floor(categorySeed * categories.length)];
      
      const templates = QUEST_TEMPLATES[category].filter(t => 
        playerLevel >= t.levelMin && 
        (!t.roadType || t.roadType === roadType)
      );
      
      if (templates.length === 0) continue;
      
      const template = templates[Math.floor(seededRandom(seedBase + i * 31) * templates.length)];
      const difficultyMult = 1 + (playerLevel - 1) * 0.12;
      
      // Generate objective location for reachLocation type
      let location: IVec3 | undefined;
      if (template.objectiveType === 'reachLocation') {
        const aheadChunks = 1 + Math.floor(seededRandom(seedBase + i * 47) * 3);
        location = {
          x: (chunkX + (roadType === 'highway' ? 0 : Math.floor(seededRandom(seedBase + i * 53) * 3) - 1)) * ZONE_GRID_SIZE,
          y: 0.5,
          z: (chunkZ + aheadChunks) * ZONE_GRID_SIZE + seededRandom(seedBase + i * 59) * ZONE_GRID_SIZE * 0.5
        };
      }
      
      const quest: IQuest = {
        id: `q_${category}_${chunkId}_${i}_${Date.now()}`,
        title: template.title,
        description: template.description,
        category,
        objectives: [{
          id: `obj_${i}`,
          type: template.objectiveType,
          description: template.description,
          target: template.objectiveType === 'reachLocation' ? 1 : Math.round(template.baseTarget * difficultyMult),
          current: 0,
          isCompleted: false,
          location,
          radius: template.objectiveType === 'reachLocation' ? 15 : undefined
        }],
        rewards: {
          coins: Math.round(template.rewardCoins * difficultyMult),
          xp: Math.round(template.rewardXp * difficultyMult),
          items: []
        },
        prerequisites: [],
        levelRequirement: template.levelMin,
        timeLimitSeconds: category === 'daily' ? 1800 : 0,
        isRepeatable: category === 'daily',
        giverName: this.generateNPCName(seedBase + i * 71),
        giverShopId: category === 'delivery' ? `shop_depot_${chunkZ}` : undefined,
        chunkId
      };
      
      quests.push(quest);
    }
    
    this.chunkQuestCache.set(chunkId, quests);
    return quests;
  }
  
  /**
   * Generate deterministic NPC name
   */
  private generateNPCName(seed: number): string {
    const firstNames = ['Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Quinn', 'Avery'];
    const lastNames = ['Drive', 'Road', 'Lane', 'Shift', 'Gear', 'Turbo', 'Apex', 'Drift'];
    const firstIdx = Math.floor(seededRandom(seed) * firstNames.length);
    const lastIdx = Math.floor(seededRandom(seed * 2) * lastNames.length);
    return `${firstNames[firstIdx]} ${lastNames[lastIdx]}`;
  }
  
  /**
   * Clear cache for unloaded chunks to prevent memory growth
   */
  unloadChunk(chunkX: number, chunkZ: number): void {
    const chunkId = `${chunkX}_${chunkZ}`;
    this.chunkQuestCache.delete(chunkId);
  }
  
  /**
   * Get quest by ID from any loaded chunk
   */
  getQuestById(questId: string): IQuest | undefined {
    for (const quests of this.chunkQuestCache.values()) {
      const found = quests.find(q => q.id === questId);
      if (found) return found;
    }
    return undefined;
  }
}