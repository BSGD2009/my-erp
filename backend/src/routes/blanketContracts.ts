import { Router } from 'express';
import { BlanketContractStatus } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_STATUSES = Object.values(BlanketContractStatus);

// ── GET /api/protected/blanket-contracts ───────────────────────────────────
router.get('/', async (req, res) => {
  const { customerId, status, page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = parseInt(customerId);
  if (status && VALID_STATUSES.includes(status as BlanketContractStatus)) {
    where.status = status as BlanketContractStatus;
  }

  const [data, total] = await Promise.all([
    prisma.blanketContract.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        customer:  { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.blanketContract.count({ where: where as any }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/blanket-contracts/:id ──────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const contract = await prisma.blanketContract.findUnique({
    where: { id },
    include: {
      customer:  { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      lines: {
        orderBy: { id: 'asc' },
        include: {
          customerItem:  { select: { id: true, code: true, name: true } },
          variant:       { select: { id: true, sku: true, variantDescription: true } },
          priceLockedBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!contract) { res.status(404).json({ error: 'Blanket contract not found' }); return; }
  res.json(contract);
});

// ── POST /api/protected/blanket-contracts ─────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;

  if (!b.customerId)                    { res.status(400).json({ error: 'customerId is required' });      return; }
  if (!String(b.contractNumber ?? '').trim()) { res.status(400).json({ error: 'contractNumber is required' }); return; }
  if (!b.startDate)                     { res.status(400).json({ error: 'startDate is required' });       return; }
  if (!b.endDate)                       { res.status(400).json({ error: 'endDate is required' });         return; }

  if (b.status !== undefined && !VALID_STATUSES.includes(b.status as BlanketContractStatus)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }); return;
  }

  try {
    const contract = await prisma.blanketContract.create({
      data: {
        customerId:          Number(b.customerId),
        contractNumber:      String(b.contractNumber).trim(),
        status:              (b.status as BlanketContractStatus) ?? 'ACTIVE',
        startDate:           new Date(String(b.startDate)),
        endDate:             new Date(String(b.endDate)),
        totalCommittedValue: b.totalCommittedValue != null ? (b.totalCommittedValue as number) : null,
        notes:               b.notes ? String(b.notes).trim() : null,
        createdById:         req.user!.userId,
      },
      include: {
        customer:  { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(contract);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A contract with that number already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/blanket-contracts/:id ──────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;

  if (b.status !== undefined && !VALID_STATUSES.includes(b.status as BlanketContractStatus)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }); return;
  }

  const d: Record<string, unknown> = {};
  if (b.contractNumber      !== undefined) d.contractNumber      = String(b.contractNumber).trim();
  if (b.status              !== undefined) d.status              = b.status as BlanketContractStatus;
  if (b.startDate           !== undefined) d.startDate           = new Date(String(b.startDate));
  if (b.endDate             !== undefined) d.endDate             = new Date(String(b.endDate));
  if (b.totalCommittedValue !== undefined) d.totalCommittedValue = b.totalCommittedValue != null ? (b.totalCommittedValue as number) : null;
  if (b.notes               !== undefined) d.notes               = b.notes ? String(b.notes).trim() : null;

  try {
    const contract = await prisma.blanketContract.update({
      where: { id },
      data: d as any,
      include: {
        customer:  { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.json(contract);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Blanket contract not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Contract number already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/blanket-contracts/:id ───────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.blanketContract.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Blanket contract not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LINES sub-resource
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/protected/blanket-contracts/:id/lines ───────────────────────
router.post('/:id/lines', async (req, res) => {
  const contractId = parseInt(req.params.id);
  if (isNaN(contractId)) { res.status(400).json({ error: 'Invalid contract ID' }); return; }

  const b = req.body as Record<string, unknown>;

  if (b.committedQty   == null) { res.status(400).json({ error: 'committedQty is required' });   return; }
  if (b.unitPrice      == null) { res.status(400).json({ error: 'unitPrice is required' });      return; }
  if (!b.validFrom)             { res.status(400).json({ error: 'validFrom is required' });      return; }
  if (!b.validTo)               { res.status(400).json({ error: 'validTo is required' });        return; }
  if (!b.priceLockedAt)         { res.status(400).json({ error: 'priceLockedAt is required' });  return; }
  if (b.priceLockedById == null) { res.status(400).json({ error: 'priceLockedById is required' }); return; }

  // Verify contract exists
  const contract = await prisma.blanketContract.findUnique({ where: { id: contractId }, select: { id: true } });
  if (!contract) { res.status(404).json({ error: 'Blanket contract not found' }); return; }

  try {
    const line = await prisma.blanketContractLine.create({
      data: {
        blanketContractId: contractId,
        customerItemId:    b.customerItemId != null ? Number(b.customerItemId) : null,
        variantId:         b.variantId      != null ? Number(b.variantId)      : null,
        committedQty:      b.committedQty as number,
        unitPrice:         b.unitPrice as number,
        validFrom:         new Date(String(b.validFrom)),
        validTo:           new Date(String(b.validTo)),
        priceLockedAt:     new Date(String(b.priceLockedAt)),
        priceLockedById:   Number(b.priceLockedById),
        notes:             b.notes ? String(b.notes).trim() : null,
      },
      include: {
        customerItem:  { select: { id: true, code: true, name: true } },
        variant:       { select: { id: true, sku: true, variantDescription: true } },
        priceLockedBy: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(line);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/blanket-contracts/:id/lines/:lineId ────────────────
router.put('/:id/lines/:lineId', async (req, res) => {
  const contractId = parseInt(req.params.id);
  const lineId     = parseInt(req.params.lineId);
  if (isNaN(contractId)) { res.status(400).json({ error: 'Invalid contract ID' }); return; }
  if (isNaN(lineId))     { res.status(400).json({ error: 'Invalid line ID' }); return; }

  // Verify line belongs to this contract
  const existing = await prisma.blanketContractLine.findFirst({
    where: { id: lineId, blanketContractId: contractId },
  });
  if (!existing) { res.status(404).json({ error: 'Line not found for this contract' }); return; }

  const b = req.body as Record<string, unknown>;

  const d: Record<string, unknown> = {};
  if (b.customerItemId  !== undefined) d.customerItemId  = b.customerItemId  != null ? Number(b.customerItemId) : null;
  if (b.variantId       !== undefined) d.variantId       = b.variantId       != null ? Number(b.variantId)      : null;
  if (b.committedQty    !== undefined) d.committedQty    = b.committedQty as number;
  if (b.unitPrice       !== undefined) d.unitPrice       = b.unitPrice as number;
  if (b.validFrom       !== undefined) d.validFrom       = new Date(String(b.validFrom));
  if (b.validTo         !== undefined) d.validTo         = new Date(String(b.validTo));
  if (b.priceLockedAt   !== undefined) d.priceLockedAt   = new Date(String(b.priceLockedAt));
  if (b.priceLockedById !== undefined) d.priceLockedById = Number(b.priceLockedById);
  if (b.notes           !== undefined) d.notes           = b.notes ? String(b.notes).trim() : null;

  try {
    const line = await prisma.blanketContractLine.update({
      where: { id: lineId },
      data: d as any,
      include: {
        customerItem:  { select: { id: true, code: true, name: true } },
        variant:       { select: { id: true, sku: true, variantDescription: true } },
        priceLockedBy: { select: { id: true, name: true } },
      },
    });
    res.json(line);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Line not found' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/blanket-contracts/:id/lines/:lineId ─────────────
router.delete('/:id/lines/:lineId', async (req, res) => {
  const contractId = parseInt(req.params.id);
  const lineId     = parseInt(req.params.lineId);
  if (isNaN(contractId)) { res.status(400).json({ error: 'Invalid contract ID' }); return; }
  if (isNaN(lineId))     { res.status(400).json({ error: 'Invalid line ID' }); return; }

  try {
    const existing = await prisma.blanketContractLine.findFirst({
      where: { id: lineId, blanketContractId: contractId },
    });
    if (!existing) { res.status(404).json({ error: 'Line not found for this contract' }); return; }

    await prisma.blanketContractLine.delete({ where: { id: lineId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Line not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
