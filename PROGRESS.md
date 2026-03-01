# BoxERP — Project Progress Log

---

## Session 1 — Project Scaffold
**Date:** 2026-02-28
**Status:** ✅ Complete
**Commit:** `bd8baca`

### What We Built

**Infrastructure**
- `docker-compose.yml` — three services (postgres, backend, frontend) wired together
- PostgreSQL 16 running in Docker with a named volume (`postgres_data`) so data persists across restarts
- `.env` / `.env.example` for secrets (DB credentials, JWT secret)
- `.gitignore` to keep secrets and build artifacts out of version control

**Backend** (`backend/`)
- Node.js 20 + Express + TypeScript
- `src/server.ts` — Express app with one route: `GET /api/health`
- `src/db.ts` — PostgreSQL connection pool (`pg` library); `testConnection()` verifies DB is reachable
- `nodemon.json` — auto-restarts backend on file save; `legacyWatch: true` for Docker-on-Windows polling
- `Dockerfile.dev` — builds the backend container

**Frontend** (`frontend/`)
- Vite 5 + React 18 + TypeScript
- `src/App.tsx` — status dashboard; fetches `/api/health` and displays API, DB, environment, and server time
- `vite.config.ts` — proxies `/api/*` requests to the backend container; `usePolling: true` for Docker-on-Windows
- `Dockerfile.dev` — builds the frontend container

**Verified working:**
- http://localhost:5173 loads the BoxERP status page
- API: ok ✅ | Database: connected ✅ | Environment: development ✅

---

## Session 2 — Prisma ORM + Database Schema
**Date:** 2026-03-01
**Status:** ✅ Complete
**Commit:** `aa14889`

### What We Built

**Prisma ORM**
- Installed Prisma 5.22.0 (deliberately NOT v7 — v7 removed `url` from datasource config, breaking change)
- `prisma/schema.prisma` — full 27-table ERP data model with 22 enums
- `prisma/migrations/20260301043836_init/migration.sql` — auto-generated; all tables created in PostgreSQL
- `src/prisma.ts` — PrismaClient singleton (prevents double-init during nodemon hot-reloads)
- Updated `src/db.ts` to re-export prisma client (backward compatibility stub)
- Updated `src/server.ts` health check to use `prisma.$queryRaw`
- Updated `Dockerfile.dev`: added `apk add --no-cache openssl` (required for Prisma on Alpine Linux)
- Updated `package.json`: Prisma 5.22.0, bcrypt, seed script config

**Database — 27 Tables**

| Group | Tables |
|---|---|
| Users & Access | User, Location |
| Contacts | Customer, CustomerContact |
| Operations | WorkCenter |
| Procurement | Supplier, PurchaseOrder, PurchaseOrderItem |
| Inventory | Material, MaterialInventory, MaterialReceipt, MaterialTransaction |
| Products | ProductCategory, Product, BoxSpec, BlankSpec, BOMLine, Tooling |
| Quoting | Quote, QuoteItem, QuoteItemBOMLine |
| Orders | SalesOrder, SalesOrderItem |
| Production | ProductionJob |
| Fulfillment | Shipment, ShipmentItem, Invoice |

**Key schema decisions**
- BoxSpec = customer-facing dimensions/style; BlankSpec = full manufacturing recipe (CORRUGATED_BOX products only)
- BlankSpec.materialId = procurement trigger (links finished box to board grade)
- SalesOrder → multiple Shipments → multiple Invoices (supports multi-delivery per order)
- Weighted average cost model on MaterialInventory (per material + location)
- Multi-location inventory built in from day one

**Seed data**
- 2 users: `admin@boxerp.local / admin123` (ADMIN), `csr@boxerp.local / csr123` (CSR)
- 2 locations, 6 work centers, 2 suppliers
- 8 materials (board grades, ink, adhesive)
- 3 customers + 4 contacts, 5 product categories
- 2 sample products (1 corrugated box with full BoxSpec + BlankSpec + BOM; 1 packaging supply)

### Problems Solved This Session

| Problem | Root Cause | Fix |
|---|---|---|
| Prisma failed to start | v7 removed `url` from datasource in schema.prisma | Downgraded to Prisma 5.22.0 |
| Downgrade didn't take effect | `package-lock.json` was pinning v7 | Deleted lock file; Docker regenerated it fresh |
| Old node_modules persisted across rebuilds | Docker anonymous volume survives `--build` | Ran `docker compose down -v` to wipe all volumes |
| Backend crashed: libssl.so.1.1 not found | Alpine 3.19+ ships OpenSSL 3.x; Prisma defaulted to 1.1 binary | Added `apk add openssl` to Dockerfile + `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` to schema |

