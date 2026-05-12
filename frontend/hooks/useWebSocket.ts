'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { wsService } from '../services/websocket.service';
import type { ConnectionStatus } from '../store/conversation.store';

type EventHandler = (data: Record<string, unknown>) => void;

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  send: (payload: Record<string, unknown>) => void;
}

export function useWebSocket(
  onEvent: (type: string, data: Record<string, unknown>) => void
): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const onEventRef = useRef(onEvent);

  // Keep the ref up-to-date without triggering re-connect on re-renders
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    setConnectionStatus('connecting');

    // Generic event fan-out handler
    const handleEvent: EventHandler = (data) => {
      const type = (data.type as string) ?? '';
      onEventRef.current(type, data);
    };

    // Specific status events we intercept for our local state
    const handleConnected: EventHandler = (data) => {
      setConnectionStatus('connected');
      onEventRef.current('connected', data);
    };

    const handleConnectionFailed: EventHandler = (data) => {
      setConnectionStatus('error');
      onEventRef.current('connection_failed', data);
    };

    // Register targeted listeners
    wsService.on('connected', handleConnected);
    wsService.on('connection_failed', handleConnectionFailed);

    // Register a catch-all handler for all other event types
    const ALL_EVENT_TYPES = [
      'transcript', 'ai_response', 'grammar_correction',
      'audio_complete', 'interrupted', 'state_change',
      'error', 'ping', 'pong', 'audio_chunk',
      'ai_response_text_only', 'audio_cancelled',
    ];

    ALL_EVENT_TYPES.forEach(type => wsService.on(type, handleEvent));

    // Connect — session ID captured internally by wsService
    wsService.connect(() => {
      // onConnected fires after "connected" event; handled above
    });

    return () => {
      // Cleanup all listeners on unmount
      wsService.off('connected', handleConnected);
      wsService.off('connection_failed', handleConnectionFailed);
      ALL_EVENT_TYPES.forEach(type => wsService.off(type, handleEvent));
      wsService.disconnect();
      setConnectionStatus('disconnected');
    };
  }, []); // mount/unmount only

  const send = useCallback((payload: Record<string, unknown>) => {
    // Thin wrapper — callers can send arbitrary messages without importing wsService
    wsService['_send']?.(payload);
  }, []);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    send,
  };
}
