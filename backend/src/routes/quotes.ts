import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { QuoteStatus, Prisma } from '@prisma/client';

const router = Router();

const VALID_STATUSES        = Object.values(QuoteStatus);
const VALID_PRICE_SOURCES   = ['COMPETITOR', 'DISTRIBUTOR', 'UNKNOWN'];
const VALID_QUANTITY_UNITS  = ['M', 'EACH', 'ROLL', 'SHEET', 'BUNDLE', 'PALLET', 'LOT'];

// ── Helper: generate quote number Q-YYMM-NNNN ──────────────────────────────
async function generateQuoteNumber(): Promise<string> {
  const now   = new Date();
  const yy    = String(now.getFullYear()).slice(-2);
  const mm    = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `Q-${yy}${mm}-`;

  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  });

  let seq = 1;
  if (last) {
    const parts = last.quoteNumber.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Helper: auto-create Customer from Party (for prospects) ─────────────────
async function ensureCustomerForParty(partyId: number): Promise<number> {
  const existing = await prisma.customer.findFirst({ where: { partyId } });
  if (existing) return existing.id;

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { roles: true },
  });
  if (!party) throw new Error('Party not found');

  // Generate customer code
  const prefix = party.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const lastCust = await prisma.customer.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  let seq = 1;
  if (lastCust) {
    const num = parseInt(lastCust.code.slice(4), 10);
    if (!isNaN(num)) seq = num + 1;
  }
  const code = `${prefix}${String(seq).padStart(2, '0')}`;

  const customer = await prisma.customer.create({
    data: {
      code,
      name:              party.name,
      partyId:           party.id,
      acquisitionStatus: 'PROSPECT',
    },
  });

  // Ensure Party has CUSTOMER role
  const hasRole = party.roles.some(r => r.roleType === 'CUSTOMER');
  if (!hasRole) {
    await prisma.partyRole.create({
      data: { partyId: party.id, roleType: 'CUSTOMER' },
    }).catch(() => {});
  }

  return customer.id;
}

// ── Shared include for Quote queries ────────────────────────────────────────
const quoteInclude = {
  customer:  { select: { id: true, name: true, code: true, partyId: true, acquisitionStatus: true } },
  createdBy: { select: { id: true, name: true } },
  party:     { select: { id: true, name: true, partyCode: true } },
  salesRep:  { select: { id: true, name: true } },
  items:     {
    include: {
      customerItem: { select: { id: true, code: true, name: true } },
      masterSpec:   { select: { id: true, sku: true, name: true } },
      variant:      { select: { id: true, sku: true, variantDescription: true, boardGradeId: true, flute: true } },
      boardGrade:   { select: { id: true, gradeCode: true, gradeName: true } },
      selectedSupplier: { select: { id: true, name: true } },
    },
    orderBy: { lineNumber: 'asc' as const },
  },
  order: { select: { id: true, orderNumber: true } },
};

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE CRUD
// ─────────────────────────────────────────────────────────────────────────────

