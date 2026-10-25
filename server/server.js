
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import 'dotenv/config';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import notificationRoutes from './routes/notification.js';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import reportRoutes from './routes/report.js';
import teamRoutes from './routes/team.js';
import Report from './models/Report.js';
import User from './models/User.js';
import TeamMessage from './models/TeamMessage.js';
import { notFound, errorHandler } from './middleware/error.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must contain at least 32 characters.');
  process.exit(1);
}

const app = express();

app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
  },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Locallens backend is running',
  });
});

app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  // Join user-specific notification room
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on('leave', (userId) => {
    if (userId) {
      socket.leave(`user:${userId}`);
    }
  });

  // Securely join a private team workspace room
  socket.on('join_team', async ({ reportId, token }) => {
    try {
      if (!reportId || !token) {
        socket.emit('team_error', { message: 'Authentication required to join team room.' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id || decoded.userId).select('role name');
      if (!user) {
        socket.emit('team_error', { message: 'Invalid session.' });
        return;
      }

      const report = await Report.findById(reportId).select('teamMembers teamCoordinator');
      if (!report) {
        socket.emit('team_error', { message: 'Report not found.' });
        return;
      }

      const isCoordinator =
        user.role === 'admin' ||
        (report.teamCoordinator && report.teamCoordinator.toString() === user._id.toString());
      const isMember = (report.teamMembers || []).some(
        (m) => m.user?.toString() === user._id.toString()
      );

      if (!isCoordinator && !isMember) {
        socket.emit('team_unauthorized', {
          reportId,
          message: 'Access Denied: Only confirmed team members may enter this room.',
        });
        return;
      }

      socket.join(`team:${reportId}`);
      socket.emit('team_joined', { reportId });
    } catch (err) {
      socket.emit('team_error', { message: err.message || 'Unable to join team room.' });
    }
  });

  socket.on('leave_team', ({ reportId }) => {
    if (reportId) {
      socket.leave(`team:${reportId}`);
    }
  });

  // Securely send team message via socket
  socket.on('send_team_message', async ({ reportId, token, content, attachments = [] }) => {
    try {
      if (!reportId || !token || !content || !content.trim()) return;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id || decoded.userId).select('role name profileImage');
      if (!user) return;

      const report = await Report.findById(reportId).select('teamMembers teamCoordinator');
      if (!report) return;

      const isCoordinator =
        user.role === 'admin' ||
        (report.teamCoordinator && report.teamCoordinator.toString() === user._id.toString());
      const isMember = (report.teamMembers || []).some(
        (m) => m.user?.toString() === user._id.toString()
      );

      if (!isCoordinator && !isMember) return;

      const msg = await TeamMessage.create({
        report: report._id,
        sender: user._id,
        senderName: user.name,
        senderRole: isCoordinator ? 'coordinator' : 'member',
        senderAvatar: user.profileImage || '',
        content: content.trim(),
        attachments: Array.isArray(attachments) ? attachments : [],
      });

      io.to(`team:${report._id}`).emit('new_team_message', msg);
    } catch (err) {
      console.error('Socket team message error:', err.message);
    }
  });
});

const PORT = process.env.PORT || 5001;

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server encountered an error:', err.message || err);
  }

  process.exit(1);
});

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
