import { Router } from 'express';
import { LocationType } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_TYPES = Object.values(LocationType);

// ── GET / ───────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const locations = await prisma.location.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  res.json(locations);
});

// ── GET /:id ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: { select: { inventory: true, equipment: true, workCenters: true } },
    },
  });
  if (!location) { res.status(404).json({ error: 'Location not found' }); return; }
  res.json(location);
});

// ── POST / ──────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }
  if (b.locationType && !VALID_TYPES.includes(b.locationType as LocationType)) {
    res.status(400).json({ error: `locationType must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }

  try {
    if (b.isDefault) {
      await prisma.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    const location = await prisma.location.create({
      data: {
        name:         String(b.name).trim(),
        locationType: (b.locationType as LocationType) ?? LocationType.OWN_PLANT,
        isRegistered: b.isRegistered != null ? Boolean(b.isRegistered) : false,
        isDefault:    b.isDefault != null ? Boolean(b.isDefault) : false,
        street:       b.street  ? String(b.street).trim()  : null,
        city:         b.city    ? String(b.city).trim()    : null,
        state:        b.state   ? String(b.state).trim()   : null,
        zip:          b.zip     ? String(b.zip).trim()     : null,
        country:      b.country ? String(b.country).trim() : 'US',
        phone:        b.phone   ? String(b.phone).trim()   : null,
        email:        b.email   ? String(b.email).trim()   : null,
      },
    });
    res.status(201).json(location);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A location with that name already exists' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /:id ────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;
  if (b.locationType !== undefined && !VALID_TYPES.includes(b.locationType as LocationType)) {
    res.status(400).json({ error: `locationType must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }

  try {
    if (b.isDefault) {
      await prisma.location.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
    }

    const d: Record<string, unknown> = {};
    if (b.name         !== undefined) d.name         = String(b.name).trim();
    if (b.locationType !== undefined) d.locationType = b.locationType as LocationType;
    if (b.isRegistered !== undefined) d.isRegistered = Boolean(b.isRegistered);
    if (b.isDefault    !== undefined) d.isDefault    = Boolean(b.isDefault);
    if (b.street       !== undefined) d.street       = b.street  ? String(b.street).trim()  : null;
    if (b.city         !== undefined) d.city         = b.city    ? String(b.city).trim()    : null;
    if (b.state        !== undefined) d.state        = b.state   ? String(b.state).trim()   : null;
    if (b.zip          !== undefined) d.zip          = b.zip     ? String(b.zip).trim()     : null;
    if (b.country      !== undefined) d.country      = b.country ? String(b.country).trim() : null;
    if (b.phone        !== undefined) d.phone        = b.phone   ? String(b.phone).trim()   : null;
    if (b.email        !== undefined) d.email        = b.email   ? String(b.email).trim()   : null;
    if (b.isActive     !== undefined) d.isActive     = Boolean(b.isActive);

    const location = await prisma.location.update({ where: { id }, data: d as any });
    res.json(location);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Location not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Name already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /:id ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const invCount = await prisma.materialInventory.count({ where: { locationId: id, quantity: { gt: 0 } } });
    if (invCount > 0) {
      res.status(409).json({ error: `Cannot deactivate: ${invCount} material(s) have inventory at this location`, invCount });
      return;
    }
    await prisma.location.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Location not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
