import { v4 as uuidv4 } from 'uuid';

// ─── State Types ─────────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type AppState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR';

export interface GrammarCorrection {
  original: string;
  corrected: string;
  message: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  correction?: GrammarCorrection;
}

export interface ConversationState {
  connectionStatus: ConnectionStatus;
  sessionId: string | null;
  appState: AppState;
  transcript: string;
  conversation: ConversationMessage[];
  isAISpeaking: boolean;
  isMicActive: boolean;
  lastError: string | null;
}

// ─── Action Types ─────────────────────────────────────────────────────────────

export type ConversationAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'SET_APP_STATE'; payload: AppState }
  | { type: 'SET_TRANSCRIPT'; payload: string }
  | { type: 'ADD_USER_MESSAGE'; payload: { content: string; timestamp: string } }
  | { type: 'ADD_AI_MESSAGE'; payload: { content: string; timestamp: string } }
  | {
      type: 'ADD_GRAMMAR_CORRECTION';
      payload: { messageId: string; correction: GrammarCorrection };
    }
  | { type: 'SET_AI_SPEAKING'; payload: boolean }
  | { type: 'SET_MIC_ACTIVE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialState: ConversationState = {
  connectionStatus: 'disconnected',
  sessionId: null,
  appState: 'IDLE',
  transcript: '',
  conversation: [],
  isAISpeaking: false,
  isMicActive: false,
  lastError: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };

    case 'SET_APP_STATE':
      return { ...state, appState: action.payload };

    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.payload };

    case 'ADD_USER_MESSAGE': {
      const msg: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: action.payload.content,
        timestamp: action.payload.timestamp,
      };
      return {
        ...state,
        conversation: [...state.conversation, msg],
        transcript: '', // clear live transcript once message is committed
      };
    }

    case 'ADD_AI_MESSAGE': {
      const msg: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: action.payload.content,
        timestamp: action.payload.timestamp,
      };
      return { ...state, conversation: [...state.conversation, msg] };
    }

    case 'ADD_GRAMMAR_CORRECTION': {
      const updated = state.conversation.map(msg =>
        msg.id === action.payload.messageId
          ? { ...msg, correction: action.payload.correction }
          : msg
      );
      return { ...state, conversation: updated };
    }

    case 'SET_AI_SPEAKING':
      return { ...state, isAISpeaking: action.payload };

    case 'SET_MIC_ACTIVE':
      return { ...state, isMicActive: action.payload };

    case 'SET_ERROR':
      return { ...state, lastError: action.payload, appState: 'ERROR' };

    case 'CLEAR_ERROR':
      return { ...state, lastError: null };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}
