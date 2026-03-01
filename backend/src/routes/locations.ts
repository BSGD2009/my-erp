import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/locations ─────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const locations = await prisma.location.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  res.json(locations);
});

// ── GET /api/protected/locations/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) { res.status(404).json({ error: 'Location not found' }); return; }
  res.json(location);
});

// ── POST /api/protected/locations ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, address, isDefault } = req.body as {
    name?: string; address?: string; isDefault?: boolean;
  };
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

  try {
    // Only one location can be the default — clear the flag first if needed.
    if (isDefault) {
      await prisma.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    const location = await prisma.location.create({
      data: {
        name:      name.trim(),
        address:   address?.trim() || null,
        isDefault: isDefault ?? false,
      },
    });
    res.status(201).json(location);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A location with that name already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/locations/:id ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { name, address, isDefault, isActive } = req.body as {
    name?: string; address?: string; isDefault?: boolean; isActive?: boolean;
  };

  try {
    if (isDefault) {
      await prisma.location.updateMany({
        where: { isDefault: true, id: { not: id } },
        data:  { isDefault: false },
      });
    }
    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(name      !== undefined && { name:      name.trim() }),
        ...(address   !== undefined && { address:   address?.trim() || null }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive  !== undefined && { isActive }),
      },
    });
    res.json(location);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Location not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Name already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/locations/:id (soft delete) ────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.location.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Location not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