// ── LIST quotes (paginated, filterable) ─────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const page  = Math.max(1, parseInt(q.page  ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (q.status && VALID_STATUSES.includes(q.status as QuoteStatus)) where.status = q.status;
    if (q.salesRepId)  where.salesRepId  = parseInt(q.salesRepId, 10);
    if (q.customerId)  where.customerId  = parseInt(q.customerId, 10);
    if (q.search) {
      where.OR = [
        { quoteNumber: { contains: q.search, mode: 'insensitive' } },
        { customer: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {};
      if (q.dateFrom) (where.createdAt as any).gte = new Date(q.dateFrom);
      if (q.dateTo)   (where.createdAt as any).lte = new Date(q.dateTo + 'T23:59:59.999Z');
    }

    const [data, total] = await Promise.all([
      prisma.quote.findMany({
        where: where as any,
        include: {
          customer:  { select: { id: true, name: true, code: true } },
          salesRep:  { select: { id: true, name: true } },
          items:     { select: { id: true, extendedPrice: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quote.count({ where: where as any }),
    ]);

    // Compute total value for each quote
    const rows = data.map(qt => {
      const totalValue = qt.items.reduce((sum, it) => {
        return sum + (it.extendedPrice ? Number(it.extendedPrice) : 0);
      }, 0);
      return {
        ...qt,
        lineCount:  qt.items.length,
        totalValue: Math.round(totalValue * 100) / 100,
      };
    });

    res.json({ data: rows, total, page, limit });
  } catch (err) {
    console.error('GET /quotes', err);
    res.status(500).json({ error: 'Failed to list quotes' });
  }
});

// ── GET single quote ────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });
    if (!row) { res.status(404).json({ error: 'Quote not found' }); return; }

    // Compute total
    const totalValue = row.items.reduce((s, i) => s + (i.extendedPrice ? Number(i.extendedPrice) : 0), 0);
    res.json({ ...row, totalValue: Math.round(totalValue * 100) / 100 });
  } catch (err) {
    console.error('GET /quotes/:id', err);
    res.status(500).json({ error: 'Failed to get quote' });
  }
});

// ── CREATE quote ────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const b    = req.body;
    const user = req.user!;

    // Need either customerId or partyId
    if (!b.customerId && !b.partyId) {
      res.status(400).json({ error: 'customerId or partyId is required' });
      return;
    }

    let customerId = b.customerId ? parseInt(b.customerId, 10) : null;
    const partyId  = b.partyId   ? parseInt(b.partyId, 10)   : null;

    // If only partyId provided, auto-create customer from party
    if (!customerId && partyId) {
      customerId = await ensureCustomerForParty(partyId);
    }

    const quoteNumber = await generateQuoteNumber();

    const row = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId:               customerId!,
        createdById:              user.userId,
        partyId:                  partyId,
        salesRepId:               b.salesRepId ? parseInt(b.salesRepId, 10) : null,
        validUntil:               b.validUntil ? new Date(b.validUntil) : null,
        customerStatedPrice:      b.customerStatedPrice ?? null,
        customerStatedPriceSource: b.customerStatedPriceSource && VALID_PRICE_SOURCES.includes(b.customerStatedPriceSource)
                                    ? b.customerStatedPriceSource : null,
        internalNotes:            b.internalNotes || null,
        notes:                    b.notes || null,
      },
      include: quoteInclude,
    });

    res.status(201).json(row);
  } catch (err: any) {
    console.error('POST /quotes', err);
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// ── UPDATE quote ────────────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b  = req.body;
    const d: Record<string, unknown> = {};

    if (b.salesRepId !== undefined)               d.salesRepId               = b.salesRepId || null;
    if (b.validUntil !== undefined)               d.validUntil               = b.validUntil ? new Date(b.validUntil) : null;
    if (b.customerStatedPrice !== undefined)       d.customerStatedPrice      = b.customerStatedPrice ?? null;
    if (b.customerStatedPriceSource !== undefined) {
      d.customerStatedPriceSource = b.customerStatedPriceSource && VALID_PRICE_SOURCES.includes(b.customerStatedPriceSource)
                                     ? b.customerStatedPriceSource : null;
    }
    if (b.internalNotes !== undefined) d.internalNotes = b.internalNotes || null;
    if (b.notes !== undefined)         d.notes         = b.notes || null;

    const row = await prisma.quote.update({
      where: { id },
      data:  d as any,
      include: quoteInclude,
    });

    const totalValue = row.items.reduce((s, i) => s + (i.extendedPrice ? Number(i.extendedPrice) : 0), 0);
    res.json({ ...row, totalValue: Math.round(totalValue * 100) / 100 });
  } catch (err: any) {
    console.error('PUT /quotes/:id', err);
    if (err.code === 'P2025') { res.status(404).json({ error: 'Quote not found' }); return; }
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// ── DELETE quote (DRAFT only) ───────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qt = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }
    if (qt.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT quotes can be deleted' });
      return;
    }

    await prisma.quote.delete({ where: { id } });
    res.json({ message: 'Quote deleted' });
  } catch (err) {
    console.error('DELETE /quotes/:id', err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE STATUS TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── SEND quote ──────────────────────────────────────────────────────────────
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qt = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }
    if (qt.status !== 'DRAFT' && qt.status !== 'SENT') {
      res.status(400).json({ error: `Cannot send quote in ${qt.status} status` });
      return;
    }

    const row = await prisma.quote.update({
      where: { id },
      data:  { status: 'SENT' },
      include: quoteInclude,
    });
    res.json(row);
  } catch (err) {
    console.error('POST /quotes/:id/send', err);
    res.status(500).json({ error: 'Failed to send quote' });
  }
});

// ── ACCEPT quote ────────────────────────────────────────────────────────────
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qt = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }
    if (qt.status !== 'SENT' && qt.status !== 'UNDER_REVIEW') {
      res.status(400).json({ error: `Cannot accept quote in ${qt.status} status` });
      return;
    }

    const row = await prisma.quote.update({
      where: { id },
      data:  { status: 'ACCEPTED' },
      include: quoteInclude,
    });
    res.json(row);
  } catch (err) {
    console.error('POST /quotes/:id/accept', err);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
});

// ── DECLINE quote ───────────────────────────────────────────────────────────
router.post('/:id/decline', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qt = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }
    if (qt.status !== 'SENT' && qt.status !== 'UNDER_REVIEW') {
      res.status(400).json({ error: `Cannot decline quote in ${qt.status} status` });
      return;
    }

    const row = await prisma.quote.update({
      where: { id },
      data:  { status: 'DECLINED' },
      include: quoteInclude,
    });
    res.json(row);
  } catch (err) {
    console.error('POST /quotes/:id/decline', err);
    res.status(500).json({ error: 'Failed to decline quote' });
  }
});

// ── REOPEN quote as DRAFT ───────────────────────────────────────────────────
router.post('/:id/reopen', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qt = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }
    if (qt.status !== 'DECLINED' && qt.status !== 'EXPIRED') {
      res.status(400).json({ error: `Cannot reopen quote in ${qt.status} status` });
      return;
    }

    const row = await prisma.quote.update({
      where: { id },
      data:  { status: 'DRAFT' },
      include: quoteInclude,
    });
    res.json(row);
  } catch (err) {
    console.error('POST /quotes/:id/reopen', err);
    res.status(500).json({ error: 'Failed to reopen quote' });
  }
});

