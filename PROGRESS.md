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

## Session 3 — Authentication + Master Data API
**Date:** 2026-03-01
**Status:** ✅ Complete
**Commits:** `2aa00d6`, `63c119b`

### What We Built

**Authentication (JWT)**
- `src/middleware/auth.ts` — `requireAuth` reads `Authorization: Bearer <token>`, verifies with `jsonwebtoken`, attaches decoded `{ userId, email, name, role }` to `req.user`; returns 401 if missing or invalid. `requireRole(role)` factory for ADMIN-only endpoints.
- `src/routes/auth.ts` — `POST /api/auth/login` verifies bcrypt hash, issues 8-hour JWT. `GET /api/auth/me` (protected) returns current user.
- `src/server.ts` — public routes mount at `/api/auth`; all protected routes mount at `/api/protected` with `requireAuth` applied once at the router level.

**Master Data API — 6 resources, 30+ endpoints**
- `routes/customers.ts` — CRUD + `GET/POST /customers/:id/contacts` sub-resource; contact primary-promotion with `updateMany`
- `routes/suppliers.ts` — CRUD
- `routes/locations.ts` — CRUD; `isDefault` enforcement (only one location can be default)
- `routes/workCenters.ts` — CRUD
- `routes/materials.ts` — CRUD + filter by type/supplierId; includes MaterialInventory totals
- `routes/productCategories.ts` — CRUD + `GET ?tree=true` builds nested category tree in-memory

**Frontend — Dark React UI**
- `src/api/client.ts` — fetch wrapper auto-attaches Bearer token; throws on non-2xx
- `src/contexts/AuthContext.tsx` — login/logout + localStorage persistence (`boxerp_token`, `boxerp_user`)
- `src/components/ProtectedRoute.tsx` — redirects to `/login` if not authenticated
- `src/pages/LoginPage.tsx` — dark ServiceNow-style form; error handling
- `src/pages/DashboardPage.tsx` — role badge, module roadmap cards, sign-out button

### Key Patterns Established
- Prisma PUT pattern: build `d: Record<string, unknown> = {}` imperatively, then `update({ data: d as any })` — avoids TS union errors with nullable FK fields
- Soft delete everywhere: `isActive: false` (never hard-delete master data)
- Route structure: `requireAuth` applied once in `server.ts` to the entire `/api/protected` router

---

## Session 4 — Products, Tooling & Inventory
**Date:** 2026-03-02
**Status:** ✅ Complete
**Commit:** `06867af`

### What We Built

#### Schema Expansion — 27 → 33 Tables

**Migration:** `20260302210323_session4_schema_expansion`

**6 New Tables**

