import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import { notFound, errorHandler } from './middleware/error.js';
import userRoutes from './routes/user.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in .env');
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Locallens backend is running' });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// TEMPORARY: start even if the database is not connected yet.
// connectDB().catch((err) => {
//   console.error('Database connection failed:', err.message);
// });

// httpServer.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// TEMPORARY: start the server even if the database is not connected yet.
// Once MongoDB works, switch back to the original version (see below).
//original
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
