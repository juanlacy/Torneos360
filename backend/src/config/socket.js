import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logSystem } from './logger.js';

let io;

export const initSocket = (httpServer, frontendUrls) => {
  io = new Server(httpServer, {
    cors: {
      origin: frontendUrls,
      credentials: true,
    },
  });

  // Autenticar conexiones Socket.io via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Token no proporcionado'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Token invalido'));
    }
  });

  io.on('connection', (socket) => {
    logSystem(`Socket conectado: ${socket.user.email} (${socket.id})`, 'debug');

    // Unirse a rooms por rol
    if (socket.user.club_id) {
      socket.join(`club:${socket.user.club_id}`);
    }

    socket.on('match:join', (matchId) => {
      socket.join(`match:${matchId}`);
      logSystem(`${socket.user.email} se unio al partido ${matchId}`, 'debug');
    });

    socket.on('match:leave', (matchId) => {
      socket.leave(`match:${matchId}`);
    });

    socket.on('jornada:join', (jornadaId) => {
      socket.join(`jornada:${jornadaId}`);
    });

    socket.on('jornada:leave', (jornadaId) => {
      socket.leave(`jornada:${jornadaId}`);
    });

    socket.on('disconnect', () => {
      logSystem(`Socket desconectado: ${socket.user.email}`, 'debug');
    });
  });

  logSystem('Socket.io inicializado', 'info');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io no inicializado');
  return io;
};
