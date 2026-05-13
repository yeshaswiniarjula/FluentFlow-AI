'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  FluentState,
  FluentAction,
  initialState,
  fluentReducer,
} from './conversation.store';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ConversationContextValue {
  state: FluentState;
  dispatch: React.Dispatch<FluentAction>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fluentReducer, initialState);

  return (
    <ConversationContext.Provider value={{ state, dispatch }}>
      {children}
    </ConversationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConversation(): ConversationContextValue {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error('useConversation must be used inside <ConversationProvider>');
  }
  return ctx;
}
