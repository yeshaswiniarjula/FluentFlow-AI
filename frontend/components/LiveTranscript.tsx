'use client';

import type { AppState } from '../store/conversation.store';

interface LiveTranscriptProps {
  transcript: string;
  appState: AppState;
}

const VISIBLE_STATES: AppState[] = ['LISTENING', 'TRANSCRIBING'];

export function LiveTranscript({ transcript, appState }: LiveTranscriptProps) {
  const isVisible = VISIBLE_STATES.includes(appState);

  return (
    <div
      className={`
        transition-all duration-300 overflow-hidden
        ${isVisible ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 pointer-events-none'}
      `}
      aria-live="polite"
      aria-label="Live transcript"
    >
      <div className="px-6 py-2 text-center">
        {transcript ? (
          <p className="text-gray-300 text-lg italic leading-snug line-clamp-2 animate-fadeIn">
            &ldquo;{transcript}&rdquo;
          </p>
        ) : (
          <p className="text-gray-500 text-base animate-pulse">
            Listening&hellip;
          </p>
        )}
      </div>
    </div>
  );
}
