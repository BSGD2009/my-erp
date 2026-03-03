import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/work-center-types ────────────────────────────────────
router.get('/', async (_req, res) => {
  const types = await prisma.workCenterType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { workCenters: true, equipment: true } },
    },
  });
  res.json(types);
});

// ── GET /api/protected/work-center-types/:id ────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const wct = await prisma.workCenterType.findUnique({
    where: { id },
    include: {
      _count: { select: { workCenters: true, equipment: true } },
    },
  });
  if (!wct) { res.status(404).json({ error: 'Work center type not found' }); return; }
  res.json(wct);
});

// ── POST /api/protected/work-center-types ───────────────────────────────────
router.post('/', async (req, res) => {
  const { typeKey, typeName, sortOrder } = req.body as Record<string, unknown>;

  if (!String(typeKey  ?? '').trim()) { res.status(400).json({ error: 'typeKey is required' });  return; }
  if (!String(typeName ?? '').trim()) { res.status(400).json({ error: 'typeName is required' }); return; }

  try {
    const wct = await prisma.workCenterType.create({
      data: {
        typeKey:   String(typeKey).trim().toUpperCase(),
        typeName:  String(typeName).trim(),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      },
      include: {
        _count: { select: { workCenters: true, equipment: true } },
      },
    });
    res.status(201).json(wct);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A work center type with that key already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/work-center-types/:id ────────────────────────────────
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

    const wct = await prisma.workCenterType.update({
      where: { id },
      data:  d as any,
      include: {
        _count: { select: { workCenters: true, equipment: true } },
      },
    });
    res.json(wct);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Work center type not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Type key already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/work-center-types/:id (soft delete) ───────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const [workCenterCount, equipmentCount, operationCount] = await Promise.all([
    prisma.workCenter.count({ where: { workCenterTypeId: id } }),
    prisma.equipment.count({ where: { equipmentTypeId: id } }),
    prisma.operation.count({ where: { defaultEquipmentTypeId: id } }),
  ]);

  const totalRefs = workCenterCount + equipmentCount + operationCount;
  if (totalRefs > 0) {
    res.status(409).json({
      error: `Cannot deactivate: referenced by ${workCenterCount} work center(s), ${equipmentCount} equipment record(s), and ${operationCount} operation(s)`,
      workCenterCount,
      equipmentCount,
      operationCount,
    });
    return;
  }

  try {
    await prisma.workCenterType.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Work center type not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
