'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  useVoiceAssistant, 
  useRoomContext, 
  useLocalParticipant,
} from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { v4 as uuidv4 } from 'uuid';
import { useConversation } from '../store/conversation.context';
import { actions } from '../store/actions';

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function VoiceInterface() {
  const { state, dispatch } = useConversation();
  const room = useRoomContext();
  const { state: assistantState, audioTrack: assistantAudioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();

  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const messagesRef = useRef(state.messages);
  useEffect(() => { messagesRef.current = state.messages; }, [state.messages]);

  const handleStop = () => {
    const assistantTrack = assistantAudioTrack?.track?.mediaStreamTrack;
    if (assistantTrack) {
      assistantTrack.enabled = false;
      setTimeout(() => { assistantTrack.enabled = true; }, 300);
    }
    localParticipant?.setMicrophoneEnabled(false);
    setTimeout(() => localParticipant?.setMicrophoneEnabled(true), 300);
    dispatch(actions.setIsPaused(false));
    dispatch(actions.setOrbState('listening'));
    dispatch(actions.setLiveTranscript(''));
  };

  // ─── PAUSE & RESUME AUDIO TRACK SYNC ────────────────
  useEffect(() => {
    const assistantTrack = assistantAudioTrack?.track?.mediaStreamTrack;
    if (!assistantTrack) return;
    assistantTrack.enabled = !state.isPaused;
  }, [assistantAudioTrack, state.isPaused]);

  // ─── MIC PERMISSION FLOW ───────────────────────────
  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      dispatch(actions.setMicPermission('granted'));
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Microphone permission denied:", err);
      dispatch(actions.setMicPermission('denied'));
    }
  };

  // ─── LIVEKIT CONNECTION STATE SYNC ─────────────────
  useEffect(() => {
    if (!room) return;

    const syncConnectionState = () => {
      let status: any = 'disconnected';
      if (room.state === 'connected') status = 'connected';
      else if (room.state === 'connecting') status = 'connecting';
      else if (room.state === 'reconnecting') status = 'reconnecting';
      
      dispatch(actions.setWSStatus(status));
      if (room.state === 'connected') {
        dispatch(actions.setSessionId(room.sid || 'livekit-session'));
      }
    };

    syncConnectionState();

    room.on(RoomEvent.ConnectionStateChanged, syncConnectionState);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, syncConnectionState);
    };
  }, [room, dispatch]);

  // ─── LATENCY SIMULATION FOR VISUALS ─────────────────
  useEffect(() => {
    if (state.wsStatus !== 'connected') {
      dispatch(actions.setLatency(0));
      return;
    }

    const interval = setInterval(() => {
      // Simulate low-latency jitter typical of WebRTC LiveKit connections
      const baseLatency = 35;
      const jitter = Math.floor(Math.random() * 15);
      dispatch(actions.setLatency(baseLatency + jitter));
    }, 2000);

    return () => clearInterval(interval);
  }, [state.wsStatus, dispatch]);

  // ─── DATA CHANNEL INTEGRATION ────────────────────
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      const decoder = new TextDecoder();
      const raw = decoder.decode(payload);
      try {
        const event = JSON.parse(raw);
        
        switch (event.type) {
          case 'state_change':
            dispatch(actions.setOrbState(event.payload.state));
            break;
          case 'transcript_partial':
            dispatch(actions.setLiveTranscript(event.payload.text));
            break;
          case 'transcript_final':
            if (event.payload.commitToChat) {
              dispatch(actions.addMessage({
                id: uuidv4(),
                role: 'user',
                content: event.payload.text
              }));
              dispatch(actions.setLiveTranscript(''));
            }
            break;
          case 'ai_response_chunk':
            dispatch(actions.appendToLastMessage('ai', event.payload.text));
            break;
          case 'grammar_correction':
            const lastMessage = messagesRef.current[messagesRef.current.length - 1];
            if (lastMessage && lastMessage.role === 'user') {
              dispatch(actions.addCorrection(lastMessage.id, {
                wrong: event.payload.original,
                right: event.payload.corrected
              }));
            } else {
               dispatch(actions.addMessage({
                 id: uuidv4(),
                 role: 'ai',
                 content: `Grammar Tip: You said "${event.payload.original}", but "${event.payload.corrected}" is more natural.`,
                 corrections: [{ wrong: event.payload.original, right: event.payload.corrected }]
               }));
            }
            break;
          case 'connection_status':
            dispatch(actions.setWSStatus(event.payload.status));
            dispatch(actions.setLatency(event.payload.latency));
            dispatch(actions.setSessionId(event.payload.sessionId));
            break;
        }
      } catch (e) {
        console.error("Failed to parse data message", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room, dispatch]);

  // ─── STATE MACHINE SYNC ───────────────────────────────────────
  useEffect(() => {
    if (state.isPaused) return;
    let next: any = 'idle';
    switch (assistantState) {
      case 'listening': next = 'listening'; break;
      case 'thinking': next = 'processing'; break;
      case 'speaking': next = 'speaking'; break;
    }
    dispatch(actions.setOrbState(next));
  }, [assistantState, state.isPaused, dispatch]);

  // ─── WAVEFORM UPDATES ──────────────────────────────────
  useEffect(() => {
    const audioTrack = localParticipant?.firstTrack?.track?.mediaStreamTrack;
    if (!audioTrack) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    const updateLevels = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const levels = [];
      for (let i = 0; i < 8; i++) {
        levels.push(dataArrayRef.current[i * 2] || 0);
      }
      dispatch(actions.setUserAudioLevels(levels));
      animationRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioCtx.close();
    };
  }, [localParticipant, dispatch]);

  // AI Level update
  useEffect(() => {
    const audioTrack = assistantAudioTrack?.publication?.track?.mediaStreamTrack;
    if (!audioTrack) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let aiAnim: number;
    const updateAILevel = () => {
      analyser.getByteFrequencyData(data);
      const sum = data.reduce((a, b) => a + b, 0);
      const avg = sum / data.length;
      dispatch(actions.setAIAudioLevel(avg / 255));
      aiAnim = requestAnimationFrame(updateAILevel);
    };
    updateAILevel();

    return () => {
      cancelAnimationFrame(aiAnim);
      audioCtx.close();
    };
  }, [assistantAudioTrack, dispatch]);

  if (state.micPermission === 'denied') return <DeniedScreen />;
  if (state.micPermission === 'prompt') return <PendingScreen onAllow={handleRequestPermission} />;

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] text-slate-100 font-sans overflow-hidden">
      <div className="scanline-effect" />
      
      {/* ── TOP NAVIGATION ── */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white font-['Space_Grotesk']">
              FluentFlow<span className="text-indigo-400">AI</span>
            </h1>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Session</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4 hidden sm:flex">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Connection</span>
            <span className="text-xs font-mono text-indigo-400">{state.wsStatus}</span>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

        {/* ── LEFT SIDEBAR: METRICS ── */}
        <aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-md hidden xl:flex flex-col p-6 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-indigo-500 rounded-full" /> Performance
              </h3>
              <div className="space-y-3">
                <MetricItem label="Latency" value={`${state.latency}ms`} trend="stable" />
                <MetricItem label="Stability" value="99.2%" trend="up" />
                <MetricItem label="Region" value="US-West" />
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-indigo-500 rounded-full" /> Session State
              </h3>
              <div className="flex flex-col gap-2">
                <StateBadge active={state.orbState === 'listening'} label="Listening" color="indigo" />
                <StateBadge active={state.orbState === 'processing'} label="Processing" color="amber" />
                <StateBadge active={state.orbState === 'speaking'} label="Speaking" color="purple" />
              </div>
            </div>
          </div>

          <div className="mt-auto p-4 glass-card rounded-2xl">
            <p className="text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-widest">Tutor Tip</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Try asking about common English idioms to expand your vocabulary!
            </p>
          </div>
        </aside>

        {/* ── CENTER AREA: FOCUS ── */}
        <section className="flex-1 flex flex-col items-center justify-center p-8 relative">
          
          <div className="relative mb-10 flex items-center justify-center">
            {/* Animated Rings */}
            <div className="absolute inset-[-60px] border border-white/5 rounded-full animate-spin-slow opacity-20 pointer-events-none" style={{ animationDuration: '20s' }} />
            <div className="absolute inset-[-100px] border border-white/5 rounded-full animate-spin-slow opacity-10 pointer-events-none" style={{ animationDuration: '30s', animationDirection: 'reverse' }} />
            
            <div className="relative w-56 h-56 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full blur-[40px] transition-all duration-700 ${
                state.orbState === 'listening' ? 'bg-indigo-500/30 scale-125' : 
                state.orbState === 'speaking' ? 'bg-purple-500/30 scale-125' : 
                'bg-indigo-500/10 scale-100'
              }`} />
              
              <div className={`w-full h-full rounded-full glass-morphism flex items-center justify-center transition-all duration-700 relative z-10 overflow-hidden ${
                state.orbState === 'listening' ? 'scale-110 shadow-[0_0_60px_rgba(99,102,241,0.3)]' : 
                state.orbState === 'speaking' ? 'scale-110 shadow-[0_0_60px_rgba(168,85,247,0.3)]' : 
                'scale-100'
              }`}>
                {/* Internal Glow Gradient */}
                <div className={`absolute inset-0 transition-opacity duration-700 ${state.orbState === 'speaking' ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />
                </div>
                
                <svg className="w-20 h-20 text-white drop-shadow-2xl relative z-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {state.orbState === 'speaking' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  )}
                </svg>
              </div>
            </div>

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400/80 font-['Space_Grotesk'] animate-pulse">
                {state.orbState}
              </span>
            </div>
          </div>

          <div className="w-full max-w-2xl space-y-4">
            {/* Visualizer */}
            <div className="h-6 flex items-center justify-center gap-1">
               {state.userAudioLevels.map((lvl, i) => (
                 <div 
                   key={i} 
                   className="waveform-bar" 
                   style={{ height: `${Math.max(4, (lvl / 255) * 100)}%`, opacity: 0.3 + (lvl / 255) * 0.7 }} 
                 />
               ))}
               {/* Symmetrical bars */}
               {[...state.userAudioLevels].reverse().map((lvl, i) => (
                 <div 
                   key={`rev-${i}`} 
                   className="waveform-bar" 
                   style={{ height: `${Math.max(4, (lvl / 255) * 100)}%`, opacity: 0.3 + (lvl / 255) * 0.7 }} 
                 />
               ))}
            </div>

            {/* Transcript Box */}
            <div className="glass-card rounded-[32px] p-6 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50" />
               <div className="text-lg md:text-xl font-medium leading-relaxed text-slate-100 min-h-[2.5rem] text-center">
                  {state.liveTranscript ? (
                    <span className="fade-in-up">{state.liveTranscript}</span>
                  ) : (
                    <span className="text-slate-500/70 font-normal italic text-sm md:text-base opacity-60">Awaiting speech input...</span>
                  )}
                  {state.orbState === 'listening' && <span className="cursor-blink" />}
               </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8">
               <button 
                 onClick={() => dispatch(actions.setIsPaused(!state.isPaused))}
                 className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl border-2 ${
                   state.isPaused 
                    ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/20' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500 hover:text-indigo-400'
                 }`}
                 title={state.isPaused ? "Resume" : "Pause"}
               >
                 {state.isPaused ? (
                   <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                 ) : (
                   <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                 )}
               </button>

               <button 
                onClick={handleStop}
                className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 text-slate-500 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                title="Stop & Reset"
               >
                 <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                   <rect x="6" y="6" width="12" height="12" rx="2" />
                 </svg>
               </button>
            </div>
          </div>
        </section>

        {/* ── RIGHT PANEL: CONVERSATION ── */}
        <section className="w-[450px] border-l border-white/5 bg-black/20 backdrop-blur-md hidden lg:flex flex-col">
           <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 shrink-0">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-['Space_Grotesk']">Conversation Log</h2>
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {state.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <svg className="w-16 h-16 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.827-1.24L3 20l1.314-5.106A8.831 8.831 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p className="text-sm font-medium tracking-wide">Ready for your first session.</p>
                </div>
              ) : (
                state.messages.map((msg) => (
                  <div key={msg.id} className="space-y-4 fade-in-up">
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] px-6 py-4 rounded-3xl shadow-xl transition-all ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10' 
                          : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                      }`}>
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                          {msg.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <p className="text-[15px] leading-relaxed font-medium">{msg.content}</p>
                      </div>
                    </div>
                    {msg.corrections?.map((corr: any, idx: number) => (
                      <div key={idx} className="ml-4 mr-10 p-5 glass-card rounded-2xl border-l-4 border-emerald-500/50">
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">
                          <span className="text-base">✨</span> Smart Correction
                        </div>
                        <div className="space-y-2">
                           <div className="text-xs text-slate-500 line-through decoration-red-500/30">"{corr.wrong}"</div>
                           <div className="text-sm text-emerald-400 font-bold">"{corr.right}"</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
           </div>

           {/* Audio Feed Visual */}
           {state.orbState === 'speaking' && (
             <div className="p-8 bg-indigo-500/5 border-t border-indigo-500/10 fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Vocal Pipeline</span>
                  <span className="text-[10px] font-mono text-indigo-300/40">HIGH FIDELITY</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150"
                    style={{ width: `${Math.max(2, state.aiAudioLevel * 100)}%` }}
                  />
                </div>
             </div>
           )}
        </section>
      </main>

      {/* ── FOOTER STATUS ── */}
      <footer className="h-10 px-8 flex items-center justify-between bg-black/60 backdrop-blur-xl border-t border-white/5 z-50">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full ${state.wsStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                 System: <span className={state.wsStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}>{state.wsStatus}</span>
               </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Latency: <span className="text-indigo-400">{state.latency}ms</span>
            </span>
         </div>
         <div className="flex items-center gap-6">
            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest hidden sm:block">Cluster: US-WEST-2-GPR</span>
            <span className="text-[10px] font-bold text-indigo-400/40 tracking-tighter">© 2026 FLUENTFLOW LABS</span>
         </div>
      </footer>
    </div>
  );
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

function MetricItem({ label, value, trend }: { label: string, value: string, trend?: 'up' | 'down' | 'stable' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {trend === 'up' && <span className="text-emerald-500 text-[10px]">↑</span>}
        {trend === 'down' && <span className="text-red-500 text-[10px]">↓</span>}
        <span className="text-xs font-bold text-slate-300 font-mono">{value}</span>
      </div>
    </div>
  );
}

function StateBadge({ active, label, color }: { active: boolean, label: string, color: 'indigo' | 'amber' | 'purple' }) {
  const colors = {
    indigo: active ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-600 border-transparent',
    amber: active ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'text-slate-600 border-transparent',
    purple: active ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'text-slate-600 border-transparent',
  };

  return (
    <div className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all duration-300 uppercase tracking-widest ${colors[color]}`}>
      {label}
    </div>
  );
}

function DeniedScreen() {
  return (
    <div className="h-screen w-full bg-[#020617] flex items-center justify-center p-10">
      <div className="max-w-md w-full glass-morphism rounded-[40px] p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 rotate-3">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-[0.2em] font-['Space_Grotesk']">Permission Denied</h1>
        <p className="text-slate-400 mb-10 text-sm leading-relaxed font-medium">
          FluentFlow requires microphone access to hear your speech. Please enable it in your browser settings to continue.
        </p>
        <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs">
          Refresh & Retry
        </button>
      </div>
    </div>
  );
}

function PendingScreen({ onAllow }: { onAllow: () => void }) {
  return (
    <div className="h-screen w-full bg-[#020617] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[160px] rounded-full animate-pulse" />
      <div className="relative z-10 text-center max-w-lg px-10">
        <div className="w-32 h-32 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-12 border border-indigo-500/20 rotate-12 hover:rotate-0 transition-all duration-700 shadow-2xl group cursor-pointer">
          <svg className="w-16 h-16 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </div>
        <h2 className="text-4xl font-black mb-6 text-white uppercase tracking-[0.3em] font-['Space_Grotesk'] leading-tight">
          Ready to <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Level Up?</span>
        </h2>
        <p className="text-slate-500 mb-14 text-sm font-medium tracking-wide leading-relaxed">
          Step into a high-performance environment designed for English mastery. Connect your microphone to start.
        </p>
        <button 
          onClick={onAllow} 
          className="px-14 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[2rem] shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 uppercase tracking-[0.2em] text-xs"
        >
          Initialize Audio
        </button>
      </div>
    </div>
  );
}
