import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prisma';
import { requireAuth } from './middleware/auth';

// ── Route imports ────────────────────────────────────────────────────────────
import authRouter              from './routes/auth';
import customersRouter         from './routes/customers';
import suppliersRouter         from './routes/suppliers';
import locationsRouter         from './routes/locations';
import materialsRouter         from './routes/materials';
import productCategoriesRouter from './routes/productCategories';
import masterSpecsRouter       from './routes/masterSpecs';
import customerItemsRouter     from './routes/customerItems';
import toolingRouter           from './routes/tooling';
import inventoryRouter         from './routes/inventory';
import paymentTermsRouter      from './routes/paymentTerms';
import materialTypesRouter     from './routes/materialTypes';
import resourceTypesRouter     from './routes/resourceTypes';
import resourcesRouter         from './routes/resources';
import operationsRouter        from './routes/operations';
import productModulesRouter    from './routes/productModules';
import boardGradesRouter       from './routes/boardGrades';
import partiesRouter           from './routes/parties';
import blanketContractsRouter  from './routes/blanketContracts';
import boardPricesRouter       from './routes/boardPrices';
import boardUpchargesRouter    from './routes/boardUpcharges';
import quotesRouter            from './routes/quotes';

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
app.use('/api/protected/customers',          customersRouter);
app.use('/api/protected/suppliers',          suppliersRouter);
app.use('/api/protected/locations',          locationsRouter);
app.use('/api/protected/materials',          materialsRouter);
app.use('/api/protected/product-categories', productCategoriesRouter);
app.use('/api/protected/parties',            partiesRouter);

// Products & catalog
app.use('/api/protected/master-specs',       masterSpecsRouter);
app.use('/api/protected/customer-items',     customerItemsRouter);
app.use('/api/protected/tooling',            toolingRouter);
app.use('/api/protected/inventory',          inventoryRouter);

// Resources & operations
app.use('/api/protected/resources',          resourcesRouter);
app.use('/api/protected/operations',         operationsRouter);

// Sales
app.use('/api/protected/quotes',             quotesRouter);

// Admin lookups
app.use('/api/protected/payment-terms',      paymentTermsRouter);
app.use('/api/protected/material-types',     materialTypesRouter);
app.use('/api/protected/resource-types',     resourceTypesRouter);
app.use('/api/protected/product-modules',    productModulesRouter);
app.use('/api/protected/board-grades',       boardGradesRouter);
app.use('/api/protected/blanket-contracts', blanketContractsRouter);
app.use('/api/protected/board-prices',      boardPricesRouter);
app.use('/api/protected/board-upcharges',   boardUpchargesRouter);

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BoxERP backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
