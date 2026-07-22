'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, MonitorUp, PhoneOff, ScreenShare, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
  return initials || '?';
}

export default function VideoCall({ socket, roomId }) {
  const router = useRouter();
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteVideoRefs = useRef({});
  const negotiationInProgressRef = useRef(new Set());

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');
  const [activePeerId, setActivePeerId] = useState('');
  const [roomUsers, setRoomUsers] = useState([]);

  const closeAllConnections = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
    negotiationInProgressRef.current.clear();
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
          setRemoteStreams((prev) => {
            if (prev[peerId]?.id === stream.id) return prev;
            return { ...prev, [peerId]: stream };
          });
          setActivePeerId(peerId);
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('peer:ice-candidate', { to: peerId, candidate: event.candidate });
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        if (
          peerConnection.iceConnectionState === 'failed' ||
          peerConnection.iceConnectionState === 'disconnected' ||
          peerConnection.iceConnectionState === 'closed'
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
        if (!socket || !roomId || negotiationInProgressRef.current.has(peerId)) return;
        negotiationInProgressRef.current.add(peerId);

        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('peer:offer', { to: peerId, offer });
        } catch (err) {
          console.error('Negotiation failed:', err);
        } finally {
          negotiationInProgressRef.current.delete(peerId);
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
        if (peerConnection.signalingState === 'stable') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('peer:answer', { to: from, answer });
        }
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

    const handleRoomUsersUpdate = ({ users = [] }) => {
      setRoomUsers(users);
    };

    socket.on('room-users-update', handleRoomUsersUpdate);
    socket.on('peer-joined', handlePeerJoined);
    socket.on('peer-ready-list', handlePeerReadyList);
    socket.on('peer:offer', handleOffer);
    socket.on('peer:answer', handleAnswer);
    socket.on('peer:ice-candidate', handleCandidate);

    return () => {
      socket.off('room-users-update', handleRoomUsersUpdate);
      socket.off('peer-joined', handlePeerJoined);
      socket.off('peer-ready-list', handlePeerReadyList);
      socket.off('peer:offer', handleOffer);
      socket.off('peer:answer', handleAnswer);
      socket.off('peer:ice-candidate', handleCandidate);
    };
  }, [createPeerConnection, roomId, socket]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      const videoElement = remoteVideoRefs.current[peerId];
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const toggleMic = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const videoTrack = displayStream.getVideoTracks()[0];
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (currentVideoTrack) {
        localStreamRef.current.removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }

      localStreamRef.current.addTrack(videoTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      Object.values(peerConnectionsRef.current).forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find((candidate) => candidate.track?.kind === 'video');
        if (sender) {
          peerConnection.replaceTrack(sender, videoTrack, localStreamRef.current);
        }
      });

      setIsScreenSharing(true);
    } catch (err) {
      console.error('Unable to share screen:', err);
      setError('Screen sharing was cancelled.');
    }
  }, []);

  const leaveCall = useCallback(() => {
    closeAllConnections();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    socket?.disconnect();
    router.push('/');
  }, [closeAllConnections, router, socket]);

  const remotePeerEntries = Object.entries(remoteStreams);
  const activeRemoteStream = remotePeerEntries[0]?.[1];
  const activeRemotePeerId = remotePeerEntries[0]?.[0] || '';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/70 p-3 shadow-2xl shadow-black/20">
      {error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
        {activeRemoteStream ? (
          <video
            ref={(videoElement) => {
              if (videoElement) {
                remoteVideoRefs.current[activeRemotePeerId] = videoElement;
                if (videoElement.srcObject !== activeRemoteStream) {
                  videoElement.srcObject = activeRemoteStream;
                }
              }
            }}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] text-2xl font-semibold text-slate-200">
                {getInitials(roomId || 'Room')}
              </div>
              <p className="text-sm text-slate-400">Waiting for another participant to join.</p>
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/50 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          {roomUsers.length ? `${roomUsers.length} participant${roomUsers.length > 1 ? 's' : ''}` : '1 participant'}
        </div>

        <div className="absolute bottom-3 right-3 h-32 w-24 overflow-hidden rounded-2xl border border-white/[0.1] bg-black shadow-xl shadow-black/50">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {!isReady && !error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-slate-400">
              Starting camera…
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 py-2">
        <button
          onClick={toggleMic}
          className={`rounded-full p-2.5 transition ${isMicMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'}`}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-full p-2.5 transition ${isCameraOff ? 'bg-rose-500/20 text-rose-300' : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'}`}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`rounded-full p-2.5 transition ${isScreenSharing ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'}`}
          title="Share screen"
        >
          <MonitorUp className="h-4 w-4" />
        </button>
        <button
          onClick={leaveCall}
          className="rounded-full bg-rose-500/20 p-2.5 text-rose-300 transition hover:bg-rose-500/30"
          title="Leave call"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
