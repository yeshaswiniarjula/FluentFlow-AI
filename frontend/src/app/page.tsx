'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useVoiceAssistant,
  BarVisualizer,
  useLocalParticipant,
  useRemoteParticipant,
  useDataChannel,
} from '@livekit/components-react';
import '@livekit/components-styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type Toast = { id: string; message: string; original?: string; corrected?: string; type: 'info' | 'success' | 'warning' };

// ─── Utility ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Toast Component ──────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className="animate-slideInRight flex flex-col gap-1 px-4 py-3 rounded-xl border border-indigo-500/30 bg-slate-900/90 text-white shadow-2xl glass">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">✏ Grammar Correction</span>
        <button onClick={() => onDismiss(toast.id)} className="text-slate-500 hover:text-white">✕</button>
      </div>
      <div className="text-sm mt-1">
        <span className="line-through text-red-400/60 mr-2">{toast.original}</span>
        <span className="text-emerald-400 font-medium">→ {toast.corrected}</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((original: string, corrected: string) => {
    setToasts(prev => [...prev, { id: uid(), message: '', original, corrected, type: 'info' }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    // Fetch token from our FastAPI backend
    // Use window.location.hostname to avoid hardcoding localhost for deployment
    const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    fetch(`${host}/api/token`)
      .then(res => res.json())
      .then(data => {
        setToken(data.token);
        setUrl(data.url);
      })
      .catch(err => console.error("Failed to fetch token. Is backend running?", err));
  }, []);

  if (!token) return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <div className="animate-pulse text-indigo-400 font-medium tracking-widest uppercase text-xs">Initializing FluentFlow</div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 h-screen flex flex-col bg-slate-950 text-white overflow-hidden font-sans">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="glass-strong flex items-center justify-between px-6 py-4 shrink-0 border-b border-indigo-500/10">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80" />
            <div className="absolute inset-0 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">FF</span>
            </div>
          </div>
          <div>
            <h1 className="text-base font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-none">FluentFlow AI</h1>
            <p className="text-[10px] text-indigo-400/60 font-bold uppercase tracking-widest mt-1">Real-time English Tutor</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">LiveKit Engine</span>
           </div>
        </div>
      </header>

      {/* ── Main Workspace ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center relative px-6">
        {/* Ambient decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
        
        <LiveKitRoom
          serverUrl={url}
          token={token}
          connect={true}
          audio={true}
          video={false}
          onDataReceived={(payload) => {
            const decoder = new TextDecoder();
            const message = decoder.decode(payload.payload);
            if (message.startsWith('grammar_correction|')) {
              const [, original, corrected] = message.split('|');
              addToast(original, corrected);
            }
          }}
        >
          <AgentVisualizer />
          
          <div className="mt-16 w-full max-w-md">
            <div className="flex flex-col items-center gap-8">
              {/* Voice Control Bar */}
              <div className="scale-125">
                <VoiceAssistantControlBar />
              </div>
              
              <p className="text-[11px] text-slate-500 text-center max-w-[280px] leading-relaxed">
                Click the mic to start. You can interrupt the AI at any time by speaking or clicking the button.
              </p>
            </div>
          </div>
          
          <RoomAudioRenderer />
        </LiveKitRoom>
      </main>

      {/* ── Toasts ────────────────────────────────────────────── */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3 w-80">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={removeToast} />)}
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="px-6 py-4 border-t border-indigo-500/5 flex justify-center">
         <span className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em]">Powered by Groq + Deepgram + LiveKit</span>
      </footer>
    </div>
  );
}

function AgentVisualizer() {
  const { state, audioTrack } = useVoiceAssistant();
  
  return (
    <div className="flex flex-col items-center z-10">
      {/* State Label */}
      <div className="h-6 flex items-center justify-center mb-8">
        {state === 'listening' && (
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-[0.4em]">Listening</span>
          </div>
        )}
        {state === 'thinking' && (
          <div className="flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
            <span className="text-xs font-bold text-purple-400 uppercase tracking-[0.4em] ml-2">Thinking</span>
          </div>
        )}
        {state === 'speaking' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-0.5 bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-[0.4em]">Speaking</span>
          </div>
        )}
        {state === 'disconnected' && (
          <span className="text-xs font-bold text-slate-600 uppercase tracking-[0.4em]">Standby</span>
        )}
      </div>
      
      {/* Visualizer Box */}
      <div className="relative group">
        {/* Glow effect that changes color based on state */}
        <div className={`absolute -inset-4 rounded-[40px] blur-2xl opacity-20 transition-all duration-700 ${
          state === 'speaking' ? 'bg-emerald-500' : 
          state === 'thinking' ? 'bg-purple-500' : 
          state === 'listening' ? 'bg-indigo-500' : 'bg-slate-500'
        }`} />
        
        <div className="relative w-80 h-44 glass-strong rounded-[32px] flex items-center justify-center overflow-hidden border border-white/5 shadow-2xl transition-all duration-500">
          <BarVisualizer 
            state={state} 
            barCount={11} 
            trackRef={audioTrack} 
            className={`w-full h-full p-8 transition-colors duration-500 ${
              state === 'speaking' ? 'text-emerald-400' : 
              state === 'thinking' ? 'text-purple-400' : 
              state === 'listening' ? 'text-indigo-400' : 'text-slate-600'
            }`} 
          />
          
          {state === 'disconnected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connect to Start</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
