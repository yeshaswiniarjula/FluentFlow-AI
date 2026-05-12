'use client';

import type { ConnectionStatus as ConnectionStatusType } from '../store/conversation.store';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

const STATUS_CONFIG = {
  connected: {
    dotClass: 'bg-emerald-400',
    pulseClass: '',
    label: 'Connected',
    textClass: 'text-emerald-400',
    containerClass: 'bg-emerald-400/10 border-emerald-400/30',
  },
  connecting: {
    dotClass: 'bg-amber-400',
    pulseClass: 'animate-pulse',
    label: 'Connecting...',
    textClass: 'text-amber-400',
    containerClass: 'bg-amber-400/10 border-amber-400/30',
  },
  disconnected: {
    dotClass: 'bg-gray-500',
    pulseClass: '',
    label: 'Disconnected',
    textClass: 'text-gray-400',
    containerClass: 'bg-gray-500/10 border-gray-500/30',
  },
  error: {
    dotClass: 'bg-red-500',
    pulseClass: '',
    label: 'Connection Error',
    textClass: 'text-red-400',
    containerClass: 'bg-red-500/10 border-red-500/30',
  },
} as const;

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5
        rounded-full border text-xs font-medium
        transition-all duration-300
        ${cfg.containerClass}
      `}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${cfg.label}`}
    >
      {/* Status dot */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        {status === 'connecting' && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dotClass} opacity-75 animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dotClass} ${cfg.pulseClass}`} />
      </span>

      {/* Label */}
      <span className={`${cfg.textClass} transition-colors duration-300`}>
        {cfg.label}
      </span>
    </div>
  );
}
