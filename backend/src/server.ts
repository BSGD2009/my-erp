import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prisma';
import authRouter from './routes/auth';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Public routes ────────────────────────────────────────────────────────────
// Health check — useful for ops / Docker healthcheck; no auth required.
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    // DB not ready yet
  }
  res.json({
    status: 'ok',
    db: dbStatus,
    environment: process.env.NODE_ENV ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// Login is public — no auth middleware here
app.use('/api/auth', authRouter);

// ── Protected routes ─────────────────────────────────────────────────────────
// Everything mounted under /api/protected requires a valid JWT.
// Future sessions (master data, orders, etc.) mount their routers here.
app.use('/api/protected', requireAuth);

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BoxERP backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
