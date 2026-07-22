'use client';

import { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { Play, Pause, RotateCcw, Link2 } from 'lucide-react';

export default function VideoStage({ socket, roomId, isConnected }) {
  const playerRef = useRef(null);
  const isRemoteAction = useRef(false);

  const [videoId, setVideoId] = useState('dQw4w9WgXcQ'); // Default video
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [playerStatus, setPlayerStatus] = useState('UNSTARTED');

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: { autoplay: 0, controls: 1 },
  };

  // Helper: Extract YouTube Video ID from any URL format
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // 1. Socket Event Listeners for Video Sync
  useEffect(() => {
    if (!socket) return;

    const handleReceivePlay = () => {
      if (playerRef.current) {
        isRemoteAction.current = true;
        playerRef.current.playVideo();
      }
    };

    const handleReceivePause = () => {
      if (playerRef.current) {
        isRemoteAction.current = true;
        playerRef.current.pauseVideo();
      }
    };

    const handleReceiveSeek = ({ timestamp }) => {
      if (playerRef.current) {
        isRemoteAction.current = true;
        playerRef.current.seekTo(timestamp, true);
      }
    };

    const handleReceiveChangeVideo = ({ videoId: newVideoId }) => {
      setVideoId(newVideoId);
    };

    socket.on('receive-play', handleReceivePlay);
    socket.on('receive-pause', handleReceivePause);
    socket.on('receive-seek', handleReceiveSeek);
    socket.on('receive-change-video', handleReceiveChangeVideo);

    return () => {
      socket.off('receive-play', handleReceivePlay);
      socket.off('receive-pause', handleReceivePause);
      socket.off('receive-seek', handleReceiveSeek);
      socket.off('receive-change-video', handleReceiveChangeVideo);
    };
  }, [socket]);

  // 2. YouTube Event Handlers
  const handleReady = (event) => {
    playerRef.current = event.target;
  };

  const handleStateChange = (event) => {
    const stateCode = event.data;
    if (stateCode === 1) setPlayerStatus('PLAYING');
    if (stateCode === 2) setPlayerStatus('PAUSED');
    if (stateCode === 3) setPlayerStatus('BUFFERING');
    if (stateCode === 0) setPlayerStatus('ENDED');

    if (isRemoteAction.current) {
      isRemoteAction.current = false;
      return;
    }

    if (stateCode === 1) {
      socket?.emit('send-play', { roomId });
    } else if (stateCode === 2) {
      socket?.emit('send-pause', { roomId });
    }
  };

  // 3. User Controls
  const emitPlay = () => {
    playerRef.current?.playVideo();
    socket?.emit('send-play', { roomId });
  };

  const emitPause = () => {
    playerRef.current?.pauseVideo();
    socket?.emit('send-pause', { roomId });
  };

  const emitSeek = (seconds) => {
    playerRef.current?.seekTo(seconds, true);
    socket?.emit('send-seek', { roomId, timestamp: seconds });
  };

  const handleVideoChangeSubmit = (e) => {
    e.preventDefault();
    const newId = extractVideoId(videoUrlInput);
    if (newId) {
      setVideoId(newId);
      socket?.emit('send-change-video', { roomId, videoId: newId });
      setVideoUrlInput('');
    } else {
      alert('Invalid YouTube URL!');
    }
  };

  const statusStyles = {
    PLAYING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    BUFFERING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    ENDED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    UNSTARTED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Change-video bar */}
      <form
        onSubmit={handleVideoChangeSubmit}
        className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2"
      >
        <Link2 className="ml-1 hidden h-4 w-4 shrink-0 text-slate-500 sm:block" />
        <input
          type="text"
          value={videoUrlInput}
          onChange={(e) => setVideoUrlInput(e.target.value)}
          placeholder="Paste a YouTube link to change the video for everyone…"
          className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 active:scale-[0.97]"
        >
          Load
        </button>
      </form>

      {/* Player frame */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/[0.06] bg-black shadow-2xl">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="h-full w-full"
        />
      </div>

      {/* Controls — single row, never wraps */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={emitPlay}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 active:scale-[0.97]"
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Play</span>
          </button>
          <button
            onClick={emitPause}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-500 active:scale-[0.97]"
          >
            <Pause className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pause</span>
          </button>
          <button
            onClick={() => emitSeek(0)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>

        <span
          className={`shrink-0 truncate rounded-full border px-2.5 py-1 font-mono text-[10px] ${statusStyles[playerStatus]}`}
        >
          {playerStatus}
        </span>
      </div>
    </div>
  );
}