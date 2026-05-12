'use client';

import type { AppState } from '../store/conversation.store';
import { wsService } from '../services/websocket.service';

interface MicButtonProps {
  appState: AppState;
  hasPermission: boolean;
  onStart: () => void;
  onStop: () => void;
}

// ─── Sub-icons ────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2z" />
      <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

// ─── Permission denied state ───────────────────────────────────

function PermissionDenied() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2z" />
          <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
          {/* Slash overlay */}
          <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-red-400 text-sm font-medium">Microphone access needed</p>
      <p className="text-gray-500 text-xs text-center max-w-[200px]">
        Enable microphone in your{' '}
        <span className="text-blue-400 underline cursor-pointer"
          onClick={() => window.open('about:blank', '_blank')}
          title="Open browser settings manually"
        >
          browser settings
        </span>
        {' '}and refresh.
      </p>
    </div>
  );
}

// ─── MicButton ────────────────────────────────────────────────

type ButtonConfig = {
  buttonClass: string;
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
  showListeningRing?: boolean;
};

export function MicButton({ appState, hasPermission, onStart, onStop }: MicButtonProps) {
  if (!hasPermission) {
    return <PermissionDenied />;
  }

  const configs: Partial<Record<AppState, ButtonConfig>> = {
    IDLE: {
      buttonClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/30',
      icon: <MicIcon />,
      label: 'Tap to speak',
      disabled: false,
      onClick: onStart,
    },
    LISTENING: {
      buttonClass: 'bg-blue-600 text-white animate-pulse shadow-lg shadow-blue-500/40',
      icon: <MicIcon />,
      label: 'Listening…',
      disabled: false,
      onClick: onStop,
      showListeningRing: true,
    },
    TRANSCRIBING: {
      buttonClass: 'bg-gray-600 text-gray-300 cursor-not-allowed',
      icon: <SpinnerIcon />,
      label: 'Processing…',
      disabled: true,
      onClick: () => {},
    },
    THINKING: {
      buttonClass: 'bg-gray-600 text-gray-300 cursor-not-allowed',
      icon: <SpinnerIcon />,
      label: 'Processing…',
      disabled: true,
      onClick: () => {},
    },
    SPEAKING: {
      buttonClass: 'bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/30',
      icon: <StopIcon />,
      label: 'Tap to interrupt',
      disabled: false,
      onClick: () => wsService.sendInterruptSignal(),
    },
    INTERRUPTED: {
      buttonClass: 'bg-amber-600 text-white cursor-wait',
      icon: <MicIcon />,
      label: 'Resuming…',
      disabled: true,
      onClick: () => {},
    },
    ERROR: {
      buttonClass: 'bg-red-900 text-red-300 cursor-not-allowed',
      icon: <MicIcon />,
      label: 'Connection error',
      disabled: true,
      onClick: () => {},
    },
  };

  const cfg = configs[appState] ?? configs.IDLE!;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Pulsing ring for LISTENING state */}
        {cfg.showListeningRing && (
          <span className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping" />
        )}

        <button
          onClick={cfg.onClick}
          disabled={cfg.disabled}
          aria-label={cfg.label}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            focus:ring-offset-gray-900 focus:ring-blue-500
            ${cfg.buttonClass}
          `}
        >
          {cfg.icon}
        </button>
      </div>

      <span className="text-xs font-medium text-gray-400 transition-all duration-200">
        {cfg.label}
      </span>
    </div>
  );
}
