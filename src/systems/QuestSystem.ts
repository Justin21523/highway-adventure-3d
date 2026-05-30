/**
 * QuestSystem — Quest generation, event management, and pickup handling.
 *
 * Generates quests dynamically based on player progress and world state.
 * Manages random world events (road construction, sales, weather, etc.).
 * Handles world pickup spawning, collection, and respawning.
 *
 * Reads from questStore for state, writes back updates every frame.
 */

import * as THREE from 'three';
import { useQuestStore } from '@/stores/questStore';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { useShopStore } from '@/stores/shopStore';
import { GameRuntime } from './GameRuntime';
import { QUEST_REWARDS, XP_TABLE } from '@/constants/economy';
import { WORLD } from '@/constants/world';
import type { Quest, GameEvent, WorldPickup, ActiveQuest, QuestCategory } from '@/types/quest';
import type { ObjectiveType } from '@/types/quest';
import type { GameEventType } from './GameRuntime';

/* ─────────────────────────────────────────────
 * QuestSystem Singleton
 * ───────────────────────────────────────────── */

export class QuestSystem {
  private static instance: QuestSystem | null = null;

  /** Reusable vectors for distance calculations */
  private _playerPos = new THREE.Vector3();
  private _shopPos = new THREE.Vector3();

  /** Time accumulators for periodic tasks */
  private questSpawnTimer = 0;
  private eventSpawnTimer = 0;
  private pickupSpawnTimer = 0;
  private objectiveUpdateTimer = 0;

  /** Whether the system is initialized */
  private isInitialized = false;

  /** Track total distance for quest objectives */
  private totalDistanceTraveled = 0;
  private lastPlayerPos = { x: 0, y: 0, z: 0 };

  /** Track top speed for quest objectives */
  private topSpeed = 0;

  /** Track drift distance for quest objectives */
  private driftDistance = 0;

  private constructor() {}

  static getInstance(): QuestSystem {
    if (!QuestSystem.instance) {
      QuestSystem.instance = new QuestSystem();
    }
    return QuestSystem.instance;
  }

  /* ── Initialization ── */

  init(): void {
    if (this.isInitialized) return;

    // Generate initial available quests
    this.generateInitialQuests();

    // Spawn initial world events
    this.spawnInitialEvents();

    this.isInitialized = true;
  }

  /* ── Frame Update ── */

  update(delta: number): void {
    if (!this.isInitialized) return;

    const gameMode = useGameStore.getState().gameMode;

    // Only update quest objectives during playable modes
    if (gameMode === 'playing' || gameMode === 'exploration') {
      this.updateObjectiveUpdateTimer(delta);
      this.updateQuestSpawnTimer(delta);
      this.updateEventSpawnTimer(delta);
      this.updatePickupSpawnTimer(delta);
      this.trackPlayerStats(delta);
      this.checkPickupCollection();
    }

    // Check time-limited quests
    this.checkQuestTimeLimits();
  }

  /* ── Quest Generation ── */

  /** Generate initial quests when the game starts */
  private generateInitialQuests(): void {
    const questStore = useQuestStore.getState();

    // Generate a few starter quests
    const starterQuests = this.generateStarterQuests();
    for (const quest of starterQuests) {
      questStore.addAvailableQuest(quest);
    }
  }

  /** Generate starter quests for new players */
  private generateStarterQuests(): Quest[] {
    return [
      {
        id: 'quest_starter_drive',
        title: 'First Drive',
        description: 'Drive 500 meters to get started.',
        category: 'main' as QuestCategory,
        objectives: [
          {
            id: 'obj_drive_500',
            type: 'driveDistance' as ObjectiveType,
            description: 'Drive 500m',
            target: 500,
            current: 0,
            isCompleted: false,
          },
        ],
        rewards: {
          coins: 200,
          xp: 100,
          items: ['energy_drink'],
        },
        prerequisites: [],
        levelRequirement: 1,
        timeLimitSeconds: 300,
        isRepeatable: false,
        giverName: 'Highway Authority',
      },
      {
        id: 'quest_starter_coins',
        title: 'Coin Collector',
        description: 'Collect 200 coins from the road.',
        category: 'side' as QuestCategory,
        objectives: [
          {
            id: 'obj_coins_200',
            type: 'collectCoins' as ObjectiveType,
            description: 'Collect 200 coins',
            target: 200,
            current: 0,
            isCompleted: false,
          },
        ],
        rewards: {
          coins: 300,
          xp: 150,
          items: ['snack_bar'],
        },
        prerequisites: [],
        levelRequirement: 1,
        timeLimitSeconds: 600,
        isRepeatable: true,
        giverName: 'Mysterious Stranger',
      },
      {
        id: 'quest_starter_drift',
        title: 'Drift King',
        description: 'Drift for a total of 200 meters.',
        category: 'challenge' as QuestCategory,
        objectives: [
          {
            id: 'obj_drift_200',
            type: 'driftDistance' as ObjectiveType,
            description: 'Drift 200m',
            target: 200,
            current: 0,
            isCompleted: false,
          },
        ],
        rewards: {
          coins: 500,
          xp: 200,
          items: ['sport_tires'],
        },
        prerequisites: [],
        levelRequirement: 2,
        timeLimitSeconds: 600,
        isRepeatable: false,
        giverName: 'Drift Master',
      },
    ];
  }

