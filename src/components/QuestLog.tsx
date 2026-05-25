/**
 * QuestLog — Quest log UI component.
 *
 * Displays active quests, available quests, and quest progress.
 * Can be toggled open/closed with a key binding.
 */

import { useQuestStore } from '@/stores/questStore';
import { useGameStore } from '@/stores/gameStore';
import { formatFraction, formatTime, formatQuestCategory } from '@/utils/format';

/* ─────────────────────────────────────────────
 * QuestLog Component
 * ───────────────────────────────────────────── */

export function QuestLog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const activeQuests = useQuestStore((state) => state.activeQuests);
  const availableQuests = useQuestStore((state) => state.availableQuests);
  const completedQuests = useQuestStore((state) => state.completedQuests);
  const acceptQuest = useQuestStore((state) => state.acceptQuest);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl border border-white/20 bg-gray-900/95 p-6 backdrop-blur-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">📋 Quest Log</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            ✕ Close
          </button>
        </div>

        {/* Active Quests */}
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-bold text-yellow-400">Active Quests</h3>
          {activeQuests.length === 0 ? (
            <div className="rounded-lg bg-gray-800 p-4 text-center text-gray-400">
              No active quests. Accept a quest below!
            </div>
          ) : (
            <div className="space-y-3">
              {activeQuests.map((quest) => (
                <QuestCard key={quest.questId} quest={quest} isCompleted={quest.status === 'completed'} />
              ))}
            </div>
          )}
        </div>

        {/* Available Quests */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-blue-400">Available Quests</h3>
          {availableQuests.length === 0 ? (
            <div className="rounded-lg bg-gray-800 p-4 text-center text-gray-400">
              No quests available right now.
            </div>
          ) : (
            <div className="space-y-3">
              {availableQuests.slice(0, 5).map((quest) => (
                <AvailableQuestCard
                  key={quest.id}
                  quest={quest}
                  onAccept={() => acceptQuest(quest.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 rounded-lg bg-gray-800 p-4">
          <h3 className="mb-2 text-lg font-bold text-green-400">Statistics</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{completedQuests.length}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {useQuestStore.getState().stats.totalPickupsCollected}
              </div>
              <div className="text-xs text-gray-400">Pickups</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {Math.floor(useQuestStore.getState().stats.totalDriftDistance)}m
              </div>
              <div className="text-xs text-gray-400">Drift</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * QuestCard Component (Active Quest)
 * ───────────────────────────────────────────── */

function QuestCard({ quest, isCompleted }: { quest: import('@/types/quest').ActiveQuest; isCompleted: boolean }) {
  const failQuest = useQuestStore((state) => state.failQuest);

  return (
    <div className={`rounded-lg border p-4 ${isCompleted ? 'border-green-500/50 bg-green-900/30' : 'border-yellow-500/50 bg-yellow-900/20'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className={`font-bold ${isCompleted ? 'text-green-300 line-through' : 'text-yellow-300'}`}>
          {quest.title}
        </h4>
        <span className="text-xs text-gray-400">{formatQuestCategory(quest.category)}</span>
      </div>

      <p className="mb-3 text-sm text-gray-300">{quest.description}</p>

      {/* Objectives */}
      <div className="space-y-2">
        {quest.objectives.map((objective) => (
          <ObjectiveBar key={objective.id} objective={objective} />
        ))}
      </div>

      {/* Rewards */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>🪙 {quest.rewards.coins}</span>
        <span>⭐ {quest.rewards.xp} XP</span>
        {quest.rewards.items.length > 0 && (
          <span>📦 {quest.rewards.items.length} items</span>
        )}
      </div>

      {/* Time limit */}
      {quest.timeLimitSeconds > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Time remaining: {formatTime(quest.timeLimitSeconds - quest.elapsedSeconds)}
        </div>
      )}

      {/* Fail button */}
      {!isCompleted && (
        <button
          onClick={() => failQuest(quest.questId!)}
          className="mt-3 rounded bg-red-600/50 px-3 py-1 text-xs text-white hover:bg-red-600"
        >
          Fail Quest
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * AvailableQuestCard Component
 * ───────────────────────────────────────────── */

function AvailableQuestCard({
  quest,
  onAccept,
}: {
  quest: import('@/types/quest').Quest;
  onAccept: () => void;
}) {
  const gameStore = useGameStore.getState();

  if (gameStore.profile.level < quest.levelRequirement) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 opacity-50">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-400">{quest.title}</h4>
          <span className="text-xs text-gray-500">Requires Lv. {quest.levelRequirement}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-500/50 bg-blue-900/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-bold text-blue-300">{quest.title}</h4>
        <span className="text-xs text-gray-400">{formatQuestCategory(quest.category)}</span>
      </div>

      <p className="mb-3 text-sm text-gray-300">{quest.description}</p>

      {/* Objectives preview */}
      <div className="mb-3 text-sm text-gray-400">
        {quest.objectives.map((obj) => (
          <div key={obj.id} className="mb-1">• {obj.description}</div>
        ))}
      </div>

      {/* Rewards */}
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-400">
        <span>🪙 {quest.rewards.coins}</span>
        <span>⭐ {quest.rewards.xp} XP</span>
      </div>

      <button
        onClick={onAccept}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
      >
        Accept Quest
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * ObjectiveBar Component
 * ───────────────────────────────────────────── */

function ObjectiveBar({ objective }: { objective: import('@/types/quest').QuestObjective }) {
  const progress = Math.min((objective.current / objective.target) * 100, 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={objective.isCompleted ? 'text-green-400' : 'text-gray-300'}>
          {objective.isCompleted ? '✓ ' : ''}{objective.description}
        </span>
        <span className="text-gray-400">{formatFraction(objective.current, objective.target)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${
            objective.isCompleted ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