### Verified Working
- Migration applied: all 27 tables in PostgreSQL
- Seed loaded: users, locations, work centers, suppliers, materials, customers, products
- Health check: `db: connected` ✅
- Committed and pushed to GitHub

---

## Outstanding / Incomplete Items

- **No authentication** — the app has no login. Anyone with the URL has full access.
- **No API routes beyond `/api/health`** — the 27 tables exist but nothing reads/writes them yet.
- **Frontend unchanged** — still just the Session 1 status dashboard. No ERP UI exists.
- **No input validation** — future routes will need Zod or express-validator.
- **bcrypt installed but auth not wired** — bcrypt hashes passwords in the seed; JWT middleware comes in Session 3.
- **No global error handler** — Express has no catch-all error middleware yet.

---

## Session 3 — Auth (Next Up)

### Goal
Users must log in before accessing anything. A JWT token is issued on login and required on all subsequent API calls. The frontend shows a login page first; after a successful login it redirects to the dashboard.

### Exact Steps

**Backend**

1. **Install packages**
   ```bash
   docker compose exec backend npm install jsonwebtoken
   docker compose exec backend npm install --save-dev @types/jsonwebtoken
   ```

2. **Add `JWT_SECRET` to `.env`**
   ```
   JWT_SECRET=change_this_to_a_long_random_string
   ```
   Also add the key (without value) to `.env.example`.

3. **Create `src/middleware/auth.ts`**
   - Reads `Authorization: Bearer <token>` header
   - Verifies the JWT with `jsonwebtoken.verify()`
   - Attaches the decoded user (`id`, `email`, `role`) to `req.user`
   - Returns `401` if token is missing or invalid

4. **Create `src/routes/auth.ts`** with two routes:
   - `POST /api/auth/login` — accepts `{ email, password }`, looks up user in DB via Prisma, verifies bcrypt hash, returns signed JWT
   - `GET /api/auth/me` — protected (uses auth middleware), returns current user from token

5. **Mount auth router in `src/server.ts`**
   ```typescript
   import authRouter from './routes/auth';
   app.use('/api/auth', authRouter);
   ```

**Frontend**

6. **Install React Router**
   ```bash
   docker compose exec frontend npm install react-router-dom
   docker compose exec frontend npm install --save-dev @types/react-router-dom
   ```

7. **Create `src/pages/LoginPage.tsx`**
   - Email + password form
   - Calls `POST /api/auth/login`
   - On success: stores JWT in `localStorage`, redirects to `/`
   - On failure: shows error message

8. **Create `src/components/ProtectedRoute.tsx`**
   - Checks `localStorage` for token
   - If no token → redirects to `/login`
   - If token present → renders children

9. **Update `src/App.tsx`** to use React Router:
   - `/login` → `LoginPage`
   - `/` → dashboard (wrapped in `ProtectedRoute`)
   - Add a Logout button that clears localStorage and redirects to `/login`

**Testing checklist**
- [ ] `POST /api/auth/login` with correct credentials returns a JWT
- [ ] `POST /api/auth/login` with wrong password returns 401
- [ ] `GET /api/auth/me` with valid token returns user object
- [ ] `GET /api/auth/me` with no token returns 401
- [ ] Frontend login form redirects to dashboard on success
- [ ] Refreshing the page while logged in keeps you logged in (token in localStorage)
- [ ] Logout clears token and sends you to login page

### Start Session 3
```bash
docker compose up -d
```
Then say: **"Start Session 3 — auth."**

---

## Sessions 4–10 Preview

| Session | Topic |
|---|---|
| 4 | Master data CRUD — Locations, Customers, Work Centers (UI + API) |
| 5 | Product catalog — SKU list, box spec editor, list pricing |
| 6 | Quote builder — multi-item, full spec form, BOM lines per item |
| 7 | Quote → Sales Order conversion |
| 8 | Production jobs — create from order, assign work center, status flow |
| 9 | Multi-location inventory — weighted avg cost, material issuance |
| 10 | Shipments + QuickBooks CSV export |

---

## Tech Reference

| Item | Value |
|---|---|
| Frontend URL | http://localhost:5173 |
| Backend URL | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |
| Database | PostgreSQL 16, port 5432, db name: `erp_db` |
| Prisma version | 5.22.0 — do NOT upgrade to v7 |
| Seed admin login | admin@boxerp.local / admin123 |
| Seed CSR login | csr@boxerp.local / csr123 |

**Common commands**
```bash
# Start all services
docker compose up -d

# Watch backend logs
docker compose logs -f backend

# Re-run seed (safe — uses upsert)
docker compose exec backend npx prisma db seed

# Open Prisma Studio (visual DB browser)
docker compose exec backend npx prisma studio

# Full reset — DESTROYS all data, rebuilds from scratch
docker compose down -v && docker compose up --build -d
# After reset, re-run: docker compose exec backend npx prisma db seed
```
