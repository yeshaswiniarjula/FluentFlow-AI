import { BACKEND_WS_URL } from './config';

type EventHandler = (data: Record<string, unknown>) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private intentionalDisconnect = false;
  private onConnectedCallback: ((sessionId: string) => void) | null = null;

  // ─── Public API ───────────────────────────────────────────────

  connect(onConnected: (sessionId: string) => void): void {
    this.intentionalDisconnect = false;
    this.onConnectedCallback = onConnected;
    this._openConnection();
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected intentionally');
      this.ws = null;
    }
    console.log('[WS] Disconnected intentionally.');
  }

  sendAudioChunk(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Dropping audio chunk — WebSocket not open.');
      return;
    }
    const base64 = this._arrayBufferToBase64(audioData);
    this._send({ type: 'audio_chunk', audio: base64 });
  }

  sendSpeechEnded(): void {
    this._send({ type: 'speech_ended' });
  }

  sendInterruptSignal(): void {
    this._send({ type: 'interrupt_signal' });
  }

  sendAudioFinished(): void {
    this._send({ type: 'audio_finished' });
  }

  sendPong(): void {
    this._send({ type: 'pong' });
  }

  on(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (!handlers) return;
    const filtered = handlers.filter(h => h !== handler);
    this.eventHandlers.set(eventType, filtered);
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }

  // ─── Private ─────────────────────────────────────────────────

  private _openConnection(): void {
    const url = `${BACKEND_WS_URL}/ws/conversation`;
    console.log(`[WS] Connecting to ${url}...`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;
        this._routeMessage(data);
      } catch {
        console.error('[WS] Failed to parse incoming message:', event.data);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log(`[WS] Connection closed (code=${event.code})`);
      if (!this.intentionalDisconnect) {
        this._reconnect();
      }
    };

    this.ws.onerror = (event: Event) => {
      console.error('[WS] WebSocket error:', event);
      // onclose fires after onerror — reconnect is handled there
    };
  }

  private _reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached. Giving up.');
      this._emit('connection_failed', { attempts: this.reconnectAttempts });
      return;
    }

    // Exponential backoff capped at 30 seconds
    const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;

    console.log(
      `[WS] Reconnecting in ${delayMs}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      if (!this.intentionalDisconnect) {
        this._openConnection();
      }
    }, delayMs);
  }

  private _routeMessage(data: Record<string, unknown>): void {
    const type = data.type as string;

    // Ping → pong immediately, highest priority
    if (type === 'ping') {
      this.sendPong();
      return;
    }

    // "connected" event: capture session_id then notify caller
    if (type === 'connected') {
      const sid = data.session_id as string;
      this.sessionId = sid;
      if (this.onConnectedCallback) {
        this.onConnectedCallback(sid);
      }
    }

    this._emit(type, data);
  }

  private _emit(eventType: string, data: Record<string, unknown>): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(h => h(data));
    }
  }

  private _send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WS] Cannot send "${payload.type}" — socket not open.`);
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }

  private _arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Singleton — one connection for the whole app lifetime
export const wsService = new WebSocketService();
