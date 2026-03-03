import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/resource-types ────────────────────────────────────────
router.get('/', async (_req, res) => {
  const types = await prisma.resourceType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { resources: true } },
    },
  });
  res.json(types);
});

// ── GET /api/protected/resource-types/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const rt = await prisma.resourceType.findUnique({
    where: { id },
    include: {
      _count: { select: { resources: true, operationRequirements: true } },
    },
  });
  if (!rt) { res.status(404).json({ error: 'Resource type not found' }); return; }
  res.json(rt);
});

// ── POST /api/protected/resource-types ───────────────────────────────────────
router.post('/', async (req, res) => {
  const { typeKey, typeName, sortOrder } = req.body as Record<string, unknown>;

  if (!String(typeKey  ?? '').trim()) { res.status(400).json({ error: 'typeKey is required' });  return; }
  if (!String(typeName ?? '').trim()) { res.status(400).json({ error: 'typeName is required' }); return; }

  try {
    const rt = await prisma.resourceType.create({
      data: {
        typeKey:   String(typeKey).trim().toUpperCase(),
        typeName:  String(typeName).trim(),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      },
      include: {
        _count: { select: { resources: true } },
      },
    });
    res.status(201).json(rt);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A resource type with that key already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/resource-types/:id ────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { typeKey, typeName, sortOrder, isActive } = req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (typeKey   !== undefined) d.typeKey   = String(typeKey).trim().toUpperCase();
    if (typeName  !== undefined) d.typeName  = String(typeName).trim();
    if (sortOrder !== undefined) d.sortOrder = Number(sortOrder);
    if (isActive  !== undefined) d.isActive  = Boolean(isActive);

    const rt = await prisma.resourceType.update({
      where: { id },
      data:  d as any,
      include: {
        _count: { select: { resources: true } },
      },
    });
    res.json(rt);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Resource type not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Type key already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/resource-types/:id (soft delete) ───────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const resourceCount = await prisma.resource.count({ where: { resourceTypeId: id } });
  if (resourceCount > 0) {
    res.status(409).json({
      error: `Cannot deactivate: referenced by ${resourceCount} resource(s)`,
      resourceCount,
    });
    return;
  }

  try {
    await prisma.resourceType.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Resource type not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
