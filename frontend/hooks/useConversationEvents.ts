'use client';

import { useCallback } from 'react';
import { useConversation } from '../store/conversation.context';
import { actions } from '../store/actions';
import type { AppState } from '../store/conversation.store';
import { playbackService } from '../services/playback.service';
import { wsService } from '../services/websocket.service';

/**
 * useConversationEvents
 *
 * Pure side-effect hook. Call once at the top of your session component.
 * Pass this as the `onEvent` callback to useWebSocket.
 *
 * Returns a stable `handleEvent` function to wire into useWebSocket.
 */
export function useConversationEvents() {
  const { state, dispatch } = useConversation();

  const handleEvent = useCallback(
    (type: string, data: Record<string, unknown>) => {
      switch (type) {
        case 'connected': {
          const sessionId = data.session_id as string;
          dispatch(actions.setSessionId(sessionId));
          dispatch(actions.setConnectionStatus('connected'));
          dispatch(actions.setAppState('LISTENING'));
          break;
        }

        case 'transcript': {
          const text = data.text as string;
          dispatch(actions.setTranscript(text));
          // Commit user message from transcript when it arrives
          dispatch(actions.addUserMessage(text, data.timestamp as string | undefined));
          break;
        }

        case 'ai_response': {
          const content = data.text as string;
          dispatch(actions.addAIMessage(content, data.timestamp as string | undefined));
          dispatch(actions.setAISpeaking(true));
          break;
        }

        case 'grammar_correction': {
          // Attach correction to the most recent user message
          const lastUserMsg = [...state.conversation]
            .reverse()
            .find(m => m.role === 'user');

          if (lastUserMsg) {
            dispatch(
              actions.addGrammarCorrection(lastUserMsg.id, {
                original: data.original as string,
                corrected: data.corrected as string,
                message: data.message as string,
              })
            );
          }
          break;
        }

        case 'audio_chunk': {
          playbackService.addChunk(data.data as string);
          break;
        }

        case 'audio_complete': {
          playbackService.play(() => {
            wsService.sendAudioFinished();
          });
          break;
        }

        case 'audio_cancelled': {
          playbackService.stop();
          dispatch(actions.setAISpeaking(false));
          break;
        }

        case 'interrupted': {
          playbackService.stop();
          dispatch(actions.setAppState('INTERRUPTED'));
          dispatch(actions.setAISpeaking(false));
          break;
        }

        case 'state_change': {
          const newState = data.state as AppState;
          dispatch(actions.setAppState(newState));
          // Mirror mic active flag from server state
          dispatch(actions.setMicActive(newState === 'LISTENING'));
          break;
        }

        case 'error': {
          const message = (data.message as string) ?? 'Unknown error from server';
          dispatch(actions.setError(message));
          break;
        }

        case 'connection_failed': {
          dispatch(actions.setConnectionStatus('error'));
          dispatch(actions.setError('Connection to server failed after retries'));
          break;
        }

        // Silently ignore known but unhandled types (ping handled in wsService)
        case 'ping':
        case 'pong':
          break;

        default:
          console.warn('[useConversationEvents] Unhandled event type:', type);
      }
    },
    // state.conversation needed to find lastUserMsg for grammar correction
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, state.conversation]
  );

  return { handleEvent };
}
