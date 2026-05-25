/**
 * Input system types for keyboard and touch controls.
 */

/** All possible input actions in the game */
export type InputAction =
  | 'throttle'
  | 'brake'
  | 'steerLeft'
  | 'steerRight'
  | 'handbrake'
  | 'boost'
  | 'shiftUp'
  | 'shiftDown'
  | 'headlights'
  | 'horn'
  | 'interact'
  | 'pause'
  | 'map'
  | 'questLog'
  | 'cameraReset'
  | 'cameraToggle';

/** Keyboard key mapping to input actions */
export interface KeyboardMapping {
  [key: string]: InputAction;
}

/** Touch zone definition for mobile controls */
export interface TouchZone {
  id: string;
  action: InputAction;
  x: number;
  y: number;
  width: number;
  height: number;
  isAnalog: boolean;
  label: string;
  icon: string;
}

/** Current state of all input actions (polled each frame) */
export type InputState = Record<InputAction, number>;

/** Input source type */
export type InputSource = 'keyboard' | 'touch' | 'gamepad';

/** Control scheme preset */
export interface ControlScheme {
  name: string;
  keyboard: KeyboardMapping;
  touchZones: TouchZone[];
  sensitivity: number;
  invertY: boolean;
}
