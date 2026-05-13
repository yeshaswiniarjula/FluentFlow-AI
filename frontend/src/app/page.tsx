'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import VoiceInterface from '../../components/VoiceInterface';

export default function HomePage() {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    // Fetch token from our FastAPI backend
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
    <div className="h-screen w-screen bg-slate-950 overflow-hidden">
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect={true}
        audio={true}
        video={false}
      >
        <VoiceInterface />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
