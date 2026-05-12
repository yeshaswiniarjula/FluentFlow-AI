'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  ConversationState,
  ConversationAction,
  initialState,
  conversationReducer,
} from './conversation.store';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ConversationContextValue {
  state: ConversationState;
  dispatch: React.Dispatch<ConversationAction>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

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
