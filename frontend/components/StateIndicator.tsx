'use client';

import type { AppState } from '../store/conversation.store';

interface StateIndicatorProps {
  appState: AppState;
}

interface StateConfig {
  label: string;
  icon: React.ReactNode;
  textClass: string;
  containerClass: string;
}

function PulsingDot({ colorClass }: { colorClass: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full ${colorClass} opacity-75 animate-ping`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colorClass}`} />
    </span>
  );
}

function Spinner({ colorClass }: { colorClass: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 animate-spin flex-shrink-0 ${colorClass}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StaticDot({ colorClass }: { colorClass: string }) {
  return <span className={`inline-flex rounded-full h-2.5 w-2.5 flex-shrink-0 ${colorClass}`} />;
}

const STATE_CONFIG: Record<AppState, StateConfig> = {
  IDLE: {
    label: 'Ready',
    icon: <StaticDot colorClass="bg-gray-500" />,
    textClass: 'text-gray-400',
    containerClass: 'bg-gray-800/60 border-gray-700/50',
  },
  LISTENING: {
    label: 'Listening',
    icon: <PulsingDot colorClass="bg-blue-400" />,
    textClass: 'text-blue-400',
    containerClass: 'bg-blue-500/10 border-blue-500/30',
  },
  TRANSCRIBING: {
    label: 'Processing speech…',
    icon: <Spinner colorClass="text-sky-400" />,
    textClass: 'text-sky-400',
    containerClass: 'bg-sky-500/10 border-sky-500/30',
  },
  THINKING: {
    label: 'Thinking…',
    icon: <Spinner colorClass="text-violet-400" />,
    textClass: 'text-violet-400',
    containerClass: 'bg-violet-500/10 border-violet-500/30',
  },
  SPEAKING: {
    label: 'AI Speaking',
    icon: <PulsingDot colorClass="bg-emerald-400" />,
    textClass: 'text-emerald-400',
    containerClass: 'bg-emerald-500/10 border-emerald-500/30',
  },
  INTERRUPTED: {
    label: 'Stopped',
    icon: <StaticDot colorClass="bg-amber-400" />,
    textClass: 'text-amber-400',
    containerClass: 'bg-amber-500/10 border-amber-500/30',
  },
  ERROR: {
    label: 'Error — retrying',
    icon: <StaticDot colorClass="bg-red-500" />,
    textClass: 'text-red-400',
    containerClass: 'bg-red-500/10 border-red-500/30',
  },
};

export function StateIndicator({ appState }: StateIndicatorProps) {
  const cfg = STATE_CONFIG[appState] ?? STATE_CONFIG.IDLE;

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5
        rounded-full border text-xs font-medium
        transition-all duration-300
        ${cfg.containerClass}
      `}
      role="status"
      aria-live="polite"
      aria-label={`App state: ${cfg.label}`}
    >
      {cfg.icon}
      <span className={`${cfg.textClass} transition-colors duration-300`}>
        {cfg.label}
      </span>
    </div>
  );
}
