import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

async function generateCode(name: string): Promise<string> {
  const prefix = name.replace(/[^A-Za-z0-9-]/g, '').substring(0, 6).toUpperCase();
  for (let i = 1; i <= 99; i++) {
    const code = `${prefix}-${String(i).padStart(2, '0')}`;
    const exists = await prisma.material.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `MAT-${Date.now() % 100000}`;
}

// ── GET / ───────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, materialTypeId, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (materialTypeId) where.materialTypeId = parseInt(materialTypeId);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.material.findMany({
      where: where as any,
      orderBy: [{ code: 'asc' }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        materialType: { select: { id: true, typeKey: true, typeName: true } },
        _count: { select: { inventory: true } },
      },
    }),
    prisma.material.count({ where: where as any }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /:id ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      materialType: { select: { id: true, typeKey: true, typeName: true } },
      inventory: { include: { location: { select: { id: true, name: true } } } },
      variants: { where: { isActive: true }, orderBy: { variantCode: 'asc' } },
    },
  });
  if (!material) { res.status(404).json({ error: 'Material not found' }); return; }
  res.json(material);
});

// ── GET /:id/transactions ───────────────────────────────────────────────────
router.get('/:id/transactions', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  const { limit = '20' } = req.query as Record<string, string>;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const transactions = await prisma.materialTransaction.findMany({
    where: { materialId: id },
    orderBy: { createdAt: 'desc' },
    take: limitNum,
    include: {
      location:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.json(transactions);
});

// ── POST / ──────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }
  if (!String(b.unitOfMeasure ?? '').trim()) { res.status(400).json({ error: 'unitOfMeasure is required' }); return; }

  const code = b.code ? String(b.code).trim().toUpperCase() : await generateCode(String(b.name));

  try {
    const material = await prisma.material.create({
      data: {
        code,
        name:           String(b.name).trim(),
        materialTypeId: b.materialTypeId != null ? Number(b.materialTypeId) : null,
        unitOfMeasure:  String(b.unitOfMeasure).trim(),
        defaultCost:    b.defaultCost != null ? (b.defaultCost as number) : null,
        reorderPoint:   b.reorderPoint != null ? (b.reorderPoint as number) : null,
        reorderQty:     b.reorderQty != null ? (b.reorderQty as number) : null,
        leadTimeDays:   b.leadTimeDays != null ? Number(b.leadTimeDays) : null,
      },
    });
    res.status(201).json(material);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A material with that code already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
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
    if (b.code           !== undefined) d.code           = String(b.code).trim().toUpperCase();
    if (b.name           !== undefined) d.name           = String(b.name).trim();
    if (b.materialTypeId !== undefined) d.materialTypeId = b.materialTypeId != null ? Number(b.materialTypeId) : null;
    if (b.unitOfMeasure  !== undefined) d.unitOfMeasure  = String(b.unitOfMeasure).trim();
    if (b.defaultCost    !== undefined) d.defaultCost    = b.defaultCost != null ? (b.defaultCost as number) : null;
    if (b.reorderPoint   !== undefined) d.reorderPoint   = b.reorderPoint != null ? (b.reorderPoint as number) : null;
    if (b.reorderQty     !== undefined) d.reorderQty     = b.reorderQty != null ? (b.reorderQty as number) : null;
    if (b.leadTimeDays   !== undefined) d.leadTimeDays   = b.leadTimeDays != null ? Number(b.leadTimeDays) : null;
    if (b.isActive       !== undefined) d.isActive       = Boolean(b.isActive);

    const material = await prisma.material.update({ where: { id }, data: d as any });
    res.json(material);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Material not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Code already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /:id ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const invCount = await prisma.materialInventory.count({ where: { materialId: id, quantity: { gt: 0 } } });
    const bomCount = await prisma.bOMLine.count({ where: { materialId: id } });
    if (invCount > 0 || bomCount > 0) {
      res.status(409).json({
        error: `Cannot deactivate: material has ${invCount} inventory record(s) and ${bomCount} BOM reference(s)`,
        invCount, bomCount,
      });
      return;
    }
    await prisma.material.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Material not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
