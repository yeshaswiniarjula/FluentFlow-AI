'use client';

import { useConversation } from '../store/conversation.context';
import { ConnectionStatus } from './ConnectionStatus';

export function Header() {
  const { state } = useConversation();

  return (
    <header
      className="
        flex items-center justify-between
        px-6 h-[60px] flex-shrink-0
        bg-gray-900 border-b border-gray-800
        shadow-lg z-50
      "
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3">
        {/* Animated orb icon */}
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-80 blur-sm animate-pulse" />
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Brand name with gradient */}
        <h1 className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            FluentFlow
          </span>{' '}
          <span className="text-gray-100">AI</span>
        </h1>

        {/* Tagline — hidden on small screens */}
        <span className="hidden sm:block text-xs text-gray-500 font-medium mt-0.5">
          Real-time English tutor
        </span>
      </div>

      {/* ── Connection Status ── */}
      <ConnectionStatus status={state.connectionStatus} />
    </header>
  );
}