| Table | Purpose |
|---|---|
| `MaterialVariant` | Roll widths / sheet sizes per material (e.g. a board grade stocked in 48", 52", 60" rolls) |
| `ProductVariant` | Size/bundle/price variants per product (e.g. same box style in 3 sizes) |
| `ProductSpec` | Arbitrary key-value specifications per product/variant (e.g. "UL Listed: Yes") |
| `ProductionConsumption` | Per-job record of raw material actually issued and used (vs. BOM estimate) |
| `FinishedGoodsInventory` | Finished product on hand by product + optional variant + location |
| `InventoryTransfer` | Moves material or finished goods between locations with full audit trail |

**4 New Enums**

| Enum | Values |
|---|---|
| `JobReadiness` | `READY`, `BLOCKED_MATERIAL`, `BLOCKED_TOOLING`, `BLOCKED_OTHER` |
| `ShipmentStage` | `DRAFT`, `PICKING`, `CONFIRMED`, `SHIPPED` |
| `VarianceReason` | `DAMAGED`, `SHORT_SHIP`, `OVERAGE`, `OTHER` |
| `TransferStatus` | `PENDING`, `COMPLETED`, `CANCELLED` |

**`TransactionType` enum extended** — added: `ISSUED_TO_JOB`, `RETURNED_FROM_JOB`, `CONVERTED_TO_FG`, `WASTE`

**Additive columns on existing tables**

| Table | Columns Added |
|---|---|
| `BlankSpec` | `outsPerSheet`, `sheetsPerBox`, `sheetLengthInches`, `sheetWidthInches`, `layoutNotes`, `rollWidthRequired`, `requiredDieId` (FK → Tooling), `requiredPlateIds`, `materialVariantId` (FK → MaterialVariant) |
| `ProductionJob` | `jobReadiness`, `sheetsConfirmed`, `toolingConfirmed`, `quantityGoodOutput`, `quantityWaste`, `rawMaterialConsumed`, `finishedGoodsProduced`, `consumptions` (relation) |
| `Customer` | `defaultOverTolerance`, `defaultUnderTolerance` |
| `SalesOrder` | `overTolerance`, `underTolerance` |
| `SalesOrderItem` | `variantId` (FK → ProductVariant), `toleranceOverride`, `qtyTolerance` |
| `Shipment` | `shipmentStage`, `systemSuggestedQty`, `warehouseEnteredQty`, `confirmedQty`, `confirmedById` (FK → User), `confirmedAt`, `varianceQty`, `varianceReason` |
| `ShipmentItem` | `variantId`, `systemSuggestedQty`, `warehouseEnteredQty`, `confirmedQty`, `varianceNotes` |
| `QuoteItem` | `variantId` (FK → ProductVariant) |
| `Tooling` | `blankSpecs` back-relation (via `@relation("BlankSpecDie")`) |

#### Backend — 3 New Route Files

**`routes/products.ts`** — full CRUD + 6 sub-resource endpoint groups:
- `GET/POST /:id/variants`, `PUT/DELETE /:id/variants/:vid`
- `GET/POST /:id/specs`, `PUT/DELETE /:id/specs/:sid`
- `GET/POST /:id/bom`, `PUT/DELETE /:id/bom/:bid`
- `GET/PUT/POST/DELETE /:id/box-spec` — 1:1 BoxSpec record
- `GET/PUT/POST/DELETE /:id/blank-spec` — 1:1 BlankSpec with `validateBlankSpecBody()` / `buildBlankSpecData()` helpers that coerce ~30 nullable fields without repetition
- `GET /:id/inventory` — returns FinishedGoodsInventory rows + totalQty

**`routes/tooling.ts`** — CRUD for dies/plates:
- Filters: search (tool # or description), type, condition, customerId, locationId
- `GET /:id` includes back-relation showing which products use this die (`blankSpecs` → `product`)

**`routes/inventory.ts`** — three logical sections:
- `GET /materials` — MaterialInventory aggregated by material with expandable per-location breakdown
- `GET /finished-goods` — FinishedGoodsInventory with product/variant/location includes
- `GET/POST /transfers` + `PUT /transfers/:id` — InventoryTransfer CRUD; completing a transfer calls `applyTransfer()` which adjusts inventory and recalculates weighted-average cost: `newCost = ((existingQty × existingCost) + (qty × fromCost)) / newQty`

#### Frontend — 8 New Files

**Shared infrastructure**
- `src/theme.ts` — design token exports: `c` (color map), `inputStyle`, `labelStyle`, `btnPrimary`, `btnSecondary`, `btnDanger`, `cardStyle`, `STATUS_COLORS` (keyed by status string → `{ bg, text, border }`)
- `src/components/Layout.tsx` — shared nav bar (logo, nav links with active-state highlighting, role badge, sign-out); wraps children in `<main>` at 1280px max-width

**Product module**
- `ProductListPage.tsx` — filterable table (search, productType dropdown); colored type badges; pagination at 50/page
- `ProductRecordPage.tsx` (~600 lines) — handles both `id='new'` creation and full record editing:
  - 3-step status pipeline (Created → Specified → Active) with filled circle indicators
  - Dynamic tab set based on `productType`: CORRUGATED_BOX adds Box Spec + Blank Spec tabs; non-LABOR_SERVICE adds Variants tab; PACKAGING_SUPPLY/OTHER adds Specs tab; all products show BOM + Inventory
  - **Box Spec tab** — dimensions display (L × W × H metric cards); edit form with style, flute, wall, die-cut/perf checkboxes
  - **Blank Spec tab** — 9-section form: Material, Multi-Out Layout, Tooling, Blank Dimensions, Board Specification, Scoring, Slots/Cuts/Joint, Print Specification, Pallet Configuration; procurement formula banner (sheets = CEIL(qty ÷ outsPerSheet) × sheetsPerBox)
  - **Variants tab** — table + inline add form (SKU, dimensions, bundle/case qty, price)
  - **BOM tab** — material line list + inline add form with material selector
  - **Inventory tab** — read-only finished goods inventory by location

**Tooling module**
- `ToolingListPage.tsx` — search + type + condition filters; condition colored badge; "Products Using" count column
- `ToolingRecordPage.tsx` — 4-step condition pipeline (NEW → GOOD → WORN → RETIRED) with filled circles; view/edit form; "Products Using This Tool" table linking to product records

**Inventory module**
- `InventoryPage.tsx` — 3 tabs:
  - **Raw Materials** — expandable rows (click to see per-location breakdown)
  - **Finished Goods** — click row to navigate to product record
  - **Transfers** — transfer list + new transfer form (material or finished good, from/to location, apply now or leave pending)

#### Files Modified
- `backend/src/server.ts` — registered 3 new routes under `/api/protected/`
- `frontend/src/App.tsx` — added 5 new protected routes (`/products`, `/products/:id`, `/tooling`, `/tooling/:id`, `/inventory`)
- `frontend/src/pages/DashboardPage.tsx` — converted to use shared `<Layout>`; module tiles for Products/Tooling/Inventory are now clickable

### Problems Solved This Session

| Problem | Root Cause | Fix |
|---|---|---|
| `Shipment.id` accidentally became `String/cuid()` | Copy-paste error while writing schema | Caught by `prisma validate` before migration; fixed back to `Int @default(autoincrement())` |
| `Customer.salesRep` became self-referential | Wrong relation target written | Fixed to `User?` with `@relation("CustomerSalesRep")`; removed spurious self-ref |
| `MaterialVariant` not in original spec | FK from BlankSpec/ProductionConsumption required it | Added as implied table (roll widths/sheet sizes for raw materials) |

### Verified Working
- `docker exec erp_backend npx tsc --noEmit` → 0 errors
- `docker exec erp_frontend npx tsc --noEmit` → 0 errors
- All 3 containers healthy (erp_postgres, erp_backend, erp_frontend)
- Migration applied; 33 tables in PostgreSQL; 26 enums

---

## Current Application State (after Session 4)

**What works end-to-end today:**
- Login / logout with JWT auth (Admin + CSR roles)
- Dashboard with clickable module tiles
- Products — full list, create, edit, tabs for box spec, blank spec, variants, BOM, inventory
- Tooling — full list, create, edit, condition pipeline, products-using back-reference
- Inventory — raw material view (from master data), finished goods view, transfer form
- Master data (Customers, Suppliers, Locations, Work Centers, Materials, Categories) — API complete, no standalone UI pages yet (accessible via backend API)

**What the database holds:**
- 33 tables, 26 enums, 2 applied migrations
- Seed data: 2 users, 2 locations, 6 work centers, 2 suppliers, 8 materials, 3 customers, 2 sample products

**What doesn't exist yet:**
- Quote builder
- Sales Order management
- Production job scheduling
- Shipment / delivery confirmation
- QuickBooks CSV export
- Master data UI pages (customers, suppliers, etc. need dedicated list/record pages)
- Input validation (no Zod/express-validator yet — API trusts callers)
- Global error handler in Express

---

## Session 5 — Quote Builder (Next Up)

### Goal
A CSR should be able to open a customer record, click "New Quote", add one or more line items (each referencing a Product + optional Variant, with quantity and unit price), attach a note, and save. The quote should display a formatted summary with line totals and a grand total.

### Scope

**Backend**
- `GET/POST /quotes` — list with customer/status filter; create with header fields
- `GET /quotes/:id` — full quote with all QuoteItems + QuoteItemBOMLines
- `PUT /quotes/:id` — update header (status, expiry, notes, discount)
- `DELETE /quotes/:id` — soft-delete (set status to CANCELLED)
- `GET/POST /quotes/:id/items` — add/list line items (productId, variantId?, qty, unitPrice, description override)
- `PUT/DELETE /quotes/:id/items/:iid` — edit or remove line item
- `POST /quotes/:id/items/:iid/bom` — attach BOM-level cost detail to a quote line
- `POST /quotes/:id/convert` — convert approved quote to SalesOrder (copies header + items, sets quote status to WON)

**Frontend**
- `QuoteListPage` — filterable by customer, status, date range; total amount column
- `QuoteRecordPage` — header card (customer, contact, expiry, notes, discount, status); line item table with inline add/edit; line totals + grand total; "Convert to Order" button (ADMIN only)
- Customer selector (type-ahead or dropdown) on new quote form

**Key decisions to make at Session 5 start:**
- Does "Convert to Order" happen immediately or require a confirmation step?
- Should quote line items be able to override the product description (for custom one-off pricing)?
- Should BOM cost lines on a quote be required or optional?

### Start Session 5
```bash
docker compose up -d
```
Then say: **"Start Session 5 — quote builder."**

---

## Sessions 6–10 Preview

| Session | Topic |
|---|---|
| 5 | Quote builder — multi-item, customer selector, line totals, convert to order |
| 6 | Sales Orders — order list, order record, line items, status flow |
| 7 | Production jobs — create from order, assign work center, readiness flags |
| 8 | Material issuance — issue to job, track consumption vs. BOM, waste recording |
| 9 | Shipment confirmation — warehouse entry, variance capture, stage pipeline |
| 10 | QuickBooks CSV export + invoice generation |

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
