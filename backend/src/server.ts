import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────

// Health check — the frontend landing page calls this to verify everything works.
// Returns API status + DB connectivity.
app.get('/api/health', async (_req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    db: dbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BoxERP backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
