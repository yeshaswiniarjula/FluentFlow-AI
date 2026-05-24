'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RemoteParticipant } from 'livekit-client';
import VoiceInterface from '../../components/VoiceInterface';


function AIAudioRenderer() {
  const tracks = useTracks([{ source: Track.Source.Microphone, withPlaceholder: false }], { onlySubscribed: true });
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    tracks.forEach(({ participant, publication }) => {
      if (!(participant instanceof RemoteParticipant)) return;
      const track = publication?.track;
      if (!track) return;
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.muted = false;
      track.attach(audioEl);
      document.body.appendChild(audioEl);
      cleanups.push(() => { track.detach(audioEl); audioEl.remove(); });
    });
    return () => cleanups.forEach(fn => fn());
  }, [tracks]);
  return null;
}

export default function HomePage() {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchToken = () => {
    setIsRetrying(true);
    setError(null);
    
    // Fetch token from our FastAPI backend using relative endpoint proxied by Next.js rewrites
    fetch('/api/token')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server returned status ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (!data.token || !data.url) {
          throw new Error("Invalid token response payload from backend");
        }
        setToken(data.token);
        setUrl(data.url);
      })
      .catch(err => {
        console.error("Failed to fetch token. Is backend running?", err);
        setError(err.message || "Unable to establish a secure connection to the FluentFlow AI backend.");
      })
      .finally(() => {
        setIsRetrying(false);
      });
  };

  useEffect(() => {
    fetchToken();
  }, []);

  // Gorgeous state-of-the-art Glassmorphic Diagnostic Screen
  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4 text-white overflow-hidden relative">
        {/* Dynamic Background Gradients */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rose-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
        
        {/* Main Card Container */}
        <div className="relative flex flex-col items-center max-w-md w-full p-8 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.08)] text-center transform transition-all duration-300 scale-100">
          
          {/* Animated Glowing Hazard Badge */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-2xl bg-rose-500/25 blur-xl animate-pulse" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-950 border border-rose-500/30 text-rose-400">
              <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Connection Blocked</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            FluentFlow is unable to negotiate a secure real-time audio session token with the backend.
          </p>

          {/* Console-like Diagnostic Error Log */}
          <div className="w-full text-left bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 mb-6 max-h-36 overflow-y-auto font-mono text-xs text-rose-300/90 leading-relaxed shadow-inner">
            <div className="flex items-center gap-1.5 mb-1 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              System Diagnostics Log
            </div>
            <div className="break-words mt-1.5 leading-5 select-text"><span className="text-rose-500 font-bold mr-1">[CRITICAL]</span> {error}</div>
          </div>

          {/* Troubleshooting Checklist */}
          <div className="w-full text-left space-y-3.5 mb-8">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Recommended Actions</h3>
            
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mt-0.5 shrink-0 border border-indigo-500/20">1</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Check <strong className="text-indigo-300 font-medium">Railway Environment Variables</strong> to ensure <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-200">GROQ_API_KEY</code>, <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-200">DEEPGRAM_API_KEY</code>, <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-200">LIVEKIT_API_KEY</code>, and <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-200">LIVEKIT_API_SECRET</code> are set.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mt-0.5 shrink-0 border border-indigo-500/20">2</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Verify that the <strong className="text-indigo-300 font-medium">fastapi-backend</strong> service has deployed successfully without exit crashes.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mt-0.5 shrink-0 border border-indigo-500/20">3</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ensure the backend port setting is exposed correctly to <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-200">8000</code>.
              </p>
            </div>
          </div>

          {/* Glowing Retry Button */}
          <button
            onClick={fetchToken}
            disabled={isRetrying}
            className="group relative flex items-center justify-center w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 font-semibold text-white tracking-wide shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            {isRetrying ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Re-evaluating Connection...</span>
              </div>
            ) : (
              <span>Retry Secure Connection</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!token) return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-500/10 blur-[80px]" />
      <div className="flex flex-col items-center gap-5 relative z-10">
        <div className="w-14 h-14 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.2)]" />
        <div className="animate-pulse text-indigo-400 font-semibold tracking-widest uppercase text-[10px]">Initializing FluentFlow</div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden">
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect={true}
        audio={{
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }}
        video={false}
      >
        <VoiceInterface />
        <AIAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
