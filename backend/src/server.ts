import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prisma';
import { requireAuth } from './middleware/auth';

// ── Route imports ────────────────────────────────────────────────────────────
import authRouter            from './routes/auth';
import customersRouter       from './routes/customers';
import suppliersRouter       from './routes/suppliers';
import locationsRouter       from './routes/locations';
import workCentersRouter     from './routes/workCenters';
import materialsRouter       from './routes/materials';
import productCategoriesRouter from './routes/productCategories';

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Public routes ────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch { /* DB not ready yet */ }
  res.json({
    status:      'ok',
    db:          dbStatus,
    environment: process.env.NODE_ENV ?? 'unknown',
    timestamp:   new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);

// ── Protected routes (JWT required for everything below) ─────────────────────
app.use('/api/protected', requireAuth);

// Master data
app.use('/api/protected/customers',        customersRouter);
app.use('/api/protected/suppliers',        suppliersRouter);
app.use('/api/protected/locations',        locationsRouter);
app.use('/api/protected/work-centers',     workCentersRouter);
app.use('/api/protected/materials',        materialsRouter);
app.use('/api/protected/product-categories', productCategoriesRouter);

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BoxERP backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
