import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import departmentRoutes from './routes/department.routes';
import notificationRoutes from './routes/notification.routes';
import { initSocket } from './socket';
import { initReminderScheduler } from './services/reminder.service';
import { initAdminBootstrap } from './services/bootstrap.service';
import { authenticate } from './middleware/auth';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const APP_URL = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:3000';

// Global Middleware
const allowedOrigins = [
  CLIENT_URL.replace(/\/$/, ''),
  APP_URL.replace(/\/$/, ''),
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      const isAllowed =
        allowedOrigins.includes(normalized) ||
        normalized.endsWith('.vercel.app') ||
        normalized === CLIENT_URL.replace(/\/$/, '') ||
        normalized === APP_URL.replace(/\/$/, '');
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file uploads directory (protected by authenticate middleware)
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', authenticate, express.static(uploadDir));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Knowvia Knowledge Repo & Real-time Platform', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize WebSocket
initSocket(server);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  // Initialize automated class reminder cron job
  initReminderScheduler();

  server.listen(PORT, async () => {
    console.log(`===========================================`);
    console.log(`🚀 Knowvia Platform API Server running on port ${PORT}`);
    console.log(`📡 WebSocket Real-time active`);
    console.log(`⏰ Class reminder scheduler initialized`);
    console.log(`🌐 Client Origin: ${CLIENT_URL}`);
    console.log(`===========================================`);
    await initAdminBootstrap();
  });
}

export { app, server };
