/**
 * AudioCaptureService
 *
 * Handles microphone capture and Voice Activity Detection (VAD)
 * using the Web Audio API with no external dependencies.
 *
 * NOTE: ScriptProcessorNode is deprecated but widely supported.
 * In production, replace with AudioWorkletNode for better performance
 * and to avoid running DSP on the main thread.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
 */

type AudioChunkCallback = (chunk: ArrayBuffer) => void;
type SpeechCallback = () => void;

const BUFFER_SIZE = 4096;
const SAMPLE_RATE = 16_000; // 16kHz — optimal for STT models

class AudioCaptureService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  // NOTE: ScriptProcessorNode deprecated — swap for AudioWorkletNode in production
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  isCapturing = false;
  isSpeaking = false;

  // ─── VAD tunables ────────────────────────────────────────────
  silenceThreshold = 0.01;   // RMS below this = silence
  silenceDuration = 0;       // ms of continuous silence accumulated
  speechEndDelay = 800;      // ms of silence before firing onSpeechEnd

  // ─── Permission ──────────────────────────────────────────────

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop tracks — we only wanted to trigger the permission prompt
      stream.getTracks().forEach(t => t.stop());
      console.log('[Audio] Microphone permission granted.');
      return true;
    } catch (err) {
      console.warn('[Audio] Microphone permission denied:', err);
      return false;
    }
  }

  // ─── Capture lifecycle ────────────────────────────────────────

  async startCapture(
    onAudioChunk: AudioChunkCallback,
    onSpeechStart: SpeechCallback,
    onSpeechEnd: SpeechCallback
  ): Promise<void> {
    if (this.isCapturing) {
      console.warn('[Audio] Already capturing. Call stopCapture() first.');
      return;
    }

    // 1. Get microphone stream
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 2. Build Web Audio graph
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // NOTE (production): replace ScriptProcessorNode with AudioWorkletNode
    this.processor = this.audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    // 3. VAD + chunk forwarding on each buffer
    this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      const rms = this._calculateRMS(inputBuffer);
      const bufferDurationMs = (BUFFER_SIZE / SAMPLE_RATE) * 1000;

      if (rms > this.silenceThreshold) {
        // ── Active speech ──
        if (!this.isSpeaking) {
          // Speech just started
          this.isSpeaking = true;
          this.silenceDuration = 0;
          onSpeechStart();
        } else {
          // Ongoing speech — reset silence counter
          this.silenceDuration = 0;
        }
        // Forward raw PCM chunk every buffer while speaking
        onAudioChunk(this._float32ToArrayBuffer(inputBuffer));
      } else {
        // ── Silence ──
        if (this.isSpeaking) {
          this.silenceDuration += bufferDurationMs;
          if (this.silenceDuration > this.speechEndDelay) {
            // Enough silence elapsed — signal end of utterance
            this.isSpeaking = false;
            this.silenceDuration = 0;
            onSpeechEnd();
          }
        }
      }
    };

    // 4. Wire up and start
    this.sourceNode.connect(this.processor);
    // Connect processor to destination to keep it alive (Chrome quirk)
    this.processor.connect(this.audioContext.destination);

    this.isCapturing = true;
    console.log('[Audio] Capture started at', SAMPLE_RATE, 'Hz.');
  }

  stopCapture(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    this.isCapturing = false;
    this.isSpeaking = false;
    this.silenceDuration = 0;
    console.log('[Audio] Capture stopped.');
  }

  // ─── Utilities ────────────────────────────────────────────────

  /**
   * Convert PCM ArrayBuffer → base64 string for WebSocket transmission.
   */
  convertToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // ─── Private helpers ─────────────────────────────────────────

  /**
   * Root Mean Square — simple energy-based VAD signal.
   */
  private _calculateRMS(samples: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    return Math.sqrt(sumSquares / samples.length);
  }

  /**
   * Convert Float32Array PCM samples to ArrayBuffer (16-bit PCM).
   * Grok STT expects 16-bit little-endian PCM.
   */
  private _float32ToArrayBuffer(float32: Float32Array): ArrayBuffer {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      // Clamp to [-1, 1] then scale to Int16 range
      const clamped = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = clamped * 0x7fff;
    }
    return int16.buffer;
  }
}

// Singleton — shared across all React components
export const audioService = new AudioCaptureService();
