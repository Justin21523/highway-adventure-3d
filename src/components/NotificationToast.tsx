/**
 * NotificationToast — Toast notification system.
 *
 * Displays brief notifications that auto-dismiss after a few seconds.
 * Supports different types: success, error, info, warning.
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';

/* ─────────────────────────────────────────────
 * NotificationToast Component
 * ───────────────────────────────────────────── */

export function NotificationToast() {
  const notifications = useGameStore((state) => state.notifications);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={() => useGameStore.getState().dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Single Toast Component
 * ───────────────────────────────────────────── */

interface ToastProps {
  notification: {
    id: string;
    message: string;
    // Store types this loosely as string; Toast falls back to the 'info' style
    // for any unrecognized value (see typeStyles/icons lookups below).
    type: string;
    timestamp: number;
  };
  onDismiss: () => void;
}

function Toast({ notification, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const typeStyles: Record<string, string> = {
    success: 'border-green-500 bg-green-900/90 text-green-100',
    error: 'border-red-500 bg-red-900/90 text-red-100',
    info: 'border-blue-500 bg-blue-900/90 text-blue-100',
    warning: 'border-yellow-500 bg-yellow-900/90 text-yellow-100',
  };

  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${typeStyles[notification.type] || typeStyles.info}`}
    >
      <span className="text-xl">{icons[notification.type] || 'ℹ'}</span>
      <span className="flex-1 text-sm font-medium">{notification.message}</span>
      <button
        onClick={onDismiss}
        className="text-lg opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
