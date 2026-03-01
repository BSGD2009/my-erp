import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/suppliers ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where = {
    isActive: active === 'false' ? false : true,
    ...(search ? {
      OR: [
        { name:        { contains: search, mode: 'insensitive' as const } },
        { code:        { contains: search, mode: 'insensitive' as const } },
        { contactName: { contains: search, mode: 'insensitive' as const } },
        { email:       { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.supplier.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/suppliers/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { materials: { where: { isActive: true }, orderBy: { name: 'asc' } } },
  });
  if (!supplier) { res.status(404).json({ error: 'Supplier not found' }); return; }
  res.json(supplier);
});

// ── POST /api/protected/suppliers ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { code, name, contactName, email, phone, address, paymentTerms, leadTimeDays } =
    req.body as Record<string, string | number | undefined>;

  if (!String(code ?? '').trim()) { res.status(400).json({ error: 'code is required' }); return; }
  if (!String(name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        code:         String(code).trim().toUpperCase(),
        name:         String(name).trim(),
        contactName:  contactName ? String(contactName).trim() : null,
        email:        email       ? String(email).trim()       : null,
        phone:        phone       ? String(phone).trim()       : null,
        address:      address     ? String(address).trim()     : null,
        paymentTerms: paymentTerms? String(paymentTerms).trim(): null,
        leadTimeDays: leadTimeDays != null ? Number(leadTimeDays) : null,
      },
    });
    res.status(201).json(supplier);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A supplier with that code already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/suppliers/:id ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { code, name, contactName, email, phone, address, paymentTerms, leadTimeDays, isActive } = req.body;

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(code         !== undefined && { code:         String(code).trim().toUpperCase() }),
        ...(name         !== undefined && { name:         String(name).trim() }),
        ...(contactName  !== undefined && { contactName:  contactName  ? String(contactName).trim()  : null }),
        ...(email        !== undefined && { email:        email        ? String(email).trim()        : null }),
        ...(phone        !== undefined && { phone:        phone        ? String(phone).trim()        : null }),
        ...(address      !== undefined && { address:      address      ? String(address).trim()      : null }),
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms ? String(paymentTerms).trim() : null }),
        ...(leadTimeDays !== undefined && { leadTimeDays: leadTimeDays != null ? Number(leadTimeDays) : null }),
        ...(isActive     !== undefined && { isActive }),
      },
    });
    res.json(supplier);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Supplier not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Code already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/suppliers/:id (soft delete) ────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Supplier not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
