# BoxERP — Session Progress Log

---

## Session 1 — Project Scaffold
**Date:** 2026-02-28
**Status:** ✅ Complete

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

### Issues / Incomplete Items

- **No database schema yet** — PostgreSQL is running but has no tables. All ERP data models come in Session 2.
- **No ORM** — currently using raw `pg` for the health check only. Prisma replaces this in Session 2.
- **No authentication** — any browser can reach the backend. Login/JWT comes in Session 3.
- **No frontend routing** — the app is a single static page. React Router added in Session 3.
- **No UI framework** — styles are raw inline CSS for now. We'll add Tailwind CSS in Session 3.
- **`.env` is not committed** — intentional (it contains secrets), but means a new developer must create it manually from `.env.example`.

---

### Architecture Decisions Locked In

| Decision | Choice | Reason |
|---|---|---|
| QB integration | CSV export | Works with Desktop and Online; no OAuth complexity |
| Box specs | Full (L/W/H, style, flute, wall, print, coatings, die cuts, multi-item) | Schema supports full spec from day one |
| BOM | Full (board, ink, adhesives, all conversion inputs) | Enables accurate job costing |
| Scheduling | Work center assignment + target date per job | Balances visibility with simplicity |
| Users at launch | 1–3; Admin + CSR roles | Minimal permission complexity for MVP |
| Locations | 2–3; multi-location inventory from day one | All inventory records carry `location_id` |
| Costing | Weighted average cost | Standard for manufacturers; simpler than FIFO |
| Pricing | Catalog items + fully custom quotes | `products` table + custom `box_specs` per quote item |

---

## Session 2 — Prisma Schema + Migrations
**Status:** 🔲 Not started

### Goal
Add Prisma ORM and define the complete database schema. One command (`prisma migrate dev`) will create all tables automatically.

### Exact Steps

**1. Install Prisma in the backend**
```bash
# In the VS Code terminal (project root)
docker compose exec backend npm install prisma @prisma/client
docker compose exec backend npx prisma init
```

**2. Replace `db.ts` with Prisma client**
- Delete the raw `pg` connection pool
- Add `prisma/schema.prisma` with all models
- Export a shared `PrismaClient` instance

**3. Define all models in `schema.prisma`**

Tables to create (in dependency order):
1. `Location` — plant, warehouse, satellite sites
2. `User` — employees with roles (ADMIN, CSR)
3. `Customer` — accounts with payment terms
4. `WorkCenter` — machines/equipment at a location
5. `Material` — raw material master (board, ink, adhesive, other)
6. `Product` — catalog items with list prices
7. `BoxSpec` — full box specification (attached to Product or QuoteItem)
8. `Quote` — quote header (customer, location, status, valid_until)
9. `QuoteItem` — line items on a quote (qty, unit_price, optional product ref)
10. `BomLine` — materials per quote item (material + qty per 1,000 boxes)
11. `SalesOrder` — converted from accepted quote
12. `SalesOrderItem` — from quote items
13. `ProductionJob` — one per sales order item
14. `JobWorkCenterAssignment` — machine + target date + actual start/end
15. `JobMaterialIssue` — actual materials consumed per job
16. `MaterialInventory` — material + location + qty + avg_cost
17. `FinishedGoodsInventory` — product + location + qty + avg_cost
18. `InventoryTransaction` — audit log of every inventory move
19. `PurchaseOrder` — procurement header
20. `PurchaseOrderItem` — material + qty + unit cost
21. `PoReceipt` — actual received quantities (triggers avg cost update)
22. `Shipment` — shipped against a sales order
23. `ShipmentItem` — qty shipped per order item
24. `QbExportLog` — tracks CSV invoice exports to QuickBooks

**4. Run the migration**
```bash
docker compose exec backend npx prisma migrate dev --name init
```
This creates all tables in PostgreSQL and generates the TypeScript client.

**5. Seed the database**
Create `prisma/seed.ts` with:
- 2 locations (Main Plant, Warehouse)
- 1 admin user (you)
- 3–5 sample customers
- 3–4 work centers (Corrugator, Flexo Press, Die Cutter, Stitcher)
- 5–10 materials (board grades, ink colors, adhesive)
- 3–5 catalog products (standard box sizes)

**6. Update the health check**
Replace the raw `pg` query in `server.ts` with a Prisma query so the health endpoint exercises the ORM.

**7. Verify**
- `docker compose exec backend npx prisma studio` opens a browser UI showing all tables
- http://localhost:5173 still shows Database: connected

---

## Sessions 3–10 Preview

| Session | Focus |
|---|---|
| 3 | Auth — login page, JWT middleware, protected routes, React Router |
| 4 | Master data CRUD — Locations, Customers, Work Centers |
| 5 | Product catalog — SKU list, box spec editor, list pricing |
| 6 | Quote builder — multi-item, full box spec form, BOM lines per item |
| 7 | Quote → Sales Order conversion |
| 8 | Production jobs — create from order, assign to work center, status flow |
| 9 | Inventory — multi-location stock, weighted avg cost, material issuance |
| 10 | Shipments + QB CSV export — invoice generation, export log |
