import { Router } from 'express';
import { TransferStatus } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/inventory/materials ────────────────────────────────────
// Material inventory across all locations (or filtered by materialId / locationId).
router.get('/materials', async (req, res) => {
  const { materialId, locationId } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (materialId) where.materialId = parseInt(materialId);
  if (locationId) where.locationId = parseInt(locationId);

  const rows = await prisma.materialInventory.findMany({
    where,
    include: {
      material: { select: { id: true, code: true, name: true, unitOfMeasure: true, materialType: { select: { id: true, typeKey: true, typeName: true } } } },
      location: { select: { id: true, name: true } },
    },
    orderBy: [{ material: { name: 'asc' } }, { location: { name: 'asc' } }],
  });

  // Group by material for the "totals across locations" view
  const byMaterial: Record<number, { material: any; totalQty: number; locations: any[] }> = {};
  for (const row of rows) {
    if (!byMaterial[row.materialId]) {
      byMaterial[row.materialId] = { material: row.material, totalQty: 0, locations: [] };
    }
    const qty = Number(row.quantity);
    byMaterial[row.materialId].totalQty += qty;
    byMaterial[row.materialId].locations.push({
      locationId: row.locationId,
      location:   row.location,
      quantity:   qty,
      avgCost:    row.avgCost,
    });
  }

  res.json({ rows, byMaterial: Object.values(byMaterial) });
});

// ── GET /api/protected/inventory/finished-goods ───────────────────────────────
// Finished goods inventory across all locations.
router.get('/finished-goods', async (req, res) => {
  const { masterSpecId, locationId } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (masterSpecId) where.masterSpecId = parseInt(masterSpecId);
  if (locationId) where.locationId = parseInt(locationId);

  const rows = await prisma.finishedGoodsInventory.findMany({
    where,
    include: {
      masterSpec: { select: { id: true, sku: true, name: true } },
      variant:    { select: { id: true, sku: true, variantDescription: true } },
      location:   { select: { id: true, name: true } },
    },
    orderBy: [{ masterSpec: { name: 'asc' } }, { location: { name: 'asc' } }],
  });

  const totalQty = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
  res.json({ rows, totalQty });
});

