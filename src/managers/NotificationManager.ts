// src/managers/NotificationManager.ts
/**
 * NotificationManager
 * Toast-style notification system for achievements, pickups, and quest updates.
 * Queue-based with auto-dismiss, priority levels, and positional anchoring.
 * Zero React dependencies - pure TypeScript with DOM manipulation for performance.
 */

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  duration: number; // ms
  icon?: 'coin' | 'quest' | 'achievement' | 'warning' | 'success';
  action?: { label: string; callback: () => void };
  timestamp: number;
}

export class NotificationManager {
  private static instance: NotificationManager | null = null;
  private container: HTMLElement | null = null;
  private queue: Notification[] = [];
  private active: Map<string, HTMLElement> = new Map();
  private readonly MAX_VISIBLE = 3;
  private readonly POSITIONS = {
    top: 'top-4 right-4',
    bottom: 'bottom-4 right-4',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Initialize the notification container in the DOM
   * Call once during app bootstrap
   */
  init() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.className = 'fixed z-[100] pointer-events-none';
    this.container.style.cssText = 'top: 0; left: 0; width: 100%; height: 100%;';
    document.body.appendChild(this.container);
  }

  /**
   * Queue a new notification for display
   */
  notify(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const full: Notification = {
      ...notification,
      id,
      timestamp: Date.now()
    };
    
    this.queue.push(full);
    this.processQueue();
    return id;
  }

  /**
   * Remove a notification by ID (e.g., if user clicks action)
   */
  dismiss(id: string) {
    const el = this.active.get(id);
    if (el) {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => {
        el.remove();
        this.active.delete(id);
        this.processQueue();
      }, 200);
    }
  }

  /**
   * Clear all notifications
   */
  clear() {
    this.queue = [];
    this.active.forEach(el => el.remove());
    this.active.clear();
  }

  private processQueue() {
    if (!this.container) return;
    
    // Fill up to MAX_VISIBLE slots
    while (this.active.size < this.MAX_VISIBLE && this.queue.length > 0) {
      const notif = this.queue.shift()!;
      this.renderNotification(notif);
    }
  }

  private renderNotification(notif: Notification) {
    if (!this.container) return;
    
    const el = document.createElement('div');
    const priorityStyles = {
      low: 'border-slate-600 bg-slate-800/90',
      medium: 'border-indigo-500 bg-indigo-900/90',
      high: 'border-yellow-500 bg-yellow-900/90',
      critical: 'border-red-500 bg-red-900/90 animate-pulse'
    };
    
    const icons: Record<NonNullable<Notification['icon']>, string> = {
      coin: '🪙',
      quest: '📜',
      achievement: '🏆',
      warning: '⚠️',
      success: '✅'
    };

    el.className = `
      ${this.POSITIONS.bottom}
      absolute pointer-events-auto
      min-w-[280px] max-w-[320px]
      p-4 rounded-xl border-2 shadow-2xl backdrop-blur-md
      ${priorityStyles[notif.priority]}
      transition-all duration-200 ease-out
      transform translate-y-0 opacity-100
    `.trim();
    
    el.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-xl shrink-0">${notif.icon ? icons[notif.icon] : '•'}</div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-white text-sm">${notif.title}</div>
          <div class="text-slate-300 text-xs mt-1 leading-relaxed">${notif.message}</div>
          ${notif.action ? `
            <button class="mt-2 text-xs font-bold text-indigo-300 hover:text-indigo-200 transition-colors">
              ${notif.action.label}
            </button>
          ` : ''}
        </div>
        <button class="text-slate-400 hover:text-white text-lg font-bold shrink-0">&times;</button>
      </div>
    `;
    
    // Close button handler
    el.querySelector('button:last-child')?.addEventListener('click', () => {
      this.dismiss(notif.id);
    });
    
    // Action button handler
    if (notif.action) {
      el.querySelector('button:not(:last-child)')?.addEventListener('click', (e) => {
        e.stopPropagation();
        notif.action?.callback();
        this.dismiss(notif.id);
      });
    }
    
    // Auto-dismiss timer
    setTimeout(() => {
      if (this.active.has(notif.id)) {
        el.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
          el.remove();
          this.active.delete(notif.id);
          this.processQueue();
        }, 200);
      }
    }, notif.duration);
    
    // Position stacking
    const offset = this.active.size * 70; // 60px height + 10px gap
    el.style.bottom = `calc(1rem + ${offset}px)`;
    
    this.container.appendChild(el);
    this.active.set(notif.id, el);
  }

  /**
   * Convenience methods for common notification types
   */
  coinPickup(amount: number) {
    return this.notify({
      title: 'Coin Collected',
      message: `+${amount} coins added to wallet`,
      priority: 'low',
      duration: 2000,
      icon: 'coin'
    });
  }

  questUpdate(questTitle: string, progress: number, target: number) {
    return this.notify({
      title: 'Quest Progress',
      message: `${questTitle}: ${Math.floor(progress)}/${target}`,
      priority: 'medium',
      duration: 3000,
      icon: 'quest'
    });
  }

  achievementUnlocked(title: string, reward: string) {
    return this.notify({
      title: '🏆 Achievement Unlocked!',
      message: `${title}\nReward: ${reward}`,
      priority: 'high',
      duration: 5000,
      icon: 'achievement'
    });
  }

  vehicleDamaged(amount: number) {
    return this.notify({
      title: 'Vehicle Damaged',
      message: `-${amount} HP - Find a repair kit or visit garage`,
      priority: 'critical',
      duration: 4000,
      icon: 'warning'
    });
  }
}