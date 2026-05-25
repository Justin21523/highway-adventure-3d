// src/managers/InputManager.ts

export interface IControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  boost: boolean;
}

/**
 * InputManager
 * Unified singleton handling Keyboard + Touch inputs.
 * Touch zones are mapped to screen quadrants to avoid React UI overhead.
 * All state mutations are synchronous and zero-allocation.
 */
export class InputManager {
  private static instance: InputManager | null = null;
  private state: IControlState = {
    forward: false, backward: false, left: false, right: false, handbrake: false, boost: false
  };
  private activeTouches: Map<number, string> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): InputManager {
    if (!InputManager.instance) InputManager.instance = new InputManager();
    return InputManager.instance;
  }

  init() {
    if (this.isInitialized) return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    window.addEventListener('blur', this.onBlur);
    this.isInitialized = true;
  }

  getState(): Readonly<IControlState> {
    return this.state;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.state.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.state.backward = true; break;
      case 'KeyA': case 'ArrowLeft': this.state.left = true; break;
      case 'KeyD': case 'ArrowRight': this.state.right = true; break;
      case 'Space': this.state.handbrake = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.state.boost = true; break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.state.forward = false; break;
      case 'KeyS': case 'ArrowDown': this.state.backward = false; break;
      case 'KeyA': case 'ArrowLeft': this.state.left = false; break;
      case 'KeyD': case 'ArrowRight': this.state.right = false; break;
      case 'Space': this.state.handbrake = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.state.boost = false; break;
    }
  };

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      this.assignTouchZone(touch.identifier, touch.clientX, touch.clientY);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      this.assignTouchZone(touch.identifier, touch.clientX, touch.clientY);
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const zone = this.activeTouches.get(touch.identifier);
      if (zone) this.releaseZone(zone);
      this.activeTouches.delete(touch.identifier);
    }
  };

  private assignTouchZone(id: number, x: number, y: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const prevZone = this.activeTouches.get(id);

    let newZone = '';
    // Left 30%: Steering. Top/Bottom split maps to Left/Right for thumb drag
    if (x < w * 0.3) {
      newZone = x < w * 0.15 ? 'left' : 'right';
    } 
    // Right 70%: Pedals & Actions
    else {
      if (y < h * 0.3) newZone = 'forward'; // Top Right: Gas
      else if (y > h * 0.7) newZone = 'backward'; // Bottom Right: Brake
      else if (x > w * 0.85) newZone = 'handbrake'; // Far Right Edge
      else if (x > w * 0.6) newZone = 'boost'; // Mid Right Edge
      else newZone = prevZone || ''; // Hold current if in dead zone
    }

    if (newZone && newZone !== prevZone) {
      if (prevZone) this.releaseZone(prevZone);
      this.pressZone(newZone);
    }
    this.activeTouches.set(id, newZone);
  }

  private pressZone(zone: string) {
    switch (zone) {
      case 'forward': this.state.forward = true; break;
      case 'backward': this.state.backward = true; break;
      case 'left': this.state.left = true; break;
      case 'right': this.state.right = true; break;
      case 'handbrake': this.state.handbrake = true; break;
      case 'boost': this.state.boost = true; break;
    }
  }

  private releaseZone(zone: string) {
    switch (zone) {
      case 'forward': this.state.forward = false; break;
      case 'backward': this.state.backward = false; break;
      case 'left': this.state.left = false; break;
      case 'right': this.state.right = false; break;
      case 'handbrake': this.state.handbrake = false; break;
      case 'boost': this.state.boost = false; break;
    }
  }

  private onBlur = () => {
    this.state.forward = false; this.state.backward = false;
    this.state.left = false; this.state.right = false;
    this.state.handbrake = false; this.state.boost = false;
    this.activeTouches.clear();
  };

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('touchcancel', this.onTouchEnd);
    window.removeEventListener('blur', this.onBlur);
    InputManager.instance = null;
    this.isInitialized = false;
  }
}