// ── GET /api/protected/inventory/transfers ────────────────────────────────────
router.get('/transfers', async (req, res) => {
  const { status, materialId, masterSpecId, fromLocationId, toLocationId,
          page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {};
  if (status && Object.values(TransferStatus).includes(status as TransferStatus))
    where.status = status as TransferStatus;
  if (materialId)     where.materialId     = parseInt(materialId);
  if (masterSpecId)   where.masterSpecId   = parseInt(masterSpecId);
  if (fromLocationId) where.fromLocationId = parseInt(fromLocationId);
  if (toLocationId)   where.toLocationId   = parseInt(toLocationId);

  const [data, total] = await Promise.all([
    prisma.inventoryTransfer.findMany({
      where,
      orderBy: { transferredAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        material:        { select: { id: true, code: true, name: true } },
        masterSpec:      { select: { id: true, sku: true, name: true } },
        materialVariant: { select: { id: true, variantCode: true, description: true } },
        fromLocation:    { select: { id: true, name: true } },
        toLocation:      { select: { id: true, name: true } },
        transferredBy:   { select: { id: true, name: true } },
      },
    }),
    prisma.inventoryTransfer.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── POST /api/protected/inventory/transfers ───────────────────────────────────
// Creates a transfer record and (when status = COMPLETED) adjusts inventory.
router.post('/transfers', async (req, res) => {
  const {
    materialId, masterSpecId, variantId,
    fromLocationId, toLocationId,
    quantity, notes, status,
  } = req.body as Record<string, unknown>;

  if (!fromLocationId) { res.status(400).json({ error: 'fromLocationId is required' }); return; }
  if (!toLocationId)   { res.status(400).json({ error: 'toLocationId is required' });   return; }
  if (quantity == null) { res.status(400).json({ error: 'quantity is required' });       return; }
  if (!materialId && !masterSpecId) {
    res.status(400).json({ error: 'Either materialId or masterSpecId is required' }); return;
  }
  if (Number(fromLocationId) === Number(toLocationId)) {
    res.status(400).json({ error: 'fromLocationId and toLocationId must be different' }); return;
  }

  const userId = (req as any).user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const transferStatus = status && Object.values(TransferStatus).includes(status as TransferStatus)
    ? (status as TransferStatus) : 'PENDING';

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      const t = await tx.inventoryTransfer.create({
        data: {
          materialId:      materialId   != null ? Number(materialId)   : null,
          masterSpecId:    masterSpecId != null ? Number(masterSpecId) : null,
          variantId:       variantId    != null ? Number(variantId)    : null,
          fromLocationId:  Number(fromLocationId),
          toLocationId:    Number(toLocationId),
          quantity:        quantity as string | number,
          transferredById: userId,
          transferredAt:   new Date(),
          notes:           notes != null ? String(notes).trim() : null,
          status:          transferStatus,
        },
        include: {
          material:      { select: { id: true, code: true, name: true } },
          masterSpec:    { select: { id: true, sku: true, name: true } },
          fromLocation:  { select: { id: true, name: true } },
          toLocation:    { select: { id: true, name: true } },
          transferredBy: { select: { id: true, name: true } },
        },
      });

      // If completing immediately, adjust inventory
      if (transferStatus === 'COMPLETED') {
        await applyTransfer(tx, t);
      }

      return t;
    });

    res.status(201).json(transfer);
  } catch (err: any) {
    if (err.message?.startsWith('INSUF:')) {
      res.status(400).json({ error: err.message.replace('INSUF:', '').trim() }); return;
    }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Referenced record not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/inventory/transfers/:id ────────────────────────────────
// Primary use: mark a PENDING transfer as COMPLETED or CANCELLED.
router.put('/transfers/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { status, notes } = req.body as Record<string, unknown>;

  if (!status || !Object.values(TransferStatus).includes(status as TransferStatus)) {
    res.status(400).json({ error: `status must be one of: ${Object.values(TransferStatus).join(', ')}` }); return;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryTransfer.findUnique({ where: { id } });
      if (!existing) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
      if (existing.status === 'COMPLETED') throw new Error('INSUF:Transfer is already completed');
      if (existing.status === 'CANCELLED') throw new Error('INSUF:Transfer is cancelled');

      const t = await tx.inventoryTransfer.update({
        where: { id },
        data:  {
          status: status as TransferStatus,
          notes:  notes != null ? String(notes).trim() : existing.notes,
        } as any,
        include: {
          material:      { select: { id: true, code: true, name: true } },
          masterSpec:    { select: { id: true, sku: true, name: true } },
          fromLocation:  { select: { id: true, name: true } },
          toLocation:    { select: { id: true, name: true } },
          transferredBy: { select: { id: true, name: true } },
        },
      });

      if (status === 'COMPLETED') {
        await applyTransfer(tx, t);
      }

      return t;
    });

    res.json(updated);
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: 'Transfer not found' }); return; }
    if (err.message?.startsWith('INSUF:')) {
      res.status(400).json({ error: err.message.replace('INSUF:', '').trim() }); return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: apply a completed transfer — moves qty from → to location
// ─────────────────────────────────────────────────────────────────────────────
async function applyTransfer(tx: any, transfer: any) {
  const qty = Number(transfer.quantity);

  if (transfer.materialId) {
    // ── Raw material transfer ──
    const fromRow = await tx.materialInventory.findUnique({
      where: { materialId_locationId: { materialId: transfer.materialId, locationId: transfer.fromLocationId } },
    });

    if (!fromRow || Number(fromRow.quantity) < qty) {
      throw new Error(`INSUF:Insufficient quantity at origin location (have ${fromRow ? Number(fromRow.quantity) : 0})`);
    }

    const fromCost = Number(fromRow.avgCost);

    // Deduct from origin
    await tx.materialInventory.update({
      where: { materialId_locationId: { materialId: transfer.materialId, locationId: transfer.fromLocationId } },
      data:  { quantity: { decrement: qty } },
    });

    // Add to destination (upsert — create row if first time)
    const toRow = await tx.materialInventory.findUnique({
      where: { materialId_locationId: { materialId: transfer.materialId, locationId: transfer.toLocationId } },
    });

    if (toRow) {
      const existingQty  = Number(toRow.quantity);
      const existingCost = Number(toRow.avgCost);
      // Weighted average cost
      const newQty  = existingQty + qty;
      const newCost = newQty > 0 ? ((existingQty * existingCost) + (qty * fromCost)) / newQty : fromCost;
      await tx.materialInventory.update({
        where: { materialId_locationId: { materialId: transfer.materialId, locationId: transfer.toLocationId } },
        data:  { quantity: newQty, avgCost: newCost },
      });
    } else {
      await tx.materialInventory.create({
        data: {
          materialId: transfer.materialId,
          locationId: transfer.toLocationId,
          quantity:   qty,
          avgCost:    fromCost,
        },
      });
    }

  } else if (transfer.masterSpecId) {
    // ── Finished goods transfer ──
    const where = { masterSpecId: transfer.masterSpecId, variantId: transfer.variantId ?? null, locationId: transfer.fromLocationId };
    const fromRows = await tx.finishedGoodsInventory.findMany({ where });
    const fromRow  = fromRows[0];

    if (!fromRow || Number(fromRow.quantity) < qty) {
      throw new Error(`INSUF:Insufficient finished goods at origin location (have ${fromRow ? Number(fromRow.quantity) : 0})`);
    }

    const fromCost = fromRow.avgCost ? Number(fromRow.avgCost) : 0;

    // Deduct from origin
    await tx.finishedGoodsInventory.update({
      where: { id: fromRow.id },
      data:  { quantity: { decrement: qty } },
    });

    // Add to destination
    const toRows = await tx.finishedGoodsInventory.findMany({
      where: { masterSpecId: transfer.masterSpecId, variantId: transfer.variantId ?? null, locationId: transfer.toLocationId },
    });
    const toRow = toRows[0];

    if (toRow) {
      const existingQty  = Number(toRow.quantity);
      const existingCost = toRow.avgCost ? Number(toRow.avgCost) : 0;
      const newQty  = existingQty + qty;
      const newCost = newQty > 0 ? ((existingQty * existingCost) + (qty * fromCost)) / newQty : fromCost;
      await tx.finishedGoodsInventory.update({
        where: { id: toRow.id },
        data:  { quantity: newQty, avgCost: newCost },
      });
    } else {
      await tx.finishedGoodsInventory.create({
        data: {
          masterSpecId: transfer.masterSpecId,
          variantId:  transfer.variantId ?? null,
          locationId: transfer.toLocationId,
          quantity:   qty,
          avgCost:    fromCost || null,
        },
      });
    }
  }
}

export default router;
