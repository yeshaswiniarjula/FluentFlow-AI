export class AudioPlaybackService {
  private chunks: Uint8Array[] = [];
  private audio: HTMLAudioElement | null = null;
  private onFinishedCallback: (() => void) | null = null;

  addChunk(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    this.chunks.push(bytes);
  }

  play(onFinished: () => void) {
    this.onFinishedCallback = onFinished;
    if (this.chunks.length === 0) {
      onFinished();
      return;
    }
    
    const totalLength = this.chunks.reduce((acc, val) => acc + val.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    const blob = new Blob([combined], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    this.audio = new Audio(url);
    this.audio.onended = () => {
      URL.revokeObjectURL(url);
      if (this.onFinishedCallback) {
         this.onFinishedCallback();
         this.onFinishedCallback = null;
      }
    };
    
    this.audio.play().catch(e => {
      console.error('[AudioPlayback] Failed to play audio:', e);
      URL.revokeObjectURL(url);
      if (this.onFinishedCallback) {
         this.onFinishedCallback();
         this.onFinishedCallback = null;
      }
    });
    
    this.chunks = [];
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.chunks = [];
  }
}

export const playbackService = new AudioPlaybackService();
