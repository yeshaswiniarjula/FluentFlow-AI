'use client';

import { useEffect, useRef } from 'react';
import type { ConversationMessage, AppState } from '../store/conversation.store';
import { MessageBubble, TypingIndicator } from './MessageBubble';

interface ConversationAreaProps {
  messages: ConversationMessage[];
  appState: AppState;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
      {/* Animated mic orb */}
      <div className="relative flex items-center justify-center w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 blur-md animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-gray-500"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2z" />
            <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
          </svg>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-gray-400 font-medium text-base">
          Start speaking to begin your conversation
        </p>
        <p className="text-gray-600 text-sm">
          FluentFlow AI will respond and gently correct your grammar
        </p>
      </div>
    </div>
  );
}

export function ConversationArea({ messages, appState }: ConversationAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const showTyping = appState === 'THINKING' || appState === 'TRANSCRIBING';

  // Auto-scroll to bottom on every new message or typing indicator
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, showTyping]);

  const isEmpty = messages.length === 0 && !showTyping;

  return (
    <div className="h-full overflow-y-auto">
      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4 p-6 min-h-full justify-end">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* AI thinking / transcribing indicator */}
          {showTyping && <TypingIndicator />}

          {/* Invisible anchor for auto-scroll */}
          <div ref={bottomRef} className="h-px" aria-hidden />
        </div>
      )}
    </div>
  );
}
