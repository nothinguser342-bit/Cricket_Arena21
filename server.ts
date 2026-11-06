import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { RoomManager } from './server/roomManager';
import { REAL_IPL_PLAYERS } from './src/data/players';
import { IPL_FRANCHISES } from './src/data/teams';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const roomManager = new RoomManager(io);

  app.use(express.json());

  // REST API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/api/players', (req, res) => {
    res.json(REAL_IPL_PLAYERS);
  });

  app.get('/api/teams', (req, res) => {
    res.json(IPL_FRANCHISES);
  });

  app.get('/api/rooms', (req, res) => {
    res.json(roomManager.listPublicRooms());
  });

  // Socket.IO Real-Time Handlers
  io.on('connection', (socket) => {
    // 1. Create Room
    socket.on('room:create', ({ name, managerName }: { name: string; managerName: string }) => {
      const room = roomManager.createRoom(
        name || 'IPL Premier Arena',
        socket.id,
        managerName || 'Manager'
      );
      socket.join(room.id);
      room.joinManager(socket.id, socket.id, managerName || 'Host Manager');
      socket.emit('room:joined', { roomId: room.id, state: room.getPublicState() });
      io.emit('rooms:updated', roomManager.listPublicRooms());
    });

    // 2. Join Room
    socket.on('room:join', ({ roomId, managerName }: { roomId: string; managerName: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit('room:error', { message: `Room ${roomId} not found!` });
        return;
      }
      socket.join(room.id);
      room.joinManager(socket.id, socket.id, managerName || 'Manager');
      socket.emit('room:joined', { roomId: room.id, state: room.getPublicState() });
      io.emit('rooms:updated', roomManager.listPublicRooms());
    });

    // 3. Select Franchise
    socket.on('room:selectFranchise', ({ roomId, franchiseId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      const res = room.selectFranchise(socket.id, franchiseId);
      if (!res.success) {
        socket.emit('room:toast', { type: 'error', message: res.message });
      }
    });

    // 4. Toggle Ready
    socket.on('room:ready', ({ roomId, isReady }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      room.setReady(socket.id, isReady);
    });

    // 5. Update Room Configuration
    socket.on('room:config', ({ roomId, config }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      if (socket.id === room.hostSocketId) {
        room.updateConfig(config);
      }
    });

    // 6. Auction Controls
    socket.on('auction:start', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      if (socket.id === room.hostSocketId) {
        room.startAuction();
      }
    });

    socket.on('auction:bid', ({ roomId, customAmount }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      const result = room.placeBid(socket.id, customAmount);
      if (!result.success) {
        socket.emit('room:toast', { type: 'error', message: result.message });
      }
    });

    socket.on('auction:pause', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room && socket.id === room.hostSocketId) {
        room.pauseAuction();
      }
    });

    socket.on('auction:resume', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room && socket.id === room.hostSocketId) {
        room.resumeAuction();
      }
    });

    socket.on('auction:fastForward', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room && socket.id === room.hostSocketId) {
        room.fastForwardAuction();
      }
    });

    // 7. Squad & Playing XI
    socket.on(
      'squad:updateXI',
      ({ roomId, franchiseId, playingXI, captainId, wicketkeeperId, impactPlayerId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        const res = room.updatePlayingXI(
          franchiseId,
          playingXI,
          captainId,
          wicketkeeperId,
          impactPlayerId
        );
        if (!res.success) {
          socket.emit('room:toast', { type: 'error', message: res.message });
        } else {
          socket.emit('room:toast', { type: 'success', message: res.message });
        }
      }
    );

    socket.on('tournament:proceed', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room && socket.id === room.hostSocketId) {
        room.proceedToTournament();
      }
    });

    // 8. Match Controls
    socket.on('match:start', ({ roomId, matchId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      const res = room.startMatch(matchId);
      if (!res.success) {
        socket.emit('room:toast', { type: 'error', message: res.message });
      }
    });

    socket.on('match:stepBall', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.stepMatchBall();
      }
    });

    socket.on('match:stepOver', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.stepMatchOver();
      }
    });

    socket.on('match:simInnings', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.simMatchInnings();
      }
    });

    socket.on('match:simMatch', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.simFullActiveMatch();
      }
    });

    socket.on('match:tactics', ({ roomId, franchiseId, aggression }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.setMatchTactics(franchiseId, aggression);
      }
    });

    socket.on('match:returnTournament', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.returnToTournament();
      }
    });

    // 9. Chat
    socket.on('chat:send', ({ roomId, text, sender }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.addChatMessage(sender, text);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      roomManager.handleDisconnect(socket.id);
      io.emit('rooms:updated', roomManager.listPublicRooms());
    });
  });

  // Vite middleware in dev or static files in prod
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🏏 Cricket Arena server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
