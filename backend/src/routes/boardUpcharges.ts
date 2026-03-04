import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { UpchargeType, ChargeType } from '@prisma/client';

const router = Router();

const VALID_UPCHARGE_TYPES = Object.values(UpchargeType);
const VALID_CHARGE_TYPES   = Object.values(ChargeType);

// ── LIST board upcharges (paginated) ─────────────────────────────────────────
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
    if (q.upchargeType && VALID_UPCHARGE_TYPES.includes(q.upchargeType as UpchargeType)) {
      where.upchargeType = q.upchargeType;
    }

    const [data, total] = await Promise.all([
      prisma.boardUpcharge.findMany({
        where: where as any,
        include: {
          supplier: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ supplierId: 'asc' }, { upchargeType: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.boardUpcharge.count({ where: where as any }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    console.error('GET /board-upcharges', err);
    res.status(500).json({ error: 'Failed to list board upcharges' });
  }
});

// ── GET single ───────────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await prisma.boardUpcharge.findUnique({
      where: { id },
      include: { supplier: { select: { id: true, name: true, code: true } } },
    });
    if (!row) { res.status(404).json({ error: 'Board upcharge not found' }); return; }
    res.json(row);
  } catch (err) {
    console.error('GET /board-upcharges/:id', err);
    res.status(500).json({ error: 'Failed to get board upcharge' });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    if (!b.supplierId || !b.upchargeType || !b.chargeType || b.amount == null || !b.effectiveDate) {
      res.status(400).json({ error: 'supplierId, upchargeType, chargeType, amount, and effectiveDate are required' });
      return;
    }
    if (!VALID_UPCHARGE_TYPES.includes(b.upchargeType)) {
      res.status(400).json({ error: `Invalid upchargeType. Must be one of: ${VALID_UPCHARGE_TYPES.join(', ')}` });
      return;
    }
    if (!VALID_CHARGE_TYPES.includes(b.chargeType)) {
      res.status(400).json({ error: `Invalid chargeType. Must be one of: ${VALID_CHARGE_TYPES.join(', ')}` });
      return;
    }

    const row = await prisma.boardUpcharge.create({
      data: {
        supplierId:    b.supplierId,
        upchargeType:  b.upchargeType,
        chargeType:    b.chargeType,
        amount:        b.amount,
        condition:     b.condition || null,
        minMsf:        b.minMsf ?? null,
        effectiveDate: new Date(b.effectiveDate),
      },
      include: { supplier: { select: { id: true, name: true, code: true } } },
    });

    res.status(201).json(row);
  } catch (err: any) {
    console.error('POST /board-upcharges', err);
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid supplier reference' }); return; }
    res.status(500).json({ error: 'Failed to create board upcharge' });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b  = req.body;
    const d: Record<string, unknown> = {};

    if (b.supplierId !== undefined)    d.supplierId    = b.supplierId;
    if (b.upchargeType !== undefined) {
      if (!VALID_UPCHARGE_TYPES.includes(b.upchargeType)) {
        res.status(400).json({ error: 'Invalid upchargeType' }); return;
      }
      d.upchargeType = b.upchargeType;
    }
    if (b.chargeType !== undefined) {
      if (!VALID_CHARGE_TYPES.includes(b.chargeType)) {
        res.status(400).json({ error: 'Invalid chargeType' }); return;
      }
      d.chargeType = b.chargeType;
    }
    if (b.amount !== undefined)        d.amount        = b.amount;
    if (b.condition !== undefined)     d.condition     = b.condition || null;
    if (b.minMsf !== undefined)        d.minMsf        = b.minMsf ?? null;
    if (b.effectiveDate !== undefined) d.effectiveDate = new Date(b.effectiveDate);
    if (b.isActive !== undefined)      d.isActive      = b.isActive;

    const row = await prisma.boardUpcharge.update({
      where: { id },
      data:  d as any,
      include: { supplier: { select: { id: true, name: true, code: true } } },
    });

    res.json(row);
  } catch (err: any) {
    console.error('PUT /board-upcharges/:id', err);
    if (err.code === 'P2025') { res.status(404).json({ error: 'Board upcharge not found' }); return; }
    res.status(500).json({ error: 'Failed to update board upcharge' });
  }
});

// ── DELETE (soft) ────────────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.boardUpcharge.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Board upcharge deactivated' });
  } catch (err: any) {
    console.error('DELETE /board-upcharges/:id', err);
    if (err.code === 'P2025') { res.status(404).json({ error: 'Board upcharge not found' }); return; }
    res.status(500).json({ error: 'Failed to delete board upcharge' });
  }
});

export default router;
