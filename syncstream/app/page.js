'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Star,
  Zap,
  MessageSquare,
  Link as LinkIcon,
  ArrowRight,
  Users,
  Play,
  Pause,
} from 'lucide-react';

// Generates a short, URL-safe room id like "x9a2b1"
function generateRoomId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = () => {
    setIsCreating(true);
    const roomId = generateRoomId();
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const trimmed = joinCode.trim();

    if (!trimmed) {
      setJoinError('Enter a room code to continue.');
      return;
    }

    setJoinError('');
    router.push(`/room/${trimmed.toLowerCase()}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 -left-40 h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="relative">
        {/* ---------------- Navbar ---------------- */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950/50">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-cyan-300 opacity-75" style={{ top: -3, right: -3 }} />
              <span className="absolute h-2.5 w-2.5 rounded-full bg-cyan-300" style={{ top: -3, right: -3 }} />
              <Play className="h-4.5 w-4.5 fill-white text-white" strokeWidth={0} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              SyncStream
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-300 shadow-[0_0_12px_-2px_rgba(99,102,241,0.6)] sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              v1.0 Live Sync
            </span>
          </div>
        </header>

        {/* ---------------- Hero ---------------- */}
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-10 text-center md:px-10 md:pt-20">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-400 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            No sign-up. No downloads. Just paste a link.
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Watch YouTube Together,{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              Perfectly In Sync.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Experience real-time video playback synchronization and instant
            live chat with your friends, no matter where they are.
          </p>

          {/* Signature element: two synced watch-nodes with a live progress line */}
          <div className="mx-auto mt-10 flex w-full max-w-md items-center justify-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-300 shadow-[0_0_20px_-4px_rgba(99,102,241,0.7)]">
                <Users className="h-4.5 w-4.5" />
              </div>
              <span className="text-[11px] text-slate-500">You</span>
            </div>

            <div className="relative h-px flex-1 bg-gradient-to-r from-indigo-500/60 via-cyan-400/80 to-violet-500/60">
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-cyan-300" />
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300" />
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium tracking-wide text-cyan-300/80">
                0.04s latency
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-300 shadow-[0_0_20px_-4px_rgba(139,92,246,0.7)]">
                <Users className="h-4.5 w-4.5" />
              </div>
              <span className="text-[11px] text-slate-500">Friend</span>
            </div>
          </div>

          {/* ---------------- Action Cards ---------------- */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
            {/* Create Room */}
            <div className="group relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left backdrop-blur-sm transition-all hover:border-indigo-400/30">
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(400px circle at 50% 0%, rgba(99,102,241,0.15), transparent 70%)',
                }}
              />
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Start a new room
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Spin up a private room with a fresh code and invite anyone
                  to join instantly.
                </p>
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition-transform active:scale-[0.98] disabled:opacity-70"
                >
                  {isCreating ? (
                    'Creating room…'
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Create New Room
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Join Room */}
            <div className="group relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left backdrop-blur-sm transition-all hover:border-cyan-400/30">
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(400px circle at 50% 0%, rgba(34,211,238,0.12), transparent 70%)',
                }}
              />
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-300">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Join an existing room
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Got a code from a friend? Drop it in and jump straight into
                  the party.
                </p>
                <form onSubmit={handleJoinRoom} className="mt-5">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => {
                        setJoinCode(e.target.value);
                        if (joinError) setJoinError('');
                      }}
                      placeholder="e.g. x9a2b1"
                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                    />
                    <button
                      type="submit"
                      className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98]"
                    >
                      Join Room
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  {joinError && (
                    <p className="mt-2 text-left text-xs font-medium text-rose-400">
                      {joinError}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Feature Highlights ---------------- */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto mb-12 max-w-lg text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Built for real-time, built for friends
            </h2>
            <p className="mt-3 text-sm text-slate-400 sm:text-base">
              Every room runs on a live connection, so the video, the chat,
              and the people in it never drift apart.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Zap}
              accent="from-amber-400/20 to-orange-500/20 text-amber-300"
              glow="rgba(251,191,36,0.12)"
              title="Sub-Second Sync"
              description="Playback state streams over WebSockets, so every play, pause, and seek lands for everyone in the room in well under a second."
            />
            <FeatureCard
              icon={MessageSquare}
              accent="from-indigo-400/20 to-violet-500/20 text-indigo-300"
              glow="rgba(99,102,241,0.12)"
              title="Live Chat & Reactions"
              description="A built-in sidebar keeps the conversation flowing, with live member presence so you always know who's watching."
            />
            <FeatureCard
              icon={LinkIcon}
              accent="from-cyan-400/20 to-teal-500/20 text-cyan-300"
              glow="rgba(34,211,238,0.12)"
              title="Dynamic Video Link Share"
              description="Anyone in the room can swap the YouTube link mid-session, and the new video loads in sync for the whole group."
            />
          </div>
        </section>

        {/* ---------------- Footer ---------------- */}
        <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-slate-600 md:px-10">
          Built for watching things together. SyncStream © {new Date().getFullYear()}.
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({ icon: Icon, accent, glow, title, description }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:-translate-y-0.5">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(300px circle at 20% 0%, ${glow}, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div
          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
