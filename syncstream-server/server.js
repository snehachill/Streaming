const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('⚡ SyncStream Socket Server is Up and Running!');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const broadcastRoomUsers = (roomId) => {
  if (!roomId) return;

  const room = io.sockets.adapter.rooms.get(roomId);
  const users = room ? Array.from(room) : [];
  const payload = {
    count: users.length,
    users,
  };

  io.to(roomId).emit('room-users-update', payload);
};

io.on('connection', (socket) => {
  console.log(`⚡ New client connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    if (!roomId) return;

    socket.join(roomId);
    broadcastRoomUsers(roomId);
    console.log(`👤 User ${socket.id} joined room: ${roomId}`);
  });

  socket.on('send-play', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('receive-play');
  });

  socket.on('send-pause', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('receive-pause');
  });

  socket.on('send-seek', ({ roomId, timestamp }) => {
    if (!roomId) return;
    socket.to(roomId).emit('receive-seek', { timestamp });
  });

  socket.on('send-message', ({ roomId, message }) => {
    if (!roomId) return;
    socket.to(roomId).emit('receive-message', message);
  });

  socket.on('send-change-video', ({ roomId, videoId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('receive-change-video', { videoId });
  });

  socket.on('peer:offer', ({ to, offer }) => {
    socket.to(to).emit('peer:offer', { from: socket.id, offer });
  });

  socket.on('peer:answer', ({ to, answer }) => {
    socket.to(to).emit('peer:answer', { from: socket.id, answer });
  });

  socket.on('peer:ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('peer:ice-candidate', { from: socket.id, candidate });
  });

  socket.on('video-call-ready', ({ roomId }) => {
    if (!roomId) return;
    const peers = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter((id) => id !== socket.id);
    socket.emit('peer-ready-list', { peers: peers.map((peerId) => ({ peerId })) });
    socket.to(roomId).emit('peer-joined', { peerId: socket.id });
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        broadcastRoomUsers(roomId);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Socket Server running on http://localhost:${PORT}`);
});