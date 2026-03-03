import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/material-types ───────────────────────────────────────
router.get('/', async (_req, res) => {
  const types = await prisma.materialType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(types);
});

// ── GET /api/protected/material-types/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const mt = await prisma.materialType.findUnique({ where: { id } });
  if (!mt) { res.status(404).json({ error: 'Material type not found' }); return; }
  res.json(mt);
});

// ── POST /api/protected/material-types ──────────────────────────────────────
router.post('/', async (req, res) => {
  const { typeKey, typeName, sortOrder } = req.body as Record<string, unknown>;

  if (!String(typeKey  ?? '').trim()) { res.status(400).json({ error: 'typeKey is required' });  return; }
  if (!String(typeName ?? '').trim()) { res.status(400).json({ error: 'typeName is required' }); return; }

  try {
    const mt = await prisma.materialType.create({
      data: {
        typeKey:   String(typeKey).trim().toUpperCase(),
        typeName:  String(typeName).trim(),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      },
    });
    res.status(201).json(mt);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A material type with that key already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/material-types/:id ───────────────────────────────────
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

    const mt = await prisma.materialType.update({
      where: { id },
      data:  d as any,
    });
    res.json(mt);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Material type not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Type key already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/material-types/:id (soft delete) ──────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const materialCount = await prisma.material.count({ where: { materialTypeId: id } });
  if (materialCount > 0) {
    res.status(409).json({
      error: `Cannot deactivate: referenced by ${materialCount} material(s)`,
      materialCount,
    });
    return;
  }

  try {
    await prisma.materialType.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Material type not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
