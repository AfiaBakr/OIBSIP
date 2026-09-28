import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyJwt } from '../utils/tokens.js';

let io;

// Each user joins a private room keyed by their id; admins share one room.
// Order and inventory changes are pushed to those rooms so dashboards update without refreshing.
export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientUrl } });

  io.use((socket, next) => {
    try {
      const payload = verifyJwt(socket.handshake.auth?.token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.data.role === 'admin' ? 'admins' : `user:${socket.data.userId}`);
  });

  return io;
}

export function emitOrderUpdate(order, { isNew = false } = {}) {
  if (!io) return;
  const userId = String(order.user?._id ?? order.user);
  io.to(`user:${userId}`).emit('order:updated', order);
  io.to('admins').emit(isNew ? 'order:new' : 'order:updated', order);
}

export function emitInventoryUpdate(items) {
  if (!io) return;
  io.to('admins').emit('inventory:updated', items);
}