// ── CONVERT quote to Sales Order ────────────────────────────────────────────
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const id   = parseInt(req.params.id, 10);
    const user = req.user!;

    const qt = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: true,
        customer: { select: { id: true, defaultOverTolerance: true, defaultUnderTolerance: true } },
      },
    });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }
    if (qt.status !== 'ACCEPTED') {
      res.status(400).json({ error: `Only ACCEPTED quotes can be converted. Current status: ${qt.status}` });
      return;
    }

    // Generate SO number
    const now = new Date();
    const soPrefix = `SO-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const lastSo = await prisma.salesOrder.findFirst({
      where: { orderNumber: { startsWith: soPrefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    let soSeq = 1;
    if (lastSo) {
      const num = parseInt(lastSo.orderNumber.split('-')[2], 10);
      if (!isNaN(num)) soSeq = num + 1;
    }
    const orderNumber = `${soPrefix}${String(soSeq).padStart(4, '0')}`;

    // Create Sales Order + items in transaction
    const order = await prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.create({
        data: {
          orderNumber,
          quoteId:     qt.id,
          customerId:  qt.customerId,
          createdById: user.userId,
          status:      'OPEN',
          overTolerance:  qt.customer.defaultOverTolerance,
          underTolerance: qt.customer.defaultUnderTolerance,
        },
      });

      // Create SO line items from quote items
      for (const item of qt.items) {
        await tx.salesOrderItem.create({
          data: {
            orderId:        so.id,
            quoteItemId:    item.id,
            customerItemId: item.customerItemId,
            variantId:      item.variantId,
            lineNumber:     item.lineNumber,
            description:    item.description,
            quantity:        Math.round(Number(item.quantity)),
            unitPrice:      item.unitPrice,
          },
        });
      }

      // Update quote status
      await tx.quote.update({
        where: { id: qt.id },
        data:  { status: 'CONVERTED' },
      });

      return so;
    });

    const result = await prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });

    res.json({ ...result, order: { id: order.id, orderNumber: order.orderNumber } });
  } catch (err) {
    console.error('POST /quotes/:id/convert', err);
    res.status(500).json({ error: 'Failed to convert quote to sales order' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE LINE ITEMS
// ─────────────────────────────────────────────────────────────────────────────

// ── LIST lines for a quote ──────────────────────────────────────────────────
router.get('/:id/lines', async (req: Request, res: Response) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    const lines = await prisma.quoteItem.findMany({
      where: { quoteId },
      include: {
        customerItem:     { select: { id: true, code: true, name: true } },
        masterSpec:       { select: { id: true, sku: true, name: true } },
        variant:          { select: { id: true, sku: true, variantDescription: true } },
        boardGrade:       { select: { id: true, gradeCode: true, gradeName: true } },
        selectedSupplier: { select: { id: true, name: true } },
      },
      orderBy: { lineNumber: 'asc' },
    });
    res.json(lines);
  } catch (err) {
    console.error('GET /quotes/:id/lines', err);
    res.status(500).json({ error: 'Failed to list quote lines' });
  }
});

// ── ADD line to quote ───────────────────────────────────────────────────────
router.post('/:id/lines', async (req: Request, res: Response) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    const b       = req.body;

    // Verify quote exists and is editable
    const qt = await prisma.quote.findUnique({ where: { id: quoteId }, select: { status: true } });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }
    if (qt.status !== 'DRAFT' && qt.status !== 'SENT') {
      res.status(400).json({ error: `Cannot add lines to quote in ${qt.status} status` });
      return;
    }

    if (!b.description || b.quantity == null || b.unitPrice == null) {
      res.status(400).json({ error: 'description, quantity, and unitPrice are required' });
      return;
    }

    // Auto-assign line number
    const maxLine = await prisma.quoteItem.aggregate({
      where: { quoteId },
      _max: { lineNumber: true },
    });
    const lineNumber = (maxLine._max.lineNumber ?? 0) + 1;

    const qty            = Number(b.quantity);
    const unitPrice      = Number(b.unitPrice);
    const extendedPrice  = Math.round(qty * unitPrice * 100) / 100;

    const line = await prisma.quoteItem.create({
      data: {
        quoteId,
        lineNumber,
        customerItemId:           b.customerItemId ? parseInt(b.customerItemId, 10) : null,
        variantId:                b.variantId      ? parseInt(b.variantId, 10)      : null,
        masterSpecId:             b.masterSpecId   ? parseInt(b.masterSpecId, 10)   : null,
        boardGradeId:             b.boardGradeId   ? parseInt(b.boardGradeId, 10)   : null,
        flute:                    b.flute || null,
        description:              b.description,
        quantity:                 b.quantity,
        quantityUnit:             b.quantityUnit && VALID_QUANTITY_UNITS.includes(b.quantityUnit) ? b.quantityUnit : 'EACH',
        unitPrice:                b.unitPrice,
        extendedPrice,
        unitPricePerM:            b.unitPricePerM ?? null,
        notes:                    b.notes || null,
        materialCostPerM:         b.materialCostPerM ?? null,
        bomCostPerM:              b.bomCostPerM ?? null,
        totalCostPerM:            b.totalCostPerM ?? null,
        selectedSupplierId:       b.selectedSupplierId ? parseInt(b.selectedSupplierId, 10) : null,
        materialCostSnapshotDate: b.materialCostPerM ? new Date() : null,
        marginPercent:            b.marginPercent ?? null,
        customerTargetPrice:      b.customerTargetPrice ?? null,
        priceGap:                 b.priceGap ?? null,
        priceGapPercent:          b.priceGapPercent ?? null,
        altQty1:   b.altQty1   ?? null,  altPrice1: b.altPrice1 ?? null,
        altQty2:   b.altQty2   ?? null,  altPrice2: b.altPrice2 ?? null,
        altQty3:   b.altQty3   ?? null,  altPrice3: b.altPrice3 ?? null,
      },
      include: {
        customerItem:     { select: { id: true, code: true, name: true } },
        masterSpec:       { select: { id: true, sku: true, name: true } },
        variant:          { select: { id: true, sku: true, variantDescription: true } },
        boardGrade:       { select: { id: true, gradeCode: true, gradeName: true } },
        selectedSupplier: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(line);
  } catch (err: any) {
    console.error('POST /quotes/:id/lines', err);
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Failed to add quote line' });
  }
});

// ── UPDATE line ─────────────────────────────────────────────────────────────
router.put('/:id/lines/:lid', async (req: Request, res: Response) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    const lineId  = parseInt(req.params.lid, 10);
    const b       = req.body;

    const existing = await prisma.quoteItem.findFirst({
      where: { id: lineId, quoteId },
    });
    if (!existing) { res.status(404).json({ error: 'Quote line not found' }); return; }

    const d: Record<string, unknown> = {};
    if (b.customerItemId !== undefined) d.customerItemId = b.customerItemId ? parseInt(b.customerItemId, 10) : null;
    if (b.variantId !== undefined)      d.variantId      = b.variantId      ? parseInt(b.variantId, 10)      : null;
    if (b.masterSpecId !== undefined)   d.masterSpecId   = b.masterSpecId   ? parseInt(b.masterSpecId, 10)   : null;
    if (b.boardGradeId !== undefined)   d.boardGradeId   = b.boardGradeId   ? parseInt(b.boardGradeId, 10)   : null;
    if (b.flute !== undefined)          d.flute          = b.flute || null;
    if (b.description !== undefined)    d.description    = b.description;
    if (b.quantity !== undefined)        d.quantity       = b.quantity;
    if (b.quantityUnit !== undefined)   d.quantityUnit   = b.quantityUnit;
    if (b.unitPrice !== undefined)      d.unitPrice      = b.unitPrice;
    if (b.unitPricePerM !== undefined)  d.unitPricePerM  = b.unitPricePerM ?? null;
    if (b.notes !== undefined)          d.notes          = b.notes || null;

    // Cost fields
    if (b.materialCostPerM !== undefined) {
      d.materialCostPerM = b.materialCostPerM ?? null;
      d.materialCostSnapshotDate = b.materialCostPerM ? new Date() : null;
    }
    if (b.bomCostPerM !== undefined)    d.bomCostPerM    = b.bomCostPerM ?? null;
    if (b.totalCostPerM !== undefined)  d.totalCostPerM  = b.totalCostPerM ?? null;
    if (b.selectedSupplierId !== undefined) d.selectedSupplierId = b.selectedSupplierId ? parseInt(b.selectedSupplierId, 10) : null;
    if (b.marginPercent !== undefined)      d.marginPercent      = b.marginPercent ?? null;
    if (b.customerTargetPrice !== undefined) d.customerTargetPrice = b.customerTargetPrice ?? null;
    if (b.priceGap !== undefined)           d.priceGap           = b.priceGap ?? null;
    if (b.priceGapPercent !== undefined)    d.priceGapPercent    = b.priceGapPercent ?? null;

    // Alt qtys
    if (b.altQty1 !== undefined)   d.altQty1   = b.altQty1   ?? null;
    if (b.altPrice1 !== undefined) d.altPrice1 = b.altPrice1 ?? null;
    if (b.altQty2 !== undefined)   d.altQty2   = b.altQty2   ?? null;
    if (b.altPrice2 !== undefined) d.altPrice2 = b.altPrice2 ?? null;
    if (b.altQty3 !== undefined)   d.altQty3   = b.altQty3   ?? null;
    if (b.altPrice3 !== undefined) d.altPrice3 = b.altPrice3 ?? null;

    // Recalculate extended price
    const qty   = b.quantity  !== undefined ? Number(b.quantity)  : Number(existing.quantity);
    const price = b.unitPrice !== undefined ? Number(b.unitPrice) : Number(existing.unitPrice);
    d.extendedPrice = Math.round(qty * price * 100) / 100;

    const line = await prisma.quoteItem.update({
      where: { id: lineId },
      data:  d as any,
      include: {
        customerItem:     { select: { id: true, code: true, name: true } },
        masterSpec:       { select: { id: true, sku: true, name: true } },
        variant:          { select: { id: true, sku: true, variantDescription: true } },
        boardGrade:       { select: { id: true, gradeCode: true, gradeName: true } },
        selectedSupplier: { select: { id: true, name: true } },
      },
    });

    res.json(line);
  } catch (err: any) {
    console.error('PUT /quotes/:id/lines/:lid', err);
    if (err.code === 'P2025') { res.status(404).json({ error: 'Quote line not found' }); return; }
    res.status(500).json({ error: 'Failed to update quote line' });
  }
});

// ── DELETE line ──────────────────────────────────────────────────────────────
router.delete('/:id/lines/:lid', async (req: Request, res: Response) => {
  try {
    const quoteId = parseInt(req.params.id, 10);
    const lineId  = parseInt(req.params.lid, 10);

    const existing = await prisma.quoteItem.findFirst({ where: { id: lineId, quoteId } });
    if (!existing) { res.status(404).json({ error: 'Quote line not found' }); return; }

    await prisma.quoteItem.delete({ where: { id: lineId } });
    res.json({ message: 'Quote line deleted' });
  } catch (err) {
    console.error('DELETE /quotes/:id/lines/:lid', err);
    res.status(500).json({ error: 'Failed to delete quote line' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INTELLIGENCE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Customer intelligence ───────────────────────────────────────────────────
router.get('/intelligence/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        party: { include: { roles: true, contacts: { where: { isActive: true } } } },
        defaultSalesRep: { select: { id: true, name: true } },
      },
    });
    if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }

    // Open quotes
    const openQuotes = await prisma.quote.findMany({
      where: { customerId, status: { in: ['DRAFT', 'SENT', 'UNDER_REVIEW'] } },
      select: { id: true, quoteNumber: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Active orders
    const activeOrders = await prisma.salesOrder.findMany({
      where: { customerId, status: { in: ['OPEN', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED'] } },
      select: { id: true, orderNumber: true, status: true, items: { select: { quantity: true, unitPrice: true } } },
    });
    const activeOrdersValue = activeOrders.reduce((sum, o) =>
      sum + o.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0), 0);

    // Customer items
    const customerItems = await prisma.customerItem.findMany({
      where: { customerId, isActive: true },
      select: { id: true, code: true, name: true, masterSpecId: true },
      take: 20,
    });

    const isProspect = customer.acquisitionStatus === 'PROSPECT' ||
                       customer.acquisitionStatus === 'QUOTED';

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        code: customer.code,
        acquisitionStatus: customer.acquisitionStatus,
        accountPotentialRating: customer.accountPotentialRating,
        competitorName: customer.competitorName,
        competitorRelationship: customer.competitorRelationship,
        estimatedAnnualSpend: customer.estimatedAnnualSpend,
        otherProductsNeeded: customer.otherProductsNeeded,
        currentSupplierNotes: customer.currentSupplierNotes,
        salesRep: customer.defaultSalesRep,
      },
      isProspect,
      openQuotes,
      activeOrders: activeOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, status: o.status })),
      activeOrdersValue: Math.round(activeOrdersValue * 100) / 100,
      ytdRevenue: 0, // Placeholder until invoicing is built
      customerItems,
      contacts: customer.party?.contacts ?? [],
    });
  } catch (err) {
    console.error('GET /quotes/intelligence/customer/:id', err);
    res.status(500).json({ error: 'Failed to get customer intelligence' });
  }
});

// ── Spec intelligence ───────────────────────────────────────────────────────
router.get('/intelligence/spec', async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const masterSpecId = q.masterSpecId ? parseInt(q.masterSpecId, 10) : null;
    const variantId    = q.variantId    ? parseInt(q.variantId, 10)    : null;
    const locationId   = q.locationId   ? parseInt(q.locationId, 10)  : null;

    const result: Record<string, unknown> = {
      otherCustomers: [],
      openOrdersWithSameSpec: [],
      equipmentCapability: [],
      materialAvailability: null,
    };

    if (masterSpecId) {
      // Other customers using this spec
      const customerItems = await prisma.customerItem.findMany({
        where: { masterSpecId, isActive: true },
        include: { customer: { select: { id: true, name: true, code: true } } },
      });
      result.otherCustomers = customerItems.map(ci => ({
        customerItemId: ci.id,
        customerName:   ci.customer.name,
        customerCode:   ci.customer.code,
        itemCode:       ci.code,
      }));

      // Open orders with same spec
      const openOrders = await prisma.salesOrderItem.findMany({
        where: {
          variant: { masterSpecId },
          order:   { status: { in: ['OPEN', 'IN_PRODUCTION'] } },
        },
        include: {
          order: { select: { orderNumber: true, status: true, customer: { select: { name: true } } } },
        },
        take: 10,
      });
      result.openOrdersWithSameSpec = openOrders.map(oi => ({
        orderNumber:  oi.order.orderNumber,
        orderStatus:  oi.order.status,
        customerName: oi.order.customer.name,
        quantity:     oi.quantity,
      }));
    }

    if (variantId) {
      // Equipment capability check — get blank width from variant's blankSpec
      const blankSpec = await prisma.blankSpec.findFirst({ where: { variantId } });
      if (blankSpec) {
        const blankWidth = Number(blankSpec.blankWidthInches);
        // Find resources that can handle this width
        const resources = await prisma.resource.findMany({
          where: {
            isActive: true,
            maxSheetWidth: { gte: blankWidth },
          },
          select: {
            id: true, name: true,
            maxSheetWidth: true, minSheetWidth: true,
            location: { select: { id: true, name: true } },
          },
        });
        result.equipmentCapability = resources.map(r => ({
          id:            r.id,
          name:          r.name,
          maxSheetWidth: r.maxSheetWidth,
          minSheetWidth: r.minSheetWidth,
          location:      r.location.name,
        }));

        // Material availability — check board material inventory
        if (blankSpec.materialId && locationId) {
          const inv = await prisma.materialInventory.findFirst({
            where: { materialId: blankSpec.materialId, locationId },
          });
          const committed = await prisma.quoteItem.aggregate({
            where: {
              variant: { blankSpec: { materialId: blankSpec.materialId } },
              quote: { status: { in: ['SENT', 'UNDER_REVIEW', 'ACCEPTED'] } },
            },
            _sum: { quantity: true },
          });
          result.materialAvailability = {
            materialId:  blankSpec.materialId,
            boardGrade:  blankSpec.boardGrade,
            flute:       blankSpec.flute,
            onHand:      inv ? Number(inv.quantity) : 0,
            committed:   committed._sum.quantity ? Number(committed._sum.quantity) : 0,
            available:   (inv ? Number(inv.quantity) : 0) - (committed._sum.quantity ? Number(committed._sum.quantity) : 0),
          };
        }
      }
    }

    res.json(result);
  } catch (err) {
    console.error('GET /quotes/intelligence/spec', err);
    res.status(500).json({ error: 'Failed to get spec intelligence' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

// ── Helper: look up board price ─────────────────────────────────────────────
async function lookupBoardPrice(
  boardGradeId: number,
  flute: string | null,
  supplierId: number | null,
  locationId: number | null,
  msf: number,
): Promise<{ pricePerMsf: number; source: 'BOARD_PRICE' | 'MANUAL' } | null> {
  const now = new Date();

  // Build where conditions
  const where: any = {
    boardGradeId,
    isActive: true,
    effectiveDate: { lte: now },
    OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
  };

  if (supplierId) where.supplierId = supplierId;

  // Search for location-specific first, then generic
  const prices = await prisma.boardPrice.findMany({
    where,
    orderBy: [
      { deliveryLocationId: 'desc' }, // non-null (specific) first
      { effectiveDate: 'desc' },
    ],
  });

  // Filter: prefer location-specific, then flute-specific, then generic
  let best = null;
  for (const p of prices) {
    // Location filter
    if (locationId && p.deliveryLocationId && p.deliveryLocationId !== locationId) continue;
    // Flute filter
    if (flute && p.flute && p.flute !== flute) continue;

    // Prefer: location-specific + flute-specific > location-specific > flute-specific > generic
    if (!best) { best = p; continue; }

    const bestScore = (best.deliveryLocationId ? 2 : 0) + (best.flute ? 1 : 0);
    const pScore    = (p.deliveryLocationId ? 2 : 0) + (p.flute ? 1 : 0);
    if (pScore > bestScore) best = p;
  }

  if (!best) return null;

  // Determine tier price
  let pricePerMsf: number;
  if (msf <= Number(best.tier1MaxMsf)) pricePerMsf = Number(best.tier1Price);
  else if (msf <= Number(best.tier2MaxMsf)) pricePerMsf = Number(best.tier2Price);
  else if (msf <= Number(best.tier3MaxMsf)) pricePerMsf = Number(best.tier3Price);
  else pricePerMsf = Number(best.tier4Price);

  return { pricePerMsf, source: 'BOARD_PRICE' };
}

// ── Helper: look up upcharges ───────────────────────────────────────────────
async function lookupUpcharges(supplierId: number, msf: number): Promise<number> {
  const now = new Date();
  const upcharges = await prisma.boardUpcharge.findMany({
    where: {
      supplierId,
      isActive: true,
      effectiveDate: { lte: now },
      OR: [{ minMsf: null }, { minMsf: { lte: msf } }],
    },
  });

  let total = 0;
  for (const u of upcharges) {
    if (u.chargeType === 'PER_MSF') total += Number(u.amount);
    // FLAT_SETUP handled separately at order level
  }
  return total;
}

// ── CALCULATE PRICE endpoint ────────────────────────────────────────────────
router.post('/calculate-price', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const variantId  = b.variantId  ? parseInt(b.variantId, 10)  : null;
    const qty        = b.qty        ? Number(b.qty)              : 0;
    const locationId = b.locationId ? parseInt(b.locationId, 10) : null;
    const supplierId = b.supplierId ? parseInt(b.supplierId, 10) : null;
    const targetMargin = b.targetMargin ? Number(b.targetMargin) / 100 : 0.30;

    if (!variantId || !qty) {
      res.status(400).json({ error: 'variantId and qty are required' });
      return;
    }

    // Get variant + blank spec
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        blankSpec:  true,
        boardGrade: true,
        bomLines:   { include: { material: { select: { defaultCost: true } } } },
      },
    });
    if (!variant) { res.status(404).json({ error: 'Variant not found' }); return; }

    const result: Record<string, unknown> = {
      variantId,
      qty,
      materialCostPerM: null,
      bomCostPerM: null,
      totalCostPerM: null,
      suggestedPrice: null,
      marginAtSuggested: null,
      costSource: 'MANUAL',
      altPrices: [],
    };

    // Calculate MSF for the primary quantity
    if (variant.blankSpec) {
      const bs = variant.blankSpec;
      const blankL = Number(bs.blankLengthInches);
      const blankW = Number(bs.blankWidthInches);
      const outsPerSheet = bs.outsPerSheet || 1;
      const sheetsPerBox = Number(bs.sheetsPerBox) || 1;

      // MSF = (blankL × blankW × qty) ÷ 1,000,000 adjusted for outs
      // Each box needs (sheetsPerBox / outsPerSheet) sheets
      // Each sheet is blankL × blankW sq inches
      // MSF = sheets × blankL × blankW / 1,000,000
      const sheetsNeeded = (qty * sheetsPerBox) / outsPerSheet;
      const msf = (sheetsNeeded * blankL * blankW) / 1000000;

      // Look up board price
      const boardGradeId = variant.boardGradeId;
      const flute = variant.flute || (bs.flute as string);

      let materialCostPerMsf = 0;
      let costSource = 'MANUAL';

      if (boardGradeId) {
        const priceLookup = await lookupBoardPrice(boardGradeId, flute, supplierId, locationId, msf);
        if (priceLookup) {
          materialCostPerMsf = priceLookup.pricePerMsf;
          costSource = priceLookup.source;

          // Add upcharges
          if (supplierId) {
            const upcharge = await lookupUpcharges(supplierId, msf);
            materialCostPerMsf += upcharge;
          }
        }
      }

      // Material cost per M (thousand boxes)
      const msfPerM = (1000 * sheetsPerBox * blankL * blankW) / (outsPerSheet * 1000000);
      const materialCostPerM = materialCostPerMsf * msfPerM;

      result.materialCostPerM = Math.round(materialCostPerM * 100) / 100;
      result.costSource = costSource;
      result.msf = Math.round(msf * 100) / 100;
      result.msfPerM = Math.round(msfPerM * 100) / 100;

      // Calculate alt qty prices
      const altQtys = [b.altQty1, b.altQty2, b.altQty3].filter(Boolean).map(Number);
      const altPrices: any[] = [];

      for (const aq of altQtys) {
        const altSheetsNeeded = (aq * sheetsPerBox) / outsPerSheet;
        const altMsf = (altSheetsNeeded * blankL * blankW) / 1000000;

        let altMatCost = 0;
        if (boardGradeId) {
          const altLookup = await lookupBoardPrice(boardGradeId, flute, supplierId, locationId, altMsf);
          if (altLookup) {
            altMatCost = altLookup.pricePerMsf;
            if (supplierId) {
              altMatCost += await lookupUpcharges(supplierId, altMsf);
            }
          }
        }

        const altMatCostPerM = altMatCost * msfPerM;
        altPrices.push({
          qty: aq,
          msf: Math.round(altMsf * 100) / 100,
          materialCostPerM: Math.round(altMatCostPerM * 100) / 100,
        });
      }
      result.altPrices = altPrices;
    }

    // BOM cost per M — sum all BOM lines
    let bomCostPerM = 0;
    for (const bom of variant.bomLines) {
      const unitCost = bom.material.defaultCost ? Number(bom.material.defaultCost) : 0;
      bomCostPerM += Number(bom.quantityPer) * unitCost * 1000; // per M = per 1000
    }
    result.bomCostPerM = Math.round(bomCostPerM * 100) / 100;

    // Total cost per M
    const matCost   = Number(result.materialCostPerM) || 0;
    const totalCost = matCost + bomCostPerM;
    result.totalCostPerM = Math.round(totalCost * 100) / 100;

    // Suggested price
    if (totalCost > 0) {
      const suggestedPrice = totalCost / (1 - targetMargin);
      result.suggestedPrice = Math.round(suggestedPrice * 100) / 100;
      result.marginAtSuggested = Math.round(targetMargin * 100 * 100) / 100;
    }

    // Add alt prices with BOM cost included
    if (Array.isArray(result.altPrices)) {
      (result.altPrices as any[]).forEach(ap => {
        ap.totalCostPerM = Math.round((ap.materialCostPerM + bomCostPerM) * 100) / 100;
        if (ap.totalCostPerM > 0) {
          ap.suggestedPrice = Math.round(ap.totalCostPerM / (1 - targetMargin) * 100) / 100;
        }
      });
    }

    res.json(result);
  } catch (err) {
    console.error('POST /quotes/calculate-price', err);
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH (for typeahead in quote builder)
// ─────────────────────────────────────────────────────────────────────────────

// ── Search parties (customers + prospects) ──────────────────────────────────
router.get('/search/parties', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) ?? '';
    if (search.length < 1) { res.json([]); return; }

    const parties = await prisma.party.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { partyCode: { contains: search, mode: 'insensitive' } },
        ],
      },
      include: {
        roles:     { select: { roleType: true, isActive: true } },
        customers: { select: { id: true, code: true, acquisitionStatus: true, accountPotentialRating: true } },
      },
      take: 15,
      orderBy: { name: 'asc' },
    });

    res.json(parties);
  } catch (err) {
    console.error('GET /quotes/search/parties', err);
    res.status(500).json({ error: 'Failed to search parties' });
  }
});

// ── Search specs (MasterSpec, CustomerItem) ─────────────────────────────────
router.get('/search/specs', async (req: Request, res: Response) => {
  try {
    const search     = (req.query.search as string) ?? '';
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string, 10) : null;
    if (search.length < 1) { res.json({ masterSpecs: [], customerItems: [] }); return; }

    const masterSpecs = await prisma.masterSpec.findMany({
      where: {
        isActive: true,
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      include: {
        boxSpec:       true,
        variants:      { where: { isActive: true }, take: 5, include: { boardGrade: { select: { gradeCode: true } }, blankSpec: true } },
        customerItems: { where: { isActive: true }, select: { id: true, code: true, customerId: true, customer: { select: { name: true } } } },
      },
      take: 10,
      orderBy: { name: 'asc' },
    });

    let customerItems: any[] = [];
    if (customerId) {
      customerItems = await prisma.customerItem.findMany({
        where: {
          customerId,
          isActive: true,
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { partNumber: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          masterSpec: { select: { id: true, sku: true, name: true } },
          variant:    { select: { id: true, sku: true, boardGradeId: true, flute: true, boardGrade: { select: { gradeCode: true } } } },
        },
        take: 10,
      });
    }

    res.json({ masterSpecs, customerItems });
  } catch (err) {
    console.error('GET /quotes/search/specs', err);
    res.status(500).json({ error: 'Failed to search specs' });
  }
});

// ── Users list (for sales rep dropdown) ─────────────────────────────────────
router.get('/lookup/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('GET /quotes/lookup/users', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATION
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qt = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        salesRep: { select: { name: true } },
        items: {
          include: {
            boardGrade: { select: { gradeCode: true } },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });
    if (!qt) { res.status(404).json({ error: 'Quote not found' }); return; }

    // Generate PDF using simple text-based approach (no pdfkit dependency needed)
    // Return JSON with PDF-ready data that frontend will render
    const pdfData = {
      companyName: 'BoxERP Manufacturing Co.',
      title: 'QUOTATION',
      quoteNumber: qt.quoteNumber,
      date: qt.createdAt.toISOString().split('T')[0],
      validUntil: qt.validUntil ? qt.validUntil.toISOString().split('T')[0] : 'N/A',
      salesRep: qt.salesRep?.name ?? 'N/A',
      billTo: {
        name: qt.customer.name,
        street: qt.customer.street ?? '',
        city: qt.customer.city ?? '',
        state: qt.customer.state ?? '',
        zip: qt.customer.zip ?? '',
      },
      lines: qt.items.map(item => ({
        lineNumber: item.lineNumber,
        description: item.description,
        boardGrade: item.boardGrade?.gradeCode ?? item.flute ?? '',
        quantity: Number(item.quantity),
        unit: item.quantityUnit ?? 'EACH',
        unitPrice: Number(item.unitPrice),
        extendedPrice: Number(item.extendedPrice ?? 0),
        altQty1: item.altQty1 ? Number(item.altQty1) : null,
        altPrice1: item.altPrice1 ? Number(item.altPrice1) : null,
        altQty2: item.altQty2 ? Number(item.altQty2) : null,
        altPrice2: item.altPrice2 ? Number(item.altPrice2) : null,
        altQty3: item.altQty3 ? Number(item.altQty3) : null,
        altPrice3: item.altPrice3 ? Number(item.altPrice3) : null,
        notes: item.notes,
      })),
      subtotal: qt.items.reduce((s, i) => s + Number(i.extendedPrice ?? 0), 0),
      notes: qt.notes ?? '',
      terms: 'Standard terms and conditions apply. Prices valid for the period indicated above. Quantities subject to standard manufacturing tolerances.',
    };

    res.json(pdfData);
  } catch (err) {
    console.error('GET /quotes/:id/pdf', err);
    res.status(500).json({ error: 'Failed to generate PDF data' });
  }
});

export default router;
