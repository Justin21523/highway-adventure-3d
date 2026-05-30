/**
 * useQuests — Hook for quest state and interactions.
 *
 * Provides reactive access to quest data from the questStore.
 * Used by UI components and quest-related components.
 */

import { useEffect, useCallback } from 'react';
import { useQuestStore } from '@/stores/questStore';
import { useGameStore } from '@/stores/gameStore';
import { GameRuntime } from '@/systems/GameRuntime';
import type { GameEventType } from '@/systems/GameRuntime';
import type { QuestCategory } from '@/types/quest';

/* ─────────────────────────────────────────────
 * useQuests Hook
 * ───────────────────────────────────────────── */

export function useQuests() {
  const activeQuests = useQuestStore((state) => state.activeQuests);
  const availableQuests = useQuestStore((state) => state.availableQuests);
  const completedQuests = useQuestStore((state) => state.completedQuests);

  const acceptQuest = useQuestStore((state) => state.acceptQuest);
  const failQuest = useQuestStore((state) => state.failQuest);

  // Subscribe to quest events
  useEffect(() => {
    const runtime = GameRuntime.getInstance();

    const handleQuestAccepted = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'quest_accepted') {
        console.log('Quest accepted:', event.data?.questId);
      }
    };

    const handleQuestCompleted = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'quest_completed') {
        console.log('Quest completed:', event.data?.questId);
      }
    };

    const handleQuestFailed = (event: { type: GameEventType; data?: Record<string, unknown> }) => {
      if (event.type === 'quest_failed') {
        console.log('Quest failed:', event.data?.questId);
      }
    };

    runtime.on('quest_accepted', handleQuestAccepted);
    runtime.on('quest_completed', handleQuestCompleted);
    runtime.on('quest_failed', handleQuestFailed);

    return () => {
      runtime.off('quest_accepted', handleQuestAccepted);
      runtime.off('quest_completed', handleQuestCompleted);
      runtime.off('quest_failed', handleQuestFailed);
    };
  }, []);

  return {
    activeQuests,
    availableQuests,
    completedQuests,
    acceptQuest,
    failQuest,
  };
}

/* ─────────────────────────────────────────────
 * useQuestsByCategory Hook
 * ───────────────────────────────────────────── */

export function useQuestsByCategory(category: QuestCategory) {
  const availableQuests = useQuestStore((state) => state.availableQuests);

  const quests = availableQuests.filter((quest) => quest.category === category);

  return { quests };
}

/* ─────────────────────────────────────────────
 * useActiveQuest Hook
 * ───────────────────────────────────────────── */

export function useActiveQuest(questId: string | undefined) {
  const activeQuests = useQuestStore((state) => state.activeQuests);

  const quest = questId ? activeQuests.find((q) => q.questId === questId) : null;

  return { quest };
}

/* ─────────────────────────────────────────────
 * useQuestStats Hook
 * ───────────────────────────────────────────── */

export function useQuestStats() {
  const stats = useQuestStore((state) => state.stats);
  const completedCount = useQuestStore((state) => state.completedQuests.length);

  return {
    stats,
    completedCount,
  };
}
