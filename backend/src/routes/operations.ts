import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/operations ───────────────────────────────────────────
router.get('/', async (_req, res) => {
  const operations = await prisma.operation.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      operationRequirements: {
        include: { resourceType: { select: { id: true, typeKey: true, typeName: true } } },
      },
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
      operationRequirements: {
        include: { resourceType: { select: { id: true, typeKey: true, typeName: true } } },
      },
      capabilities: {
        include: { resource: { select: { id: true, name: true } } },
      },
    },
  });
  if (!op) { res.status(404).json({ error: 'Operation not found' }); return; }
  res.json(op);
});

// ── POST /api/protected/operations ──────────────────────────────────────────
router.post('/', async (req, res) => {
  const { operationKey, operationName, sortOrder } =
    req.body as Record<string, unknown>;

  if (!String(operationKey  ?? '').trim()) { res.status(400).json({ error: 'operationKey is required' });  return; }
  if (!String(operationName ?? '').trim()) { res.status(400).json({ error: 'operationName is required' }); return; }

  try {
    const op = await prisma.operation.create({
      data: {
        operationKey:  String(operationKey).trim().toUpperCase(),
        operationName: String(operationName).trim(),
        sortOrder:     sortOrder != null ? Number(sortOrder) : 0,
      },
    });
    res.status(201).json(op);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'An operation with that key already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/operations/:id ───────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { operationKey, operationName, sortOrder, isActive } =
    req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (operationKey  !== undefined) d.operationKey  = String(operationKey).trim().toUpperCase();
    if (operationName !== undefined) d.operationName = String(operationName).trim();
    if (sortOrder     !== undefined) d.sortOrder     = Number(sortOrder);
    if (isActive      !== undefined) d.isActive      = Boolean(isActive);

    const op = await prisma.operation.update({
      where: { id },
      data:  d as any,
    });
    res.json(op);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Operation not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Operation key already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/operations/:id (soft delete) ──────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const capabilityCount = await prisma.resourceCapability.count({ where: { operationId: id } });
  if (capabilityCount > 0) {
    res.status(409).json({
      error: `Cannot deactivate: referenced by ${capabilityCount} resource capability(ies)`,
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

// ── POST /api/protected/operations/:id/requirements ─────────────────────────
router.post('/:id/requirements', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { resourceTypeId, isRequired, notes } = req.body as Record<string, unknown>;
  if (resourceTypeId == null) { res.status(400).json({ error: 'resourceTypeId is required' }); return; }

  try {
    const req2 = await prisma.operationRequirement.create({
      data: {
        operationId:    id,
        resourceTypeId: Number(resourceTypeId),
        isRequired:     isRequired != null ? Boolean(isRequired) : true,
        notes:          notes != null ? String(notes).trim() : null,
      },
      include: { resourceType: { select: { id: true, typeKey: true, typeName: true } } },
    });
    res.status(201).json(req2);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'This operation already has that resource type requirement' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Operation or resource type not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/operations/:id/requirements/:reqId ────────────────
router.delete('/:id/requirements/:reqId', async (req, res) => {
  const id    = parseInt(req.params.id);
  const reqId = parseInt(req.params.reqId);
  if (isNaN(id))    { res.status(400).json({ error: 'Invalid operation ID' }); return; }
  if (isNaN(reqId)) { res.status(400).json({ error: 'Invalid requirement ID' }); return; }

  try {
    const existing = await prisma.operationRequirement.findUnique({ where: { id: reqId } });
    if (!existing || existing.operationId !== id) {
      res.status(404).json({ error: 'Requirement not found for this operation' });
      return;
    }
    await prisma.operationRequirement.delete({ where: { id: reqId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Requirement not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
