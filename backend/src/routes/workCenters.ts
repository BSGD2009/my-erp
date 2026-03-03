import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET / ───────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { active } = req.query as Record<string, string>;
  const where = { isActive: active === 'false' ? false : true };

  const workCenters = await prisma.workCenter.findMany({
    where,
    orderBy: [{ name: 'asc' }],
    include: {
      workCenterType: { select: { id: true, typeKey: true, typeName: true } },
      location:       { select: { id: true, name: true } },
      equipment:      { select: { id: true, name: true } },
    },
  });
  res.json(workCenters);
});

// ── GET /:id ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const wc = await prisma.workCenter.findUnique({
    where: { id },
    include: {
      workCenterType: { select: { id: true, typeKey: true, typeName: true } },
      location:       { select: { id: true, name: true } },
      equipment:      { select: { id: true, name: true } },
      _count:         { select: { jobs: true } },
    },
  });
  if (!wc) { res.status(404).json({ error: 'Work center not found' }); return; }
  res.json(wc);
});

// ── POST / ──────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  try {
    const wc = await prisma.workCenter.create({
      data: {
        name:             String(b.name).trim(),
        workCenterTypeId: b.workCenterTypeId != null ? Number(b.workCenterTypeId) : null,
        description:      b.description ? String(b.description).trim() : null,
        locationId:       b.locationId != null ? Number(b.locationId) : null,
        equipmentId:      b.equipmentId != null ? Number(b.equipmentId) : null,
      },
    });
    res.status(201).json(wc);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A work center with that name already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /:id ────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;
  try {
    const d: Record<string, unknown> = {};
    if (b.name             !== undefined) d.name             = String(b.name).trim();
    if (b.workCenterTypeId !== undefined) d.workCenterTypeId = b.workCenterTypeId != null ? Number(b.workCenterTypeId) : null;
    if (b.description      !== undefined) d.description      = b.description ? String(b.description).trim() : null;
    if (b.locationId       !== undefined) d.locationId       = b.locationId != null ? Number(b.locationId) : null;
    if (b.equipmentId      !== undefined) d.equipmentId      = b.equipmentId != null ? Number(b.equipmentId) : null;
    if (b.isActive         !== undefined) d.isActive         = Boolean(b.isActive);

    const wc = await prisma.workCenter.update({ where: { id }, data: d as any });
    res.json(wc);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Work center not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Name already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /:id ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const jobCount = await prisma.productionJob.count({ where: { workCenterId: id } });
    if (jobCount > 0) {
      res.status(409).json({ error: `Cannot deactivate: ${jobCount} production job(s) reference this work center`, jobCount });
      return;
    }
    await prisma.workCenter.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Work center not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
