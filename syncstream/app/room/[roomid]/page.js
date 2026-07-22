'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import {
  Copy,
  Check,
  Wifi,
  WifiOff,
  Loader2,
  Video,
  MessageSquare,
  Users,
  PhoneCall,
} from 'lucide-react';

import VideoStage from '../../component/videostage';
import ChatSidebar from '../../component/chatsidebar';
import VideoCall from '../../component/VideoCall';

// Use the deployed Render Socket.IO backend directly so the client never
// falls back to a malformed or localhost-only URL at runtime.
const SOCKET_SERVER_URL = 'https://streaming-5vi3.onrender.com';

// Deterministic accent color per user, picked from a small dense-UI palette.
const AVATAR_COLORS = ['#F97066', '#F0B429', '#3FB950', '#3B9EFF', '#C084FC', '#F472B6'];

function generateGuestName() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `User #${num}`;
}

function colorForName(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Pulls a display initial out of "User #4021" without assuming that exact
// shape holds forever — falls back gracefully for any other string.
function initialForName(name) {
  if (!name) return '?';
  const digits = name.match(/\d/);
  return (digits ? digits[0] : name.trim()[0] || '?').toUpperCase();
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId
    ? String(params.roomId)
    : params?.roomid
    ? String(params.roomid)
    : '';

  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  // 'connecting' | 'connected' | 'disconnected' — distinct from a plain
  // boolean so the very first render (before any socket event has fired)
  // reads as "connecting", not a false "disconnected".
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [userCount, setUserCount] = useState(1);

  const isConnected = connectionStatus === 'connected';

  useEffect(() => {
    setUsername(generateGuestName());
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const socketInstance = io(SOCKET_SERVER_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: false,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    const handleConnect = () => {
      setConnectionStatus('connected');
      socketInstance.emit('join-room', roomId);
    };

    const handleDisconnect = () => setConnectionStatus('disconnected');

    const handleConnectError = (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('disconnected');
    };

    const handleReconnectAttempt = () => setConnectionStatus('connecting');

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.io.off('reconnect_attempt', handleReconnectAttempt);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUsersUpdate = ({ count, users } = {}) => {
      const nextCount = typeof count === 'number' ? count : users?.length ?? 1;
      setUserCount(nextCount);
    };

    socket.on('room-users-update', handleRoomUsersUpdate);

    return () => socket.off('room-users-update', handleRoomUsersUpdate);
  }, [socket]);

  const handleCopyCode = useCallback(async () => {
    if (!roomId) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomId);
      } else {
        // Fallback for non-secure contexts / older browsers without the
        // async Clipboard API.
        const textarea = document.createElement('textarea');
        textarea.value = roomId;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  }, [roomId]);

  const avatarColor = useMemo(() => colorForName(username), [username]);
  const avatarInitial = useMemo(() => initialForName(username), [username]);

  return (
    <main className="min-h-screen bg-[#0b0c0f] text-slate-100">
      {/* ---------------- Header ---------------- */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0b0c0f]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 overflow-x-auto px-4 sm:px-6">
          {/* Room code — truncates instead of wrapping */}
          <div
            className="flex min-w-0 shrink-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-200"
            title={roomId ? `Room #${roomId}` : undefined}
          >
            <Video className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            <span className="truncate font-mono text-xs sm:text-sm">
              #{roomId || '...'}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            disabled={!roomId}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Copy room code"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden text-emerald-400 sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy code</span>
              </>
            )}
          </button>
          {/* Visually-hidden live region so screen readers announce the copy */}
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? 'Room code copied to clipboard' : ''}
          </span>

          {/* Divider */}
          <div className="hidden h-5 w-px shrink-0 bg-white/[0.08] sm:block" />

          {/* Connection status */}
          <div
            className="hidden shrink-0 items-center gap-1.5 text-xs font-medium sm:flex"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-1.5 w-1.5">
              {connectionStatus !== 'disconnected' && (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              )}
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
            </span>
            {isConnected ? (
              <span className="flex items-center gap-1 text-slate-400">
                <Wifi className="h-3 w-3" />
                Connected
              </span>
            ) : connectionStatus === 'connecting' ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Connecting
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400">
                <WifiOff className="h-3 w-3" />
                Disconnected
              </span>
            )}
          </div>

          {/* Spacer pushes remaining items to the edge */}
          <div className="min-w-0 flex-1" />

          {/* Users online */}
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300"
            title={`${userCount} ${userCount === 1 ? 'person' : 'people'} online`}
          >
            <Users className="h-3.5 w-3.5 text-violet-400" />
            {userCount}
          </div>

          {/* Guest identity */}
          <div
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium"
            title={username || undefined}
          >
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-slate-950"
              style={{ backgroundColor: avatarColor }}
            >
              {avatarInitial}
            </span>
            <span className="max-w-[7rem] truncate text-slate-300 sm:max-w-none">
              {username || 'Connecting…'}
            </span>
          </div>
        </div>
      </header>

      {/* ---------------- Body ---------------- */}
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">
        {/* Row 1: video stage (left) + video call (right, full-height sidebar) */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Left: video stage — its rendered height sets the row height */}
          <div className="min-w-0">
            <VideoStage socket={socket} roomId={roomId} isConnected={isConnected} />
          </div>

          {/* Right: video call — stretches to match the video stage's height,
              but scrolls internally so member lists etc. never overflow it */}
          <div className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] lg:h-full">
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
              Video call
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <VideoCall socket={socket} roomId={roomId} />
            </div>
          </div>
        </div>

        {/* Row 2: room chat, full width */}
        <div className="mt-4 flex h-[380px] flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
            Room chat
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatSidebar socket={socket} roomId={roomId} username={username} />
          </div>
        </div>
      </div>
    </main>
  );
}