  /** Periodically generate new available quests */
  private generateNewQuests(): void {
    const questStore = useQuestStore.getState();
    const profile = useGameStore.getState().profile;

    // Don't generate too many quests at once
    if (questStore.availableQuests.length >= 10) return;

    // Generate 1-2 new quests
    const count = Math.random() > 0.5 ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const quest = this.generateRandomQuest(profile.level);
      if (quest) {
        questStore.addAvailableQuest(quest);
      }
    }
  }

  /** Generate a random quest based on player level */
  private generateRandomQuest(playerLevel: number): Quest | null {
    const categories: QuestCategory[] = ['side', 'exploration', 'challenge', 'delivery'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    const questTemplates: Partial<Record<QuestCategory, Omit<Quest, 'id' | 'objectives'>[]>> = {
      side: [
        {
          title: 'Supply Run',
          description: 'Deliver goods to a nearby location.',
          category: 'side',
          rewards: { coins: 400, xp: 150, items: ['fuel_can_small'] },
          prerequisites: [],
          levelRequirement: 1,
          timeLimitSeconds: 300,
          isRepeatable: true,
          giverName: 'Local Merchant',
        },
        {
          title: 'Road Scout',
          description: 'Explore a new area of the highway.',
          category: 'side',
          rewards: { coins: 300, xp: 100, items: ['travel_map'] },
          prerequisites: [],
          levelRequirement: 2,
          timeLimitSeconds: 600,
          isRepeatable: true,
          giverName: 'Explorer Guild',
        },
      ],
      exploration: [
        {
          title: 'Hidden Gem',
          description: 'Discover a hidden point of interest.',
          category: 'exploration',
          rewards: { coins: 500, xp: 200, items: ['lucky_coin'] },
          prerequisites: [],
          levelRequirement: 3,
          timeLimitSeconds: 900,
          isRepeatable: false,
          giverName: 'Tourist Board',
        },
        {
          title: 'Scenic Route',
          description: 'Drive through a scenic area.',
          category: 'exploration',
          rewards: { coins: 350, xp: 150, items: ['energy_drink'] },
          prerequisites: [],
          levelRequirement: 1,
          timeLimitSeconds: 600,
          isRepeatable: true,
          giverName: 'Scenic Society',
        },
      ],
      challenge: [
        {
          title: 'Speed Demon',
          description: 'Reach a speed of 200 km/h.',
          category: 'challenge',
          rewards: { coins: 600, xp: 250, items: ['premium_fuel'] },
          prerequisites: [],
          levelRequirement: 3,
          timeLimitSeconds: 120,
          isRepeatable: false,
          giverName: 'Racing Club',
        },
        {
          title: 'Drift Master',
          description: 'Drift for 500 meters in total.',
          category: 'challenge',
          rewards: { coins: 800, xp: 300, items: ['turbo_kit'] },
          prerequisites: [],
          levelRequirement: 5,
          timeLimitSeconds: 600,
          isRepeatable: false,
          giverName: 'Drift King',
        },
      ],
      delivery: [
        {
          title: 'Express Delivery',
          description: 'Deliver a package to the service area.',
          category: 'delivery',
          rewards: { coins: 500, xp: 200, items: ['repair_kit'] },
          prerequisites: [],
          levelRequirement: 2,
          timeLimitSeconds: 300,
          isRepeatable: true,
          giverName: 'Delivery Co.',
        },
      ],
    };

    const templates = questTemplates[category];
    if (!templates || templates.length === 0) return null;

    const template = templates[Math.floor(Math.random() * templates.length)];

    // Generate objectives based on quest type
    const objectives = this.generateObjectivesForQuest(category);

    return {
      id: `quest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...template,
      objectives,
    };
  }

  /** Generate objectives for a quest based on its category */
  private generateObjectivesForQuest(category: QuestCategory): import('@/types/quest').QuestObjective[] {
    const objectiveTemplates: Record<QuestCategory, Omit<import('@/types/quest').QuestObjective, 'id'>[]> = {
      main: [
        { type: 'driveDistance', description: 'Drive 1000m', target: 1000, current: 0, isCompleted: false },
      ],
      side: [
        { type: 'driveDistance', description: 'Drive 500m', target: 500, current: 0, isCompleted: false },
        { type: 'collectCoins', description: 'Collect 100 coins', target: 100, current: 0, isCompleted: false },
      ],
      exploration: [
        { type: 'reachLocation', description: 'Reach the viewpoint', target: 1, current: 0, isCompleted: false, radius: 10 },
      ],
      challenge: [
        { type: 'reachSpeed', description: 'Reach 150 km/h', target: 150, current: 0, isCompleted: false },
        { type: 'driftDistance', description: 'Drift 300m', target: 300, current: 0, isCompleted: false },
      ],
      delivery: [
        { type: 'driveDistance', description: 'Drive to destination', target: 800, current: 0, isCompleted: false },
        { type: 'reachLocation', description: 'Arrive at drop-off point', target: 1, current: 0, isCompleted: false, radius: 15 },
      ],
      daily: [
        { type: 'driveDistance', description: 'Drive 200m', target: 200, current: 0, isCompleted: false },
      ],
      tour: [
        { type: 'reachLocation', description: 'Visit waypoint', target: 1, current: 0, isCompleted: false, radius: 20 },
      ],
    };

    const templates = objectiveTemplates[category];
    if (!templates || templates.length === 0) {
      return [
        { id: `obj_${Date.now()}_fallback`, type: 'driveDistance', description: 'Drive 100m', target: 100, current: 0, isCompleted: false },
      ];
    }

    return templates.map((obj, i) => ({
      ...obj,
      id: `obj_${Date.now()}_${i}`,
    }));
  }

  /* ── World Events ── */

  /** Spawn initial world events */
  private spawnInitialEvents(): void {
    const questStore = useQuestStore.getState();

    // Initial sale event
    questStore.spawnEvent({
      id: 'event_sale_01',
      type: 'sale',
      title: 'Grand Sale!',
      description: 'All garage items are 20% off for the next 5 minutes.',
      radius: 100,
      duration: 300,
      startTime: Date.now(),
      isActive: true,
    });
  }

  /** Periodically spawn new world events */
  private spawnNewEvents(): void {
    const questStore = useQuestStore.getState();
    const activeEvents = questStore.getActiveEvents();

    // Limit active events
    if (activeEvents.length >= 5) return;

    const eventTypes: GameEvent['type'][] = ['roadConstruction', 'accident', 'sale', 'weather', 'treasureHunt'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const playerPos = useWorldStore.getState().playerPosition;

    const event: GameEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      title: this.getEventTitle(type),
      description: this.getEventDescription(type),
      position: {
        x: playerPos.x + (Math.random() - 0.5) * 200,
        y: 0,
        z: playerPos.z + (Math.random() - 0.5) * 200,
      },
      radius: 50 + Math.random() * 100,
      duration: 60 + Math.random() * 180,
      startTime: Date.now(),
      isActive: true,
    };

    questStore.spawnEvent(event);

    GameRuntime.getInstance().dispatchEvent({
      type: 'event_spawned' as GameEventType,
      timestamp: Date.now(),
      data: { eventId: event.id, title: event.title },
    });
  }

  /** Get a title for an event type */
  private getEventTitle(type: GameEvent['type']): string {
    const titles: Record<GameEvent['type'], string> = {
      roadConstruction: 'Road Construction Ahead',
      accident: 'Accident Reported',
      sale: 'Special Sale Event',
      weather: 'Weather Alert',
      race: 'Impromptu Race',
      treasureHunt: 'Treasure Hunt!',
    };
    return titles[type] || 'Unknown Event';
  }

  /** Get a description for an event type */
  private getEventDescription(type: GameEvent['type']): string {
    const descriptions: Record<GameEvent['type'], string> = {
      roadConstruction: 'Road work ahead. Expect delays and lane closures.',
      accident: 'Minor accident on the highway. Slow down and proceed with caution.',
      sale: 'Local shops are having a special sale! Check nearby stores.',
      weather: 'Weather conditions changing. Reduce speed and use headlights.',
      race: 'An impromptu race has started nearby. Join if you dare!',
      treasureHunt: 'A treasure has been hidden nearby. Search for it!',
    };
    return descriptions[type] || 'An event has occurred.';
  }

  /** Expire old events */
  private expireOldEvents(): void {
    const questStore = useQuestStore.getState();
    const now = Date.now();

    for (const event of questStore.worldEvents) {
      if (!event.isActive) continue;

      const elapsed = (now - event.startTime) / 1000;
      if (elapsed >= event.duration) {
        questStore.expireEvent(event.id);

        GameRuntime.getInstance().dispatchEvent({
          type: 'event_expired' as GameEventType,
          timestamp: now,
          data: { eventId: event.id },
        });
      }
    }
  }

  /* ── Pickup Management ── */

  /** Periodically spawn world pickups */
  private spawnPickups(): void {
    const questStore = useQuestStore.getState();
    const playerPos = useWorldStore.getState().playerPosition;
    this._playerPos.set(playerPos.x, playerPos.y, playerPos.z);

    // Spawn coins
    if (Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 60;
      const pickup: WorldPickup = {
        id: `pickup_coin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'coin',
        position: {
          x: this._playerPos.x + Math.cos(angle) * dist,
          y: 1.2,
          z: this._playerPos.z + Math.sin(angle) * dist,
        },
        value: 50,
        chunkId: `${Math.floor(playerPos.x / WORLD.CHUNK_SIZE)}_${Math.floor(playerPos.z / WORLD.CHUNK_SIZE)}`,
        collected: false,
        respawnTime: 30,
      };
      questStore.spawnPickup(pickup);
    }

    // Spawn speed boosts occasionally
    if (Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 40;
      const pickup: WorldPickup = {
        id: `pickup_boost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'speedBoost',
        position: {
          x: this._playerPos.x + Math.cos(angle) * dist,
          y: 0.05,
          z: this._playerPos.z + Math.sin(angle) * dist,
        },
        value: 1,
        chunkId: `${Math.floor(playerPos.x / WORLD.CHUNK_SIZE)}_${Math.floor(playerPos.z / WORLD.CHUNK_SIZE)}`,
        collected: false,
        respawnTime: 60,
      };
      questStore.spawnPickup(pickup);
    }
  }

  /** Check if player has collected any nearby pickups */
  private checkPickupCollection(): void {
    const questStore = useQuestStore.getState();
    const playerPos = useWorldStore.getState().playerPosition;
    this._playerPos.set(playerPos.x, playerPos.y, playerPos.z);

    const activePickups = questStore.getActivePickups();
    let anyCollected = false;

    for (const pickup of activePickups) {
      this._shopPos.set(pickup.position.x, pickup.position.y, pickup.position.z);
      const dist = this._playerPos.distanceTo(this._shopPos);

      const collectRadius = pickup.type === 'coin' ? 2.5 : 3;

      if (dist < collectRadius) {
        // Collect the pickup
        questStore.collectPickup(pickup.id);
        anyCollected = true;

        // Apply rewards
        const gameStore = useGameStore.getState();
        if (pickup.type === 'coin') {
          gameStore.addCoins(pickup.value);

          GameRuntime.getInstance().dispatchEvent({
            type: 'coin_collected' as GameEventType,
            timestamp: Date.now(),
            data: { amount: pickup.value },
          });

          // Update quest progress
          questStore.addStat({ totalPickupsCollected: 1 });
        } else if (pickup.type === 'speedBoost') {
          gameStore.updateVehicleState({ isBoosting: true });
          // Boost will expire after 1.5 seconds (handled by game loop)
        }

        // Dispatch pickup collected event
        GameRuntime.getInstance().dispatchEvent({
          type: 'pickup_collected' as GameEventType,
          timestamp: Date.now(),
          data: { pickupId: pickup.id, type: pickup.type },
        });

        // Update stats
        questStore.addStat({ totalPickupsCollected: 1 });
      }
    }

    // Despawn collected pickups after a moment
    if (anyCollected) {
      const now = Date.now();
      for (const pickup of activePickups) {
        if (pickup.collected && pickup.collectedAt && now - pickup.collectedAt < 1000) {
          // Will be despawned next frame
        }
      }
    }
  }

  /* ── Player Stats Tracking ── */

  /** Track player stats for quest objectives */
  private trackPlayerStats(delta: number): void {
    const playerPos = useWorldStore.getState().playerPosition;
    const vehicle = useGameStore.getState().vehicle;

    // Distance traveled
    const dx = playerPos.x - this.lastPlayerPos.x;
    const dz = playerPos.z - this.lastPlayerPos.z;
    const frameDistance = Math.sqrt(dx * dx + dz * dz);
    this.totalDistanceTraveled += frameDistance;
    this.lastPlayerPos = { ...playerPos };

    // Top speed
    if (vehicle.speed > this.topSpeed) {
      this.topSpeed = vehicle.speed;
    }

    // Drift distance
    if (vehicle.isDrifting && vehicle.speed > 30) {
      this.driftDistance += vehicle.speed * delta / 3.6;
    }

    // Update game store for quest tracking
    useGameStore.getState().addXp(0); // No-op, just to trigger store sync
  }

  /* ── Quest Objective Updates ── */

  /** Periodically update quest objectives based on tracked stats */
  private updateQuestObjectives(): void {
    const questStore = useQuestStore.getState();
    const activeQuests = questStore.getActiveQuests();

    for (const quest of activeQuests) {
      for (const objective of quest.objectives) {
        if (objective.isCompleted) continue;

        let shouldUpdate = false;
        let amount = 0;

        switch (objective.type) {
          case 'driveDistance':
            if (this.totalDistanceTraveled >= objective.target) {
              amount = this.totalDistanceTraveled - objective.current;
              shouldUpdate = true;
            }
            break;
          case 'driftDistance':
            if (this.driftDistance >= objective.target) {
              amount = this.driftDistance - objective.current;
              shouldUpdate = true;
            }
            break;
          case 'reachSpeed':
            if (this.topSpeed >= objective.target && objective.current < objective.target) {
              amount = this.topSpeed - objective.current;
              shouldUpdate = true;
            }
            break;
        }

        if (shouldUpdate && amount > 0) {
          questStore.updateObjectiveProgress(quest.questId, objective.id, amount);
        }
      }
    }
  }

  /** Check if any active quests have expired */
  private checkQuestTimeLimits(): void {
    const questStore = useQuestStore.getState();

    for (const quest of questStore.activeQuests) {
      if (quest.status !== 'active') continue;

      const elapsed = quest.elapsedSeconds;
      if (quest.questId) {
        // Find the original quest for time limit
        const original = questStore.availableQuests.find((q) => q.id === quest.questId);
        if (original && elapsed >= original.timeLimitSeconds) {
          questStore.failQuest(quest.questId);
          useGameStore.getState().addNotification(`Quest "${original.title}" has expired!`);
        }
      }
    }
  }

  /* ── Timer Management ── */

  private updateQuestSpawnTimer(delta: number): void {
    this.questSpawnTimer += delta;
    if (this.questSpawnTimer >= 30) {
      this.generateNewQuests();
      this.questSpawnTimer = 0;
    }
  }

  private updateEventSpawnTimer(delta: number): void {
    this.eventSpawnTimer += delta;
    if (this.eventSpawnTimer >= 60) {
      this.spawnNewEvents();
      this.expireOldEvents();
      this.eventSpawnTimer = 0;
    }
  }

  private updatePickupSpawnTimer(delta: number): void {
    this.pickupSpawnTimer += delta;
    if (this.pickupSpawnTimer >= 2) {
      this.spawnPickups();
      this.pickupSpawnTimer = 0;
    }
  }

  private updateObjectiveUpdateTimer(delta: number): void {
    this.objectiveUpdateTimer += delta;
    if (this.objectiveUpdateTimer >= 1) {
      this.updateQuestObjectives();
      this.objectiveUpdateTimer = 0;
    }
  }

  /* ── Cleanup ── */

  dispose(): void {
    QuestSystem.instance = null;
  }
}
