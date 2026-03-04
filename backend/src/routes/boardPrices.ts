import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

// ── LIST board prices (paginated) ────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const page  = Math.max(1, parseInt(q.page  ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (q.active === 'true')  where.isActive = true;
    if (q.active === 'false') where.isActive = false;
    if (q.supplierId)         where.supplierId = parseInt(q.supplierId, 10);
    if (q.boardGradeId)       where.boardGradeId = parseInt(q.boardGradeId, 10);
    if (q.locationId)         where.deliveryLocationId = parseInt(q.locationId, 10);

    const [data, total] = await Promise.all([
      prisma.boardPrice.findMany({
        where: where as any,
        include: {
          supplier:         { select: { id: true, name: true, code: true } },
          deliveryLocation: { select: { id: true, name: true } },
          boardGrade:       { select: { id: true, gradeCode: true, gradeName: true } },
        },
        orderBy: [{ boardGradeId: 'asc' }, { supplierId: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.boardPrice.count({ where: where as any }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    console.error('GET /board-prices', err);
    res.status(500).json({ error: 'Failed to list board prices' });
  }
});

// ── GET single board price ───────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await prisma.boardPrice.findUnique({
      where: { id },
      include: {
        supplier:         { select: { id: true, name: true, code: true } },
        deliveryLocation: { select: { id: true, name: true } },
        boardGrade:       { select: { id: true, gradeCode: true, gradeName: true } },
      },
    });
    if (!row) { res.status(404).json({ error: 'Board price not found' }); return; }
    res.json(row);
  } catch (err) {
    console.error('GET /board-prices/:id', err);
    res.status(500).json({ error: 'Failed to get board price' });
  }
});

// ── CREATE board price ───────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    if (!b.supplierId || !b.boardGradeId || !b.effectiveDate) {
      res.status(400).json({ error: 'supplierId, boardGradeId, and effectiveDate are required' });
      return;
    }
    if (b.tier1MaxMsf == null || b.tier1Price == null || b.tier2MaxMsf == null ||
        b.tier2Price == null || b.tier3MaxMsf == null || b.tier3Price == null || b.tier4Price == null) {
      res.status(400).json({ error: 'All four pricing tiers are required' });
      return;
    }

    const row = await prisma.boardPrice.create({
      data: {
        supplierId:         b.supplierId,
        deliveryLocationId: b.deliveryLocationId || null,
        boardGradeId:       b.boardGradeId,
        flute:              b.flute || null,
        tier1MaxMsf:        b.tier1MaxMsf,
        tier1Price:         b.tier1Price,
        tier2MaxMsf:        b.tier2MaxMsf,
        tier2Price:         b.tier2Price,
        tier3MaxMsf:        b.tier3MaxMsf,
        tier3Price:         b.tier3Price,
        tier4Price:         b.tier4Price,
        effectiveDate:      new Date(b.effectiveDate),
        expiryDate:         b.expiryDate ? new Date(b.expiryDate) : null,
      },
      include: {
        supplier:         { select: { id: true, name: true, code: true } },
        deliveryLocation: { select: { id: true, name: true } },
        boardGrade:       { select: { id: true, gradeCode: true, gradeName: true } },
      },
    });

    res.status(201).json(row);
  } catch (err: any) {
    console.error('POST /board-prices', err);
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Failed to create board price' });
  }
});

// ── UPDATE board price ───────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b  = req.body;
    const d: Record<string, unknown> = {};

    if (b.supplierId !== undefined)         d.supplierId         = b.supplierId;
    if (b.deliveryLocationId !== undefined)  d.deliveryLocationId = b.deliveryLocationId || null;
    if (b.boardGradeId !== undefined)        d.boardGradeId       = b.boardGradeId;
    if (b.flute !== undefined)               d.flute              = b.flute || null;
    if (b.tier1MaxMsf !== undefined)         d.tier1MaxMsf        = b.tier1MaxMsf;
    if (b.tier1Price !== undefined)          d.tier1Price         = b.tier1Price;
    if (b.tier2MaxMsf !== undefined)         d.tier2MaxMsf        = b.tier2MaxMsf;
    if (b.tier2Price !== undefined)          d.tier2Price         = b.tier2Price;
    if (b.tier3MaxMsf !== undefined)         d.tier3MaxMsf        = b.tier3MaxMsf;
    if (b.tier3Price !== undefined)          d.tier3Price         = b.tier3Price;
    if (b.tier4Price !== undefined)          d.tier4Price         = b.tier4Price;
    if (b.effectiveDate !== undefined)       d.effectiveDate      = new Date(b.effectiveDate);
    if (b.expiryDate !== undefined)          d.expiryDate         = b.expiryDate ? new Date(b.expiryDate) : null;
    if (b.isActive !== undefined)            d.isActive           = b.isActive;

    const row = await prisma.boardPrice.update({
      where: { id },
      data:  d as any,
      include: {
        supplier:         { select: { id: true, name: true, code: true } },
        deliveryLocation: { select: { id: true, name: true } },
        boardGrade:       { select: { id: true, gradeCode: true, gradeName: true } },
      },
    });

    res.json(row);
  } catch (err: any) {
    console.error('PUT /board-prices/:id', err);
    if (err.code === 'P2025') { res.status(404).json({ error: 'Board price not found' }); return; }
    res.status(500).json({ error: 'Failed to update board price' });
  }
});

// ── DELETE (soft) board price ────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.boardPrice.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Board price deactivated' });
  } catch (err: any) {
    console.error('DELETE /board-prices/:id', err);
    if (err.code === 'P2025') { res.status(404).json({ error: 'Board price not found' }); return; }
    res.status(500).json({ error: 'Failed to delete board price' });
  }
});

export default router;
