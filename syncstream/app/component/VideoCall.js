'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

function getGalleryLayout(n) {
  // 1 tile — fills the whole box.
  if (n <= 1) {
    return {
      container: 'grid grid-cols-1 grid-rows-1',
      tileClass: () => '',
    };
  }

  // 2 tiles — stacked on mobile, 50/50 side-by-side from `sm` up.
  if (n === 2) {
    return {
      container: 'grid grid-cols-1 sm:grid-cols-2 grid-rows-2 sm:grid-rows-1',
      tileClass: () => '',
    };
  }

  // 3 tiles — one featured tile spanning the top row, two below it.
  if (n === 3) {
    return {
      container: 'grid grid-cols-2 grid-rows-2',
      tileClass: (index) => (index === 0 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1'),
    };
  }

  // 4 tiles — classic 2x2.
  if (n === 4) {
    return {
      container: 'grid grid-cols-2 grid-rows-2',
      tileClass: () => '',
    };
  }

  // 5+ tiles — auto-filling grid, more columns on wider screens.
  return {
    container: 'grid grid-cols-2 md:grid-cols-3 auto-rows-fr',
    tileClass: () => '',
  };
}

export default function VideoCall({ socket, roomId }) {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');

  const closeAllConnections = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
  }, []);

  const createPeerConnection = useCallback(
    (peerId) => {
      if (!socket || !roomId || !localStreamRef.current) return null;
      if (peerConnectionsRef.current[peerId]) return peerConnectionsRef.current[peerId];

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('peer:ice-candidate', { to: peerId, candidate: event.candidate });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (
          peerConnection.connectionState === 'closed' ||
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'disconnected'
        ) {
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
          delete peerConnectionsRef.current[peerId];
        }
      };

      peerConnection.onnegotiationneeded = async () => {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('peer:offer', { to: peerId, offer });
        } catch (err) {
          console.error('Negotiation failed:', err);
        }
      };

      peerConnectionsRef.current[peerId] = peerConnection;
      return peerConnection;
    },
    [roomId, socket],
  );

  useEffect(() => {
    if (!socket || !roomId) return;

    let cancelled = false;

    const enableMedia = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Your browser does not support media access.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsReady(true);
        setError('');
        socket.emit('video-call-ready', { roomId });
      } catch (err) {
        if (!cancelled) {
          console.error('Could not access camera/mic:', err);
          setError('Camera and microphone access is required for the video call.');
        }
      }
    };

    enableMedia();

    return () => {
      cancelled = true;
      closeAllConnections();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [closeAllConnections, roomId, socket]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handlePeerJoined = ({ peerId }) => {
      if (!peerId || peerId === socket.id) return;
      createPeerConnection(peerId);
    };

    const handlePeerReadyList = ({ peers = [] }) => {
      peers.forEach((peer) => {
        if (peer && peer.peerId && peer.peerId !== socket.id) {
          createPeerConnection(peer.peerId);
        }
      });
    };

    const handleOffer = async ({ from, offer }) => {
      const peerConnection = createPeerConnection(from);
      if (!peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('peer:answer', { to: from, answer });
      } catch (err) {
        console.error('Failed to answer offer:', err);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      const peerConnection = peerConnectionsRef.current[from];
      if (!peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Failed to set answer:', err);
      }
    };

    const handleCandidate = async ({ from, candidate }) => {
      const peerConnection = peerConnectionsRef.current[from];
      if (!peerConnection || !candidate) return;
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    socket.on('peer-joined', handlePeerJoined);
    socket.on('peer-ready-list', handlePeerReadyList);
    socket.on('peer:offer', handleOffer);
    socket.on('peer:answer', handleAnswer);
    socket.on('peer:ice-candidate', handleCandidate);

    return () => {
      socket.off('peer-joined', handlePeerJoined);
      socket.off('peer-ready-list', handlePeerReadyList);
      socket.off('peer:offer', handleOffer);
      socket.off('peer:answer', handleAnswer);
      socket.off('peer:ice-candidate', handleCandidate);
    };
  }, [createPeerConnection, roomId, socket]);

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  const remotePeerEntries = Object.entries(remoteStreams);
  const tileCount = remotePeerEntries.length + 1; // +1 for local
  const { container, tileClass } = useMemo(() => getGalleryLayout(tileCount), [tileCount]);

  return (
    // Content-only: parent panel owns the border/header/height (`h-full
    // overflow-hidden`). The grid below fills that box exactly using the
    // WhatsApp/Zoom-style layout rules — no scrollbars, no dead space.
    <div className="flex h-full min-h-0 flex-col gap-2">
      {error ? (
        <div className="shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Gallery grid */}
      <div className={`min-h-0 flex-1 gap-2 ${container}`}>
        {/* Local tile — always index 0 */}
        <div className={`relative overflow-hidden rounded-lg border border-white/[0.06] bg-black ${tileClass(0)}`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {!isReady && !error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center text-xs text-slate-400">
              Requesting camera…
            </div>
          ) : null}

          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur-sm">
            You
            {isMicMuted && <MicOff className="h-2.5 w-2.5 text-rose-400" />}
          </span>
        </div>

        {/* Remote tiles — index offset by 1 for the local tile */}
        {remotePeerEntries.map(([peerId, stream], i) => (
          <div
            key={peerId}
            className={`relative overflow-hidden rounded-lg border border-white/[0.06] bg-black ${tileClass(i + 1)}`}
          >
            <video
              autoPlay
              playsInline
              className="h-full w-full object-cover"
              ref={(videoElement) => {
                if (videoElement) {
                  videoElement.srcObject = stream;
                }
              }}
            />
            <span className="absolute bottom-1.5 left-1.5 truncate rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur-sm">
              {peerId.slice(0, 8)}
            </span>
          </div>
        ))}
      </div>

      {/* Controls — slim bar, always visible, never part of the grid area */}
      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-white/[0.06] pt-2">
        <button
          onClick={toggleMic}
          className={`rounded-full p-2 transition ${
            isMicMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
          }`}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-full p-2 transition ${
            isCameraOff ? 'bg-rose-500/20 text-rose-300' : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
          }`}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
