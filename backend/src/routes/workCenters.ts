import { Router } from 'express';
import { WorkCenterType } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_TYPES = Object.values(WorkCenterType);

// ── GET /api/protected/work-centers ──────────────────────────────────────────
router.get('/', async (req, res) => {
  const { active, type } = req.query as { active?: string; type?: string };

  const where = {
    ...(active !== 'false' ? { isActive: true } : {}),
    ...(type && VALID_TYPES.includes(type as WorkCenterType) ? { type: type as WorkCenterType } : {}),
  };

  const workCenters = await prisma.workCenter.findMany({
    where,
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
  res.json(workCenters);
});

// ── GET /api/protected/work-centers/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const wc = await prisma.workCenter.findUnique({ where: { id } });
  if (!wc) { res.status(404).json({ error: 'Work center not found' }); return; }
  res.json(wc);
});

// ── POST /api/protected/work-centers ─────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, type, description } = req.body as {
    name?: string; type?: string; description?: string;
  };
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }
  if (!type || !VALID_TYPES.includes(type as WorkCenterType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }

  try {
    const wc = await prisma.workCenter.create({
      data: {
        name:        name.trim(),
        type:        type as WorkCenterType,
        description: description?.trim() || null,
      },
    });
    res.status(201).json(wc);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A work center with that name already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/work-centers/:id ──────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { name, type, description, isActive } = req.body as {
    name?: string; type?: string; description?: string; isActive?: boolean;
  };
  if (type !== undefined && !VALID_TYPES.includes(type as WorkCenterType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }

  try {
    const wc = await prisma.workCenter.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name:        name.trim() }),
        ...(type        !== undefined && { type:        type as WorkCenterType }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive    !== undefined && { isActive }),
      },
    });
    res.json(wc);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Work center not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Name already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/work-centers/:id (soft delete) ─────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.workCenter.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Work center not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
