import type { 
  FluentAction, 
  WSStatus, 
  OrbState, 
  MicPermission, 
  Message, 
  MessageCorrection 
} from './conversation.store';

// ─── Action Creators ──────────────────────────────────────────────────────────

export const actions = {
  setWSStatus: (status: WSStatus): FluentAction => ({
    type: 'SET_WS_STATUS',
    payload: status,
  }),

  setSessionId: (sessionId: string | null): FluentAction => ({
    type: 'SET_SESSION_ID',
    payload: sessionId,
  }),

  setLatency: (latency: number): FluentAction => ({
    type: 'SET_LATENCY',
    payload: latency,
  }),

  setOrbState: (orbState: OrbState): FluentAction => ({
    type: 'SET_ORB_STATE',
    payload: orbState,
  }),

  setMicPermission: (permission: MicPermission): FluentAction => ({
    type: 'SET_MIC_PERMISSION',
    payload: permission,
  }),

  setLiveTranscript: (text: string): FluentAction => ({
    type: 'SET_LIVE_TRANSCRIPT',
    payload: text,
  }),

  setIsListening: (isListening: boolean): FluentAction => ({
    type: 'SET_IS_LISTENING',
    payload: isListening,
  }),

  addMessage: (message: Message): FluentAction => ({
    type: 'ADD_MESSAGE',
    payload: message,
  }),

  appendToLastMessage: (role: 'user' | 'ai', content: string): FluentAction => ({
    type: 'APPEND_TO_LAST_MESSAGE',
    payload: { role, content },
  }),

  addCorrection: (messageId: string, correction: MessageCorrection): FluentAction => ({
    type: 'ADD_CORRECTION',
    payload: { messageId, correction },
  }),

  setUserAudioLevels: (levels: number[]): FluentAction => ({
    type: 'SET_USER_AUDIO_LEVELS',
    payload: levels,
  }),

  setAIAudioLevel: (level: number): FluentAction => ({
    type: 'SET_AI_AUDIO_LEVEL',
    payload: level,
  }),

  setIsPaused: (isPaused: boolean): FluentAction => ({
    type: 'SET_IS_PAUSED',
    payload: isPaused,
  }),

  reset: (): FluentAction => ({
    type: 'RESET',
  }),
};
