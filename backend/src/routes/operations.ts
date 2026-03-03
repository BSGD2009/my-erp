import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/operations ───────────────────────────────────────────
router.get('/', async (_req, res) => {
  const operations = await prisma.operation.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      defaultEquipmentType: { select: { id: true, typeKey: true, typeName: true } },
    },
  });
  res.json(operations);
});

// ── GET /api/protected/operations/:id ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const op = await prisma.operation.findUnique({
    where: { id },
    include: {
      defaultEquipmentType: { select: { id: true, typeKey: true, typeName: true } },
    },
  });
  if (!op) { res.status(404).json({ error: 'Operation not found' }); return; }
  res.json(op);
});

// ── POST /api/protected/operations ──────────────────────────────────────────
router.post('/', async (req, res) => {
  const { operationKey, operationName, defaultEquipmentTypeId, sortOrder } =
    req.body as Record<string, unknown>;

  if (!String(operationKey  ?? '').trim()) { res.status(400).json({ error: 'operationKey is required' });  return; }
  if (!String(operationName ?? '').trim()) { res.status(400).json({ error: 'operationName is required' }); return; }

  try {
    const op = await prisma.operation.create({
      data: {
        operationKey:           String(operationKey).trim().toUpperCase(),
        operationName:          String(operationName).trim(),
        defaultEquipmentTypeId: defaultEquipmentTypeId != null ? Number(defaultEquipmentTypeId) : null,
        sortOrder:              sortOrder              != null ? Number(sortOrder)              : 0,
      },
      include: {
        defaultEquipmentType: { select: { id: true, typeKey: true, typeName: true } },
      },
    });
    res.status(201).json(op);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'An operation with that key already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Equipment type not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/operations/:id ───────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { operationKey, operationName, defaultEquipmentTypeId, sortOrder, isActive } =
    req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (operationKey           !== undefined) d.operationKey           = String(operationKey).trim().toUpperCase();
    if (operationName          !== undefined) d.operationName          = String(operationName).trim();
    if (defaultEquipmentTypeId !== undefined) d.defaultEquipmentTypeId = defaultEquipmentTypeId != null ? Number(defaultEquipmentTypeId) : null;
    if (sortOrder              !== undefined) d.sortOrder              = Number(sortOrder);
    if (isActive               !== undefined) d.isActive               = Boolean(isActive);

    const op = await prisma.operation.update({
      where: { id },
      data:  d as any,
      include: {
        defaultEquipmentType: { select: { id: true, typeKey: true, typeName: true } },
      },
    });
    res.json(op);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Operation not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Operation key already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Equipment type not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/operations/:id (soft delete) ──────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const capabilityCount = await prisma.equipmentCapability.count({ where: { operationId: id } });
  if (capabilityCount > 0) {
    res.status(409).json({
      error: `Cannot deactivate: referenced by ${capabilityCount} equipment capability(ies)`,
      capabilityCount,
    });
    return;
  }

  try {
    await prisma.operation.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Operation not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
