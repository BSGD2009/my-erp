import { Router } from 'express';
import { MaterialType } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_TYPES = Object.values(MaterialType);

// ── GET /api/protected/materials ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, type, supplierId, page = '1', limit = '50' } =
    req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where = {
    isActive: active === 'false' ? false : true,
    ...(type && VALID_TYPES.includes(type as MaterialType) ? { type: type as MaterialType } : {}),
    ...(supplierId ? { supplierId: parseInt(supplierId) } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.material.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { supplier: { select: { id: true, name: true, code: true } } },
    }),
    prisma.material.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/materials/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      supplier:  { select: { id: true, name: true, code: true } },
      inventory: {
        include: { location: { select: { id: true, name: true } } },
        orderBy: { location: { name: 'asc' } },
      },
    },
  });
  if (!material) { res.status(404).json({ error: 'Material not found' }); return; }
  res.json(material);
});

// ── POST /api/protected/materials ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { code, name, type, unitOfMeasure, supplierId, reorderPoint, reorderQty, leadTimeDays } =
    req.body as Record<string, unknown>;

  if (!String(code  ?? '').trim()) { res.status(400).json({ error: 'code is required' });          return; }
  if (!String(name  ?? '').trim()) { res.status(400).json({ error: 'name is required' });          return; }
  if (!String(unitOfMeasure ?? '').trim()) { res.status(400).json({ error: 'unitOfMeasure is required' }); return; }
  if (!type || !VALID_TYPES.includes(type as MaterialType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }

  try {
    const material = await prisma.material.create({
      data: {
        code:          String(code).trim().toUpperCase(),
        name:          String(name).trim(),
        type:          type as MaterialType,
        unitOfMeasure: String(unitOfMeasure).trim(),
        supplierId:    supplierId != null ? Number(supplierId) : null,
        reorderPoint:  reorderPoint  != null ? (reorderPoint as string | number)  : null,
        reorderQty:    reorderQty    != null ? (reorderQty as string | number)    : null,
        leadTimeDays:  leadTimeDays  != null ? Number(leadTimeDays) : null,
      },
      include: { supplier: { select: { id: true, name: true, code: true } } },
    });
    res.status(201).json(material);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A material with that code already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Supplier not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/materials/:id ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { code, name, type, unitOfMeasure, supplierId, reorderPoint, reorderQty, leadTimeDays, isActive } =
    req.body as Record<string, unknown>;

  if (type !== undefined && !VALID_TYPES.includes(type as MaterialType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }

  try {
    // Build the update object imperatively to avoid TS union-resolution issues
    // with nullable FK fields (supplierId) in Prisma's generated types.
    const d: Record<string, unknown> = {};
    if (code          !== undefined) d.code          = String(code).trim().toUpperCase();
    if (name          !== undefined) d.name          = String(name).trim();
    if (type          !== undefined) d.type          = type as MaterialType;
    if (unitOfMeasure !== undefined) d.unitOfMeasure = String(unitOfMeasure).trim();
    if (supplierId    !== undefined) d.supplierId    = supplierId != null ? Number(supplierId) : null;
    if (reorderPoint  !== undefined) d.reorderPoint  = reorderPoint  != null ? (reorderPoint  as string | number) : null;
    if (reorderQty    !== undefined) d.reorderQty    = reorderQty    != null ? (reorderQty    as string | number) : null;
    if (leadTimeDays  !== undefined) d.leadTimeDays  = leadTimeDays  != null ? Number(leadTimeDays) : null;
    if (isActive      !== undefined) d.isActive      = Boolean(isActive);

    const material = await prisma.material.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  d as any,
      include: { supplier: { select: { id: true, name: true, code: true } } },
    });
    res.json(material);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Material not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Code already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Supplier not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/materials/:id (soft delete) ────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.material.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Material not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
