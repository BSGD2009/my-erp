import { Router } from 'express';
import { FulfillmentPath, PrintPlateStatus } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_FULFILLMENT_PATHS = Object.values(FulfillmentPath);
const VALID_PRINT_PLATE_STATUSES = Object.values(PrintPlateStatus);

// Auto-generate code from name: first 4 letters + 2-digit number
async function generateCode(name: string): Promise<string> {
  const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  for (let i = 1; i <= 99; i++) {
    const code = `${prefix}${String(i).padStart(2, '0')}`;
    const exists = await prisma.customerItem.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `${prefix}${Date.now() % 1000}`;
}

// ── GET /api/protected/customer-items ───────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, customerId, masterSpecId, fulfillmentPath,
          page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (customerId)   where.customerId   = parseInt(customerId);
  if (masterSpecId) where.masterSpecId = parseInt(masterSpecId);
  if (fulfillmentPath && VALID_FULFILLMENT_PATHS.includes(fulfillmentPath as FulfillmentPath)) {
    where.fulfillmentPath = fulfillmentPath as FulfillmentPath;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customerItem.findMany({
      where,
      orderBy: [{ customer: { name: 'asc' } }, { name: 'asc' }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        customer:   { select: { id: true, code: true, name: true } },
        masterSpec: { select: { id: true, sku: true, name: true } },
        variant:    { select: { id: true, sku: true, variantDescription: true } },
      },
    }),
    prisma.customerItem.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/customer-items/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const customerItem = await prisma.customerItem.findUnique({
    where: { id },
    include: {
      customer:   { select: { id: true, code: true, name: true } },
      masterSpec: { select: { id: true, sku: true, name: true } },
      variant:    { select: { id: true, sku: true, variantDescription: true } },
      tooling:    {
        select: { id: true, toolNumber: true, type: true, description: true, condition: true },
        orderBy: { toolNumber: 'asc' },
      },
    },
  });
  if (!customerItem) { res.status(404).json({ error: 'Customer item not found' }); return; }
  res.json(customerItem);
});

