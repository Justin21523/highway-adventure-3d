// src/components/ui/QuestDialog.tsx
import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { QuestManager } from '../../managers/QuestManager';
import { NotificationManager } from '../../managers/NotificationManager';
import { useActivityStore, buildDelivery } from '../../stores/activityStore';

/**
 * QuestDialog
 * Interactive dialog UI for NPC quest interactions.
 * Displays available quests, accepts/declines, and shows hints.
 * Auto-closes on escape or after acceptance.
 */
export function QuestDialog() {
  const { gameMode, interactionTarget, availableQuests, setGameMode, setInteractionTarget } = useGameStore();
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Dialog is only active while interacting with an NPC.
  const isActive = gameMode === 'exploration' && !!interactionTarget && interactionTarget.type === 'npc';

  // Reset transient selection when the dialog closes — in an effect, NEVER during
  // render (calling setState during render caused an infinite re-render loop).
  useEffect(() => {
    if (!isActive) {
      setSelectedQuestId(null);
      setShowHint(false);
    }
  }, [isActive]);

  const questManager = QuestManager.getInstance();
  const npcQuests = isActive && interactionTarget ? questManager.getNPCQuests(interactionTarget.id) : [];
  const availableFromNpc = npcQuests.filter(q =>
    availableQuests.some(aq => aq.id === q.id)
  );

  const selectedQuest = availableFromNpc.find(q => q.id === selectedQuestId) || availableFromNpc[0];
  
  const handleAccept = useCallback(() => {
    if (!selectedQuest) return;
    
    // Start the quest
    useGameStore.setState({
      activeQuest: {
        id: selectedQuest.id,
        title: selectedQuest.title,
        description: selectedQuest.description,
        category: selectedQuest.category,
        objectives: selectedQuest.objectives.map(o => ({ ...o })),
        rewards: selectedQuest.rewards,
        prerequisites: selectedQuest.prerequisites,
        levelRequirement: selectedQuest.levelRequirement,
        timeLimitSeconds: selectedQuest.timeLimitSeconds,
        isRepeatable: selectedQuest.isRepeatable,
        giverName: selectedQuest.giverName, 
        giverShopId: selectedQuest.giverShopId,
        chunkId: selectedQuest.chunkId,
        startTime: Date.now(),
        elapsedSeconds: 0,
        status: 'active'
      },
      availableQuests: useGameStore.getState().availableQuests.filter(q => q.id !== selectedQuest.id)
    });
    
    // Delivery quests also kick off a timed delivery activity (drive the goods to
    // the destination shop before the clock runs out). Reuses the activity engine.
    const destLoc = selectedQuest.objectives[0]?.location;
    if (selectedQuest.category === 'delivery' && destLoc) {
      const gs = useGameStore.getState();
      useActivityStore.getState().startActivity(
        buildDelivery('delivery', { x: destLoc.x, z: destLoc.z }, gs.playerPosition.x, gs.playerPosition.z, gs.profile.level),
      );
    } else {
      // Notify player
      NotificationManager.getInstance().notify({
        title: 'Quest Accepted',
        message: `${selectedQuest.title} - Press Q to view progress`,
        priority: 'medium',
        duration: 4000,
        icon: 'quest'
      });
    }

    // Close dialog
    setInteractionTarget(null);
    setSelectedQuestId(null);
  }, [selectedQuest, setInteractionTarget]);
  
  const handleClose = useCallback(() => {
    setInteractionTarget(null);
    setSelectedQuestId(null);
    setShowHint(false);
  }, [setInteractionTarget]);
  
  // Keyboard navigation (only while the dialog is open)
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter' && selectedQuest) {
        handleAccept();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowHint(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, handleAccept, handleClose, selectedQuest]);

  // All hooks are above this line — now it is safe to bail out.
  if (!isActive || !interactionTarget) return null;

  if (availableFromNpc.length === 0) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
        <div className="bg-slate-900/95 rounded-2xl border border-slate-700 p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-white">{interactionTarget.name}</h3>
            <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
          </div>
          <p className="text-slate-400 text-center py-8">No available quests at this time.</p>
          <button onClick={handleClose} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors">
            Continue Driving
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900/95 rounded-2xl border border-indigo-500/30 p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-white">{interactionTarget.name}</h3>
            <p className="text-slate-400 text-sm">Quest Giver • {selectedQuest?.category.toUpperCase()}</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>
        
        {/* Quest List or Details */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {!selectedQuestId ? (
            // Quest selection list
            <div className="space-y-3">
              <p className="text-slate-300 mb-2">Available Contracts:</p>
              {availableFromNpc.map(quest => (
                <button
                  key={quest.id}
                  onClick={() => setSelectedQuestId(quest.id)}
                  className="w-full text-left p-4 bg-slate-800/50 hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold group-hover:text-indigo-300">{quest.title}</h4>
                      <p className="text-slate-400 text-sm mt-1">{quest.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-yellow-400 font-bold text-sm">{quest.rewards.coins} 🪙</span>
                      <p className="text-slate-500 text-xs">{quest.rewards.xp} XP</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {quest.objectives.map(obj => (
                      <span key={obj.id} className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                        {obj.type.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Quest details view
            <div className="space-y-4">
              <button 
                onClick={() => setSelectedQuestId(null)}
                className="text-indigo-400 hover:text-indigo-300 text-sm font-bold flex items-center gap-1"
              >
                ← Back to quests
              </button>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-lg font-bold text-white mb-2">{selectedQuest?.title}</h4>
                <p className="text-slate-300 mb-4">{selectedQuest?.description}</p>
                
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Objectives:</p>
                  {selectedQuest?.objectives.map(obj => (
                    <div key={obj.id} className="flex items-start gap-3">
                      <span className="text-indigo-400 mt-1">•</span>
                      <div>
                        <p className="text-slate-200">{obj.description}</p>
                        <p className="text-slate-500 text-xs">
                          Target: {obj.target} {obj.type.includes('Distance') ? 'm' : obj.type.includes('Speed') ? 'km/h' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Rewards:</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-yellow-400 font-bold">{selectedQuest?.rewards.coins} 🪙</span>
                    <span className="text-indigo-400 font-bold">{selectedQuest?.rewards.xp} XP</span>
                    {selectedQuest?.rewards.items.map(item => (
                      <span key={item} className="text-green-400">🎁 {item}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Hint toggle */}
              <button 
                onClick={() => setShowHint(!showHint)}
                className="text-slate-400 hover:text-slate-300 text-xs flex items-center gap-1"
              >
                {showHint ? '▼' : '▶'} {showHint ? 'Hide' : 'Show'} hint
              </button>
              {showHint && selectedQuest && (
                <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-3 text-sm text-indigo-200">
                  {QuestManager.getInstance().getQuestHint(selectedQuest.id)}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-700 flex gap-3">
          <button 
            onClick={handleClose}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={handleAccept}
            disabled={!selectedQuest}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors"
          >
            Accept Quest
          </button>
        </div>
      </div>
    </div>
  );
}