import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────

// Health check — verifies API and DB are reachable.
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

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BoxERP backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
