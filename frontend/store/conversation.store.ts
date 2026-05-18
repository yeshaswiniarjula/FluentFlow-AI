import { v4 as uuidv4 } from 'uuid';

// ─── State Types ─────────────────────────────────────────────────────────────

export type WSStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type ConnectionStatus = WSStatus;
export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted';
export type MicPermission = 'prompt' | 'granted' | 'denied';

export interface MessageCorrection {
  wrong: string;
  right: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  corrections?: MessageCorrection[];
}

export interface FluentState {
  // Connection
  wsStatus: WSStatus;
  sessionId: string | null;
  latency: number;
  
  // Audio states
  orbState: OrbState;
  micPermission: MicPermission;
  
  // Transcript
  liveTranscript: string;
  isListening: boolean;
  
  // Chat
  messages: Message[];
  
  // Audio levels for visualization
  userAudioLevels: number[]; // 0-255 array[8]
  aiAudioLevel: number; // 0-1
  
  // Controls
  isPaused: boolean;
}

// ─── Action Types ─────────────────────────────────────────────────────────────

export type FluentAction =
  | { type: 'SET_WS_STATUS'; payload: WSStatus }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'SET_ORB_STATE'; payload: OrbState }
  | { type: 'SET_MIC_PERMISSION'; payload: MicPermission }
  | { type: 'SET_LIVE_TRANSCRIPT'; payload: string }
  | { type: 'SET_IS_LISTENING'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'APPEND_TO_LAST_MESSAGE'; payload: { role: 'user' | 'ai'; content: string } }
  | { type: 'ADD_CORRECTION'; payload: { messageId: string; correction: MessageCorrection } }
  | { type: 'SET_USER_AUDIO_LEVELS'; payload: number[] }
  | { type: 'SET_AI_AUDIO_LEVEL'; payload: number }
  | { type: 'SET_IS_PAUSED'; payload: boolean }
  | { type: 'RESET' };

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialState: FluentState = {
  wsStatus: 'disconnected',
  sessionId: null,
  latency: 0,
  orbState: 'idle',
  micPermission: 'prompt',
  liveTranscript: '',
  isListening: false,
  messages: [],
  userAudioLevels: new Array(8).fill(0),
  aiAudioLevel: 0,
  isPaused: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function fluentReducer(
  state: FluentState,
  action: FluentAction
): FluentState {
  switch (action.type) {
    case 'SET_WS_STATUS':
      return { ...state, wsStatus: action.payload };

    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };

    case 'SET_LATENCY':
      return { ...state, latency: action.payload };

    case 'SET_ORB_STATE':
      return { ...state, orbState: action.payload };

    case 'SET_MIC_PERMISSION':
      return { ...state, micPermission: action.payload };

    case 'SET_LIVE_TRANSCRIPT':
      return { ...state, liveTranscript: action.payload };

    case 'SET_IS_LISTENING':
      return { ...state, isListening: action.payload };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'APPEND_TO_LAST_MESSAGE': {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === action.payload.role) {
        const updatedMessages = [...state.messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + action.payload.content,
        };
        return { ...state, messages: updatedMessages };
      } else {
        return {
          ...state,
          messages: [
            ...state.messages,
            { id: uuidv4(), role: action.payload.role, content: action.payload.content },
          ],
        };
      }
    }

    case 'ADD_CORRECTION': {
      const updatedMessages = state.messages.map(msg =>
        msg.id === action.payload.messageId
          ? { 
              ...msg, 
              corrections: [...(msg.corrections || []), action.payload.correction] 
            }
          : msg
      );
      return { ...state, messages: updatedMessages };
    }

    case 'SET_USER_AUDIO_LEVELS':
      return { ...state, userAudioLevels: action.payload };

    case 'SET_AI_AUDIO_LEVEL':
      return { ...state, aiAudioLevel: action.payload };

    case 'SET_IS_PAUSED':
      return { ...state, isPaused: action.payload };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}
