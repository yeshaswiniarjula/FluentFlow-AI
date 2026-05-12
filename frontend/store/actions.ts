import type { ConversationAction, AppState, ConnectionStatus, GrammarCorrection } from './conversation.store';

// ─── Action Creators ──────────────────────────────────────────────────────────

export const actions = {
  setConnectionStatus: (status: ConnectionStatus): ConversationAction => ({
    type: 'SET_CONNECTION_STATUS',
    payload: status,
  }),

  setSessionId: (sessionId: string | null): ConversationAction => ({
    type: 'SET_SESSION_ID',
    payload: sessionId,
  }),

  setAppState: (appState: AppState): ConversationAction => ({
    type: 'SET_APP_STATE',
    payload: appState,
  }),

  setTranscript: (text: string): ConversationAction => ({
    type: 'SET_TRANSCRIPT',
    payload: text,
  }),

  addUserMessage: (content: string, timestamp?: string): ConversationAction => ({
    type: 'ADD_USER_MESSAGE',
    payload: { content, timestamp: timestamp ?? new Date().toISOString() },
  }),

  addAIMessage: (content: string, timestamp?: string): ConversationAction => ({
    type: 'ADD_AI_MESSAGE',
    payload: { content, timestamp: timestamp ?? new Date().toISOString() },
  }),

  addGrammarCorrection: (messageId: string, correction: GrammarCorrection): ConversationAction => ({
    type: 'ADD_GRAMMAR_CORRECTION',
    payload: { messageId, correction },
  }),

  setAISpeaking: (isSpeaking: boolean): ConversationAction => ({
    type: 'SET_AI_SPEAKING',
    payload: isSpeaking,
  }),

  setMicActive: (isActive: boolean): ConversationAction => ({
    type: 'SET_MIC_ACTIVE',
    payload: isActive,
  }),

  setError: (message: string): ConversationAction => ({
    type: 'SET_ERROR',
    payload: message,
  }),

  clearError: (): ConversationAction => ({
    type: 'CLEAR_ERROR',
  }),

  reset: (): ConversationAction => ({
    type: 'RESET',
  }),
};
