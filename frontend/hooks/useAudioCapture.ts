'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { audioService } from '../services/audio.service';
import { wsService } from '../services/websocket.service';
import type { AppState } from '../store/conversation.store';

interface UseAudioCaptureReturn {
  isCapturing: boolean;
  hasPermission: boolean;
  permissionDenied: boolean;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

export function useAudioCapture(appState: AppState): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Stable callback refs so the audio service closures don't go stale
  const appStateRef = useRef(appState);
  useEffect(() => { appStateRef.current = appState; }, [appState]);

  const startCapture = useCallback(async () => {
    if (!hasPermission) {
      const granted = await audioService.requestPermission();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
      setHasPermission(true);
      setPermissionDenied(false);
    }

    await audioService.startCapture(
      // onAudioChunk
      (chunk: ArrayBuffer) => {
        wsService.sendAudioChunk(chunk);
      },
      // onSpeechStart
      () => {
        // isMicActive is driven by the parent via appState; the store
        // update happens in useConversationEvents listening to "state_change"
        console.log('[useAudioCapture] Speech started');
      },
      // onSpeechEnd
      () => {
        console.log('[useAudioCapture] Speech ended — signaling backend');
        wsService.sendSpeechEnded();
      }
    );

    setIsCapturing(true);
  }, [hasPermission]);

  const stopCapture = useCallback(() => {
    audioService.stopCapture();
    setIsCapturing(false);
  }, []);

  // React to appState changes automatically
  useEffect(() => {
    if (appState === 'LISTENING') {
      if (!isCapturing) {
        startCapture();
      }
    } else if (appState === 'SPEAKING' || appState === 'THINKING' || appState === 'IDLE') {
      if (isCapturing) {
        stopCapture();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  // Request permission eagerly on mount so user isn't surprised later
  useEffect(() => {
    audioService.requestPermission().then(granted => {
      setHasPermission(granted);
      if (!granted) setPermissionDenied(true);
    });

    return () => {
      // Always stop capture on unmount
      audioService.stopCapture();
      setIsCapturing(false);
    };
  }, []);

  return { isCapturing, hasPermission, permissionDenied, startCapture, stopCapture };
}
