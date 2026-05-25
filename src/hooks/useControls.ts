// src/hooks/useControls.ts

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';

/**
 * Represents the raw input state from keyboard/gamepad.
 * Using boolean flags for simplicity and performance.
 */
export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  boost: boolean;
}

/**
 * useControls Hook
 * Captures keyboard events and stores the state in a useRef to prevent 
 * React re-renders. The physics engine reads this ref directly inside useFrame.
 */
export function useControls() {
  const controls = useRef<ControlState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    boost: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser scrolling for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW': case 'ArrowUp':
          controls.current.forward = true;
          useGameStore.getState().setControls({ throttle: true });
          break;
        case 'KeyS': case 'ArrowDown':
          controls.current.backward = true;
          useGameStore.getState().setControls({ brake: true });
          break;
        case 'KeyA': case 'ArrowLeft':
          controls.current.left = true;
          useGameStore.getState().setControls({ steerLeft: true });
          break;
        case 'KeyD': case 'ArrowRight':
          controls.current.right = true;
          useGameStore.getState().setControls({ steerRight: true });
          break;
        case 'Space': controls.current.handbrake = true; break;
        case 'ShiftLeft': case 'ShiftRight':
          controls.current.boost = true;
          useGameStore.getState().setControls({ boost: true });
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':
          controls.current.forward = false;
          useGameStore.getState().setControls({ throttle: false });
          break;
        case 'KeyS': case 'ArrowDown':
          controls.current.backward = false;
          useGameStore.getState().setControls({ brake: false });
          break;
        case 'KeyA': case 'ArrowLeft':
          controls.current.left = false;
          useGameStore.getState().setControls({ steerLeft: false });
          break;
        case 'KeyD': case 'ArrowRight':
          controls.current.right = false;
          useGameStore.getState().setControls({ steerRight: false });
          break;
        case 'Space':
          controls.current.handbrake = false;
          break;
        case 'ShiftLeft': case 'ShiftRight':
          controls.current.boost = false;
          useGameStore.getState().setControls({ boost: false });
          break;
      }
    };

    // Handle window blur to prevent "stuck" keys when tabbing out
    const handleBlur = () => {
      controls.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        handbrake: false,
        boost: false,
      };
      useGameStore.getState().setControls({
        throttle: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
        boost: false,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return controls;
}