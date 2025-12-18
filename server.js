const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  socket.on('create-room', (callback) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    rooms.set(roomCode, {
      leader: socket.id,
      friend: null,
      url: null,
      currentTime: 0,
      isPlaying: false
    });

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.role = 'leader';

    callback({ success: true, roomCode });
  });

  socket.on('join-room', (roomCode, callback) => {
    const room = rooms.get(roomCode);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    room.friend = socket.id;
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.role = 'friend';

    callback({
      success: true,
      url: room.url,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying
    });

    io.to(room.leader).emit('friend-joined');
    io.to(room.leader).emit('request-sync');
  });

  socket.on('sync-state', (data) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    room.url = data.url;
    room.currentTime = data.currentTime;
    room.isPlaying = data.isPlaying;

    socket.to(socket.roomCode).emit('sync-state', {
      ...data,
      from: socket.role
    });
  });

  socket.on('request-sync', () => {
    const room = rooms.get(socket.roomCode);
    if (room && room.leader) {
      io.to(room.leader).emit('request-sync');
    }
  });

  socket.on('video-play', (currentTime) => {
    socket.to(socket.roomCode).emit('video-play', { currentTime });
  });

  socket.on('video-pause', (currentTime) => {
    socket.to(socket.roomCode).emit('video-pause', { currentTime });
  });

  socket.on('video-seek', (currentTime) => {
    socket.to(socket.roomCode).emit('video-seek', { currentTime });
  });

  socket.on('url-change', (url) => {
    const room = rooms.get(socket.roomCode);
    if (room) room.url = url;
    socket.to(socket.roomCode).emit('url-change', { url });
  });

  socket.on('chat-message', (message) => {
    if (!socket.roomCode) return;
    io.to(socket.roomCode).emit('chat-message', {
      sender: socket.role,
      message,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    if (socket.role === 'leader') {
      io.to(socket.roomCode).emit('room-closed');
      rooms.delete(socket.roomCode);
    } else if (socket.role === 'friend') {
      room.friend = null;
      io.to(room.leader).emit('friend-left');
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`connect.us server running on port ${PORT}`);
});
