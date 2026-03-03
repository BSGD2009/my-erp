import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/payment-terms ────────────────────────────────────────
router.get('/', async (_req, res) => {
  const terms = await prisma.paymentTerm.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(terms);
});

// ── GET /api/protected/payment-terms/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const term = await prisma.paymentTerm.findUnique({ where: { id } });
  if (!term) { res.status(404).json({ error: 'Payment term not found' }); return; }
  res.json(term);
});

// ── POST /api/protected/payment-terms ───────────────────────────────────────
router.post('/', async (req, res) => {
  const { termCode, termName, discountPercent, discountDays, netDays, sortOrder } =
    req.body as Record<string, unknown>;

  if (!String(termCode ?? '').trim()) { res.status(400).json({ error: 'termCode is required' }); return; }
  if (!String(termName ?? '').trim()) { res.status(400).json({ error: 'termName is required' }); return; }
  if (netDays == null || isNaN(Number(netDays))) { res.status(400).json({ error: 'netDays is required' }); return; }

  try {
    const term = await prisma.paymentTerm.create({
      data: {
        termCode:        String(termCode).trim().toUpperCase(),
        termName:        String(termName).trim(),
        discountPercent: discountPercent != null ? Number(discountPercent) : 0,
        discountDays:    discountDays    != null ? Number(discountDays)    : 0,
        netDays:         Number(netDays),
        sortOrder:       sortOrder       != null ? Number(sortOrder)       : 0,
      },
    });
    res.status(201).json(term);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A payment term with that code already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/payment-terms/:id ────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { termCode, termName, discountPercent, discountDays, netDays, sortOrder, isActive } =
    req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (termCode        !== undefined) d.termCode        = String(termCode).trim().toUpperCase();
    if (termName        !== undefined) d.termName        = String(termName).trim();
    if (discountPercent !== undefined) d.discountPercent  = Number(discountPercent);
    if (discountDays    !== undefined) d.discountDays     = Number(discountDays);
    if (netDays         !== undefined) d.netDays          = Number(netDays);
    if (sortOrder       !== undefined) d.sortOrder        = Number(sortOrder);
    if (isActive        !== undefined) d.isActive         = Boolean(isActive);

    const term = await prisma.paymentTerm.update({
      where: { id },
      data:  d as any,
    });
    res.json(term);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Payment term not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Term code already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/payment-terms/:id (soft delete) ───────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  // Check for references before soft-deleting
  const [customerCount, supplierCount] = await Promise.all([
    prisma.customer.count({ where: { paymentTermId: id } }),
    prisma.supplier.count({ where: { paymentTermId: id } }),
  ]);

  const totalRefs = customerCount + supplierCount;
  if (totalRefs > 0) {
    res.status(409).json({
      error: `Cannot deactivate: referenced by ${customerCount} customer(s) and ${supplierCount} supplier(s)`,
      customerCount,
      supplierCount,
    });
    return;
  }

  try {
    await prisma.paymentTerm.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Payment term not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
