import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, ConnectionState } from 'livekit-client';
import { Eye, Loader2, Maximize, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import type { Match } from '../../types/cricket';

import { isVideoLive } from '../../utils/liveMatch';

const HIDE_KEY = 'azad_hide_live_video';

type Phase = 'connecting' | 'waiting' | 'playing' | 'error';

/**
 * In-app live video for a match (LiveKit). Starts muted (browsers block autoplay with sound);
 * one tap unmutes. Viewers can hide the video to save mobile data.
 */
export const LiveVideoPlayer: React.FC<{ match: Match }> = ({ match }) => {
  const live = isVideoLive(match);
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === '1');
  const [phase, setPhase] = useState<Phase>('connecting');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    localStorage.setItem(HIDE_KEY, hidden ? '1' : '0');
  }, [hidden]);

  useEffect(() => {
    if (!live || hidden) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    setPhase('connecting');
    setError('');

    const countViewers = () => setViewers(Math.max(0, (room.numParticipants || room.remoteParticipants.size + 1) - 1));

    const onSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setPhase('playing');
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
        audioRef.current.muted = true;
      }
    };
    const onUnsubscribed = (track: RemoteTrack) => {
      track.detach();
      if (track.kind === Track.Kind.Video) setPhase('waiting');
    };

    room
      .on(RoomEvent.TrackSubscribed, onSubscribed)
      .on(RoomEvent.TrackUnsubscribed, onUnsubscribed)
      .on(RoomEvent.ParticipantConnected, countViewers)
      .on(RoomEvent.ParticipantDisconnected, countViewers)
      .on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Reconnecting) setPhase('connecting');
      });

    (async () => {
      try {
        const res = await fetch('/api/live-video/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: match.id, role: 'viewer' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not join the live video');
        if (cancelled) return;
        await room.connect(data.url, data.token, { autoSubscribe: true });
        if (cancelled) return;
        countViewers();
        // Tracks that were already published before we joined
        let hasVideo = false;
        room.remoteParticipants.forEach((p) =>
          p.trackPublications.forEach((pub) => {
            if (pub.track && pub.isSubscribed) {
              onSubscribed(pub.track as RemoteTrack);
              if (pub.kind === Track.Kind.Video) hasVideo = true;
            }
          })
        );
        if (!hasVideo) setPhase('waiting');
      } catch (err: any) {
        if (!cancelled) {
          setPhase('error');
          setError(err?.message || 'Could not join the live video');
        }
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      room.disconnect();
      roomRef.current = null;
      setMuted(true);
    };
  }, [live, hidden, match.id, attempt]);

  if (!live) return null;

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="w-full card px-4 py-3 flex items-center gap-3 text-left"
      >
        <span className="w-9 h-9 rounded-xl bg-live-600/20 grid place-items-center shrink-0">
          <Video className="w-4 h-4 text-live-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">Live video is on</span>
          <span className="block text-[11px] text-slate-400">Hidden to save data · tap to watch</span>
        </span>
        <span className="live-dot" />
      </button>
    );
  }

  const toggleMute = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await roomRef.current?.startAudio();
    } catch {
      // ignore
    }
    audio.muted = !muted;
    if (!audio.muted) audio.play().catch(() => {});
    setMuted(!muted);
  };

  const goFullscreen = () => {
    const el = containerRef.current as any;
    const video = videoRef.current as any;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
    else video?.webkitEnterFullscreen?.(); // iOS Safari
  };

  return (
    <section ref={containerRef} className="relative -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain" playsInline autoPlay muted />
      <audio ref={audioRef} autoPlay />

      {phase !== 'playing' && (
        <div className="absolute inset-0 grid place-items-center text-center px-6 bg-gradient-to-b from-ink-900 to-black">
          {phase === 'error' ? (
            <div>
              <VideoOff className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 mt-2">Couldn’t connect to the live video</p>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{error}</p>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="mt-3 h-9 px-4 rounded-full bg-white text-ink-950 text-xs font-bold"
              >
                Try again
              </button>
            </div>
          ) : (
            <div>
              <Loader2 className="w-7 h-7 text-brand-300 mx-auto animate-spin" />
              <p className="text-sm text-slate-300 mt-2">
                {phase === 'connecting' ? 'Joining the live video…' : 'Waiting for the broadcaster…'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent">
        <span className="chip bg-live-600 text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
        </span>
        {phase === 'playing' && viewers > 0 && (
          <span className="chip bg-black/50 text-white">
            <Eye className="w-3 h-3" /> {viewers}
          </span>
        )}
        <button
          onClick={() => setHidden(true)}
          className="ml-auto h-8 px-2.5 rounded-full bg-black/50 text-[11px] font-semibold text-white"
        >
          Hide video
        </button>
      </div>

      {/* Bottom controls */}
      {phase === 'playing' && (
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent">
          <button
            onClick={toggleMute}
            className={`h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              muted ? 'bg-white text-ink-950' : 'bg-black/50 text-white'
            }`}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {muted ? 'Tap to unmute' : ''}
          </button>
          <button onClick={goFullscreen} className="ml-auto w-9 h-9 grid place-items-center rounded-full bg-black/50 text-white" aria-label="Full screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};
