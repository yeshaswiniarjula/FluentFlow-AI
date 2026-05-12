'use client';

import { useEffect, useRef } from 'react';

export type NotificationType = 'info' | 'warning' | 'error';

interface NotificationToastProps {
  id: string;
  message: string;
  type: NotificationType;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG = {
  error: {
    containerClass: 'bg-red-900/90 border-red-700/60 text-red-100',
    iconClass: 'text-red-400',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    containerClass: 'bg-amber-900/90 border-amber-700/60 text-amber-100',
    iconClass: 'text-amber-400',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    containerClass: 'bg-gray-800/95 border-gray-700/60 text-gray-100',
    iconClass: 'text-blue-400',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
};

export function NotificationToast({ id, message, type, onDismiss }: NotificationToastProps) {
  const cfg = TYPE_CONFIG[type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(id), 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border
        shadow-xl backdrop-blur-sm max-w-sm w-full
        animate-fadeIn
        ${cfg.containerClass}
      `}
    >
      {/* Icon */}
      <span className={cfg.iconClass}>{cfg.icon}</span>

      {/* Message */}
      <p className="flex-1 text-sm leading-snug">{message}</p>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity duration-150 -mt-0.5"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

/** Portal-style container rendered at top-right of viewport */
export function NotificationContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      <div className="pointer-events-auto flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}
