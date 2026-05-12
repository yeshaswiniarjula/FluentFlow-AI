'use client';

import type { ConversationMessage, GrammarCorrection } from '../store/conversation.store';

interface MessageBubbleProps {
  message: ConversationMessage;
}

function formatTime(isoTimestamp: string): string {
  try {
    return new Date(isoTimestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function GrammarCorrectionCard({ correction }: { correction: GrammarCorrection }) {
  return (
    <div className="animate-fadeIn mt-1.5 max-w-[70%] self-end">
      <div className="bg-amber-950 border border-amber-700/60 rounded-xl px-3 py-2 flex gap-2 items-start">
        <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5" aria-hidden>💡</span>
        <p className="text-amber-200 text-sm leading-snug">{correction.message}</p>
      </div>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-0.5 animate-fadeIn ${isUser ? 'items-end' : 'items-start'}`}>
      {/* ── Bubble ── */}
      <div
        className={`
          max-w-[70%] px-4 py-2.5 text-sm leading-relaxed break-words
          ${isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm'
          }
        `}
      >
        {message.content}
      </div>

      {/* ── Timestamp ── */}
      <span className="text-xs text-gray-500 px-1">
        {formatTime(message.timestamp)}
      </span>

      {/* ── Grammar correction card (user messages only) ── */}
      {isUser && message.correction && (
        <GrammarCorrectionCard correction={message.correction} />
      )}
    </div>
  );
}

/** Animated typing indicator shown while AI is generating a response */
export function TypingIndicator() {
  return (
    <div className="flex items-start animate-fadeIn">
      <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 block" />
      </div>
    </div>
  );
}