// ── POST /api/protected/customer-items ──────────────────────────────────────
router.post('/', async (req, res) => {
  const { code, name, description, customerId, masterSpecId, variantId,
          listPrice, fulfillmentPath, partNumber, printPlateStatus,
          printPlateExpectedDate, printPlateRequired } = req.body as Record<string, unknown>;

  if (!String(name       ?? '').trim()) { res.status(400).json({ error: 'name is required' });       return; }
  if (customerId == null)               { res.status(400).json({ error: 'customerId is required' }); return; }
  if (variantId == null)                { res.status(400).json({ error: 'variantId is required' });  return; }

  // Validate variant exists and belongs to masterSpec if provided
  const variant = await prisma.productVariant.findUnique({ where: { id: Number(variantId) }, select: { id: true, masterSpecId: true } });
  if (!variant) { res.status(400).json({ error: 'Variant not found' }); return; }
  if (masterSpecId != null && variant.masterSpecId !== Number(masterSpecId)) {
    res.status(400).json({ error: 'Variant does not belong to the specified master spec' }); return;
  }

  if (fulfillmentPath !== undefined && !VALID_FULFILLMENT_PATHS.includes(fulfillmentPath as FulfillmentPath)) {
    res.status(400).json({ error: `fulfillmentPath must be one of: ${VALID_FULFILLMENT_PATHS.join(', ')}` }); return;
  }
  if (printPlateStatus !== undefined && !VALID_PRINT_PLATE_STATUSES.includes(printPlateStatus as PrintPlateStatus)) {
    res.status(400).json({ error: `printPlateStatus must be one of: ${VALID_PRINT_PLATE_STATUSES.join(', ')}` }); return;
  }

  const finalCode = code && String(code).trim()
    ? String(code).trim().toUpperCase()
    : await generateCode(String(name));

  try {
    const customerItem = await prisma.customerItem.create({
      data: {
        code:            finalCode,
        name:            String(name).trim(),
        description:     description     != null ? String(description).trim()     : null,
        customerId:      Number(customerId),
        masterSpecId:    masterSpecId    != null ? Number(masterSpecId)            : null,
        variantId:       Number(variantId),
        listPrice:       listPrice       != null ? (listPrice as string | number) : null,
        fulfillmentPath:     (fulfillmentPath as FulfillmentPath | undefined) ?? 'MANUFACTURE',
        partNumber:             partNumber            ? String(partNumber).trim()           : null,
        printPlateStatus:       (printPlateStatus as PrintPlateStatus | undefined) ?? 'NO_PRINT_NEEDED',
        printPlateExpectedDate: printPlateExpectedDate ? new Date(String(printPlateExpectedDate)) : null,
        printPlateRequired:     printPlateRequired     ? Boolean(printPlateRequired)          : false,
      },
      include: {
        customer:   { select: { id: true, code: true, name: true } },
        masterSpec: { select: { id: true, sku: true, name: true } },
      },
    });
    res.status(201).json(customerItem);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A customer item with that code already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Customer, master spec, or variant not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/customer-items/:id ───────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { code, name, description, customerId, masterSpecId, variantId,
          listPrice, fulfillmentPath, isActive, partNumber, printPlateStatus,
          printPlateExpectedDate, printPlateRequired } = req.body as Record<string, unknown>;

  if (fulfillmentPath !== undefined && !VALID_FULFILLMENT_PATHS.includes(fulfillmentPath as FulfillmentPath)) {
    res.status(400).json({ error: `fulfillmentPath must be one of: ${VALID_FULFILLMENT_PATHS.join(', ')}` }); return;
  }
  if (printPlateStatus !== undefined && !VALID_PRINT_PLATE_STATUSES.includes(printPlateStatus as PrintPlateStatus)) {
    res.status(400).json({ error: `printPlateStatus must be one of: ${VALID_PRINT_PLATE_STATUSES.join(', ')}` }); return;
  }

  // Validate variant-masterSpec consistency if changing either
  if (variantId !== undefined) {
    const vId = Number(variantId);
    const v = await prisma.productVariant.findUnique({ where: { id: vId }, select: { masterSpecId: true } });
    if (!v) { res.status(400).json({ error: 'Variant not found' }); return; }
    const msId = masterSpecId !== undefined ? (masterSpecId != null ? Number(masterSpecId) : null) : undefined;
    if (msId != null && v.masterSpecId !== msId) {
      res.status(400).json({ error: 'Variant does not belong to the specified master spec' }); return;
    }
  }

  const d: Record<string, unknown> = {};
  if (code            !== undefined) d.code            = String(code).trim().toUpperCase();
  if (name            !== undefined) d.name            = String(name).trim();
  if (description     !== undefined) d.description     = description     != null ? String(description).trim()     : null;
  if (customerId      !== undefined) d.customerId      = Number(customerId);
  if (masterSpecId    !== undefined) d.masterSpecId    = masterSpecId    != null ? Number(masterSpecId)            : null;
  if (variantId       !== undefined) d.variantId       = Number(variantId);
  if (listPrice       !== undefined) d.listPrice       = listPrice       != null ? (listPrice as string | number) : null;
  if (fulfillmentPath !== undefined) d.fulfillmentPath = fulfillmentPath as FulfillmentPath;
  if (isActive        !== undefined) d.isActive        = Boolean(isActive);
  if (partNumber             !== undefined) d.partNumber             = partNumber ? String(partNumber).trim() : null;
  if (printPlateStatus       !== undefined) d.printPlateStatus       = printPlateStatus as string;
  if (printPlateExpectedDate !== undefined) d.printPlateExpectedDate = printPlateExpectedDate ? new Date(String(printPlateExpectedDate)) : null;
  if (printPlateRequired     !== undefined) d.printPlateRequired     = Boolean(printPlateRequired);

  try {
    const customerItem = await prisma.customerItem.update({
      where: { id },
      data:  d as any,
      include: {
        customer:   { select: { id: true, code: true, name: true } },
        masterSpec: { select: { id: true, sku: true, name: true } },
      },
    });
    res.json(customerItem);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Customer item not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Code already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Customer, master spec, or variant not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/customer-items/:id (soft delete) ──────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.customerItem.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Customer item not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
