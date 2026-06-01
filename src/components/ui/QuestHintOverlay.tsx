// src/components/ui/QuestHintOverlay.tsx
import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

/**
 * QuestHintOverlay
 * Contextual hint display for active quest objectives.
 * Shows directional arrow, distance, and objective description.
 * Auto-hides when objective is completed or quest changes.
 */
export function QuestHintOverlay() {
  const { activeQuest, playerPosition, gameMode } = useGameStore();
  const [hintVisible, setHintVisible] = useState(false);
  const [hintText, setHintText] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [direction, setDirection] = useState(0); // degrees

  useEffect(() => {
    if (!activeQuest || activeQuest.status !== 'active' || gameMode !== 'playing') {
      setHintVisible(false);
      return;
    }
    
    const locationObj = activeQuest.objectives.find(o => 
      o.type === 'reachLocation' && o.location && !o.isCompleted
    );
    
    if (!locationObj?.location) {
      // Show generic hint for non-location objectives
      setHintText(activeQuest.objectives[0]?.description || 'Complete your objective');
      setDistance(null);
      setHintVisible(true);
      return;
    }
    
    // Calculate distance and direction to objective
    const dx = locationObj.location.x - playerPosition.x;
    const dz = locationObj.location.z - playerPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const bearing = Math.atan2(dx, dz) * (180 / Math.PI);
    
    setDistance(dist);
    setDirection(bearing);
    setHintText(`${activeQuest.title}: ${Math.round(dist)}m ahead`);
    setHintVisible(dist > (locationObj.radius || 15));
    
  }, [activeQuest, playerPosition, gameMode]);

  if (!hintVisible || !activeQuest) return null;

  return (
    <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-500/50 shadow-lg flex items-center gap-3">
        {/* Directional arrow */}
        {distance !== null && (
          <div 
            className="w-6 h-6 flex items-center justify-center"
            style={{ transform: `rotate(${direction}deg)` }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-400" fill="currentColor">
              <path d="M12 2L4 14h3v8h10v-8h3L12 2z"/>
            </svg>
          </div>
        )}
        
        {/* Hint text */}
        <span className="text-white text-sm font-medium max-w-xs truncate">
          {hintText}
        </span>
        
        {/* Distance badge */}
        {distance !== null && (
          <span className="text-indigo-300 text-xs font-bold bg-indigo-900/50 px-2 py-0.5 rounded">
            {Math.round(distance)}m
          </span>
        )}
      </div>
    </div>
  );
}