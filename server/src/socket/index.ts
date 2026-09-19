import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

let io: Server | null = null;

const JWT_SECRET = process.env.JWT_SECRET || 'knowvia_jwt_secret_dev_key_2026_secure';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export const initSocket = (httpServer: HttpServer): Server => {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const appUrl = (process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const allowedOrigins = [
    clientUrl,
    appUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        const isAllowed =
          allowedOrigins.includes(normalized) ||
          normalized.endsWith('.vercel.app') ||
          normalized === clientUrl ||
          normalized === appUrl;
        if (isAllowed) {
          return callback(null, true);
        }
        return callback(new Error(`WebSocket CORS not allowed for origin ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required for WebSocket connection'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      next();
    } catch (err) {
      next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    // Join personal notification channel
    socket.join(`user:${user.id}`);

    // Join rooms for all approved departments (for admin: all departments; for tutor/student: their single department)
    try {
      if (user.role === 'ADMIN') {
        const allDepts = await prisma.department.findMany({ select: { slug: true } });
        allDepts.forEach((d) => socket.join(`dept:${d.slug}`));
      } else {
        const memberships = await prisma.departmentMember.findMany({
          where: { userId: user.id, status: 'APPROVED' },
          include: { department: { select: { slug: true } } },
        });
        memberships.forEach((m) => socket.join(`dept:${m.department.slug}`));
      }
    } catch (e) {
      console.error('Error auto-joining socket rooms:', e);
    }

    // Handle department chat messages (text-only with reply threading)
    socket.on('message:send', async (data: { departmentSlug: string; content: string; replyToId?: string }) => {
      try {
        const { departmentSlug, content, replyToId } = data;
        if (!content || !content.trim() || !departmentSlug) return;

        const dept = await prisma.department.findUnique({
          where: { slug: departmentSlug },
          select: { id: true, slug: true },
        });

        if (!dept) return;

        // Verify membership if not admin
        if (user.role !== 'ADMIN') {
          const isMember = await prisma.departmentMember.findUnique({
            where: {
              userId_departmentId: {
                userId: user.id,
                departmentId: dept.id,
              },
            },
          });
          if (!isMember || isMember.status !== 'APPROVED') {
            socket.emit('error', { message: 'Cannot post message: not an approved department member' });
            return;
          }
        }

        const message = await prisma.message.create({
          data: {
            departmentId: dept.id,
            senderId: user.id,
            content: content.trim(),
            replyToId: replyToId || null,
          },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        });

        // Broadcast to department room
        io?.to(`dept:${dept.slug}`).emit('message:new', message);
      } catch (err) {
        console.error('Socket message send error:', err);
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data: { departmentSlug: string }) => {
      socket.to(`dept:${data.departmentSlug}`).emit('user:typing', {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        departmentSlug: data.departmentSlug,
      });
    });

    socket.on('typing:stop', (data: { departmentSlug: string }) => {
      socket.to(`dept:${data.departmentSlug}`).emit('user:stop_typing', {
        userId: user.id,
        departmentSlug: data.departmentSlug,
      });
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const getIO = (): Server | null => {
  return io;
};
