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
