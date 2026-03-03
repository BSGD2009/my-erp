import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/equipment ────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, equipmentTypeId, locationId, page = '1', limit = '50' } =
    req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (equipmentTypeId) where.equipmentTypeId = parseInt(equipmentTypeId);
  if (locationId)      where.locationId      = parseInt(locationId);
  if (search) {
    where.OR = [
      { name:         { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { modelNumber:  { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { assetTagId:   { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        equipmentType: { select: { id: true, typeKey: true, typeName: true } },
        location:      { select: { id: true, name: true } },
      },
    }),
    prisma.equipment.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/equipment/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const equip = await prisma.equipment.findUnique({
    where: { id },
    include: {
      equipmentType: { select: { id: true, typeKey: true, typeName: true } },
      location:      { select: { id: true, name: true } },
      partsSupplier: { select: { id: true, code: true, name: true } },
      capabilities: {
        include: {
          operation: { select: { id: true, operationKey: true, operationName: true } },
        },
        orderBy: { operation: { operationName: 'asc' } },
      },
      workCenters: {
        select: { id: true, name: true, isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!equip) { res.status(404).json({ error: 'Equipment not found' }); return; }
  res.json(equip);
});

// ── POST /api/protected/equipment ───────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    name, equipmentTypeId, locationId, manufacturer, modelNumber, serialNumber,
    yearOfManufacture, maxSheetWidth, maxSheetLength, minSheetWidth, minSheetLength,
    maxSpeed, purchaseDate, purchasePrice, warrantyExpiry, lastServiceDate,
    nextServiceDue, assetTagId, partsSupplierId, notes,
  } = req.body as Record<string, unknown>;

  if (!String(name ?? '').trim())       { res.status(400).json({ error: 'name is required' });            return; }
  if (equipmentTypeId == null)          { res.status(400).json({ error: 'equipmentTypeId is required' }); return; }
  if (locationId == null)               { res.status(400).json({ error: 'locationId is required' });      return; }

  try {
    const equip = await prisma.equipment.create({
      data: {
        name:              String(name).trim(),
        equipmentTypeId:   Number(equipmentTypeId),
        locationId:        Number(locationId),
        manufacturer:      manufacturer      != null ? String(manufacturer).trim()      : null,
        modelNumber:       modelNumber       != null ? String(modelNumber).trim()       : null,
        serialNumber:      serialNumber      != null ? String(serialNumber).trim()      : null,
        yearOfManufacture: yearOfManufacture != null ? Number(yearOfManufacture)        : null,
        maxSheetWidth:     maxSheetWidth     != null ? Number(maxSheetWidth)            : null,
        maxSheetLength:    maxSheetLength    != null ? Number(maxSheetLength)           : null,
        minSheetWidth:     minSheetWidth     != null ? Number(minSheetWidth)            : null,
        minSheetLength:    minSheetLength    != null ? Number(minSheetLength)           : null,
        maxSpeed:          maxSpeed          != null ? Number(maxSpeed)                 : null,
        purchaseDate:      purchaseDate      != null ? new Date(purchaseDate as string) : null,
        purchasePrice:     purchasePrice     != null ? Number(purchasePrice)            : null,
        warrantyExpiry:    warrantyExpiry    != null ? new Date(warrantyExpiry as string) : null,
        lastServiceDate:   lastServiceDate   != null ? new Date(lastServiceDate as string) : null,
        nextServiceDue:    nextServiceDue    != null ? new Date(nextServiceDue as string)  : null,
        assetTagId:        assetTagId        != null ? String(assetTagId).trim()        : null,
        partsSupplierId:   partsSupplierId   != null ? Number(partsSupplierId)         : null,
        notes:             notes             != null ? String(notes).trim()             : null,
      },
      include: {
        equipmentType: { select: { id: true, typeKey: true, typeName: true } },
        location:      { select: { id: true, name: true } },
      },
    });
    res.status(201).json(equip);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(400).json({ error: 'Referenced record not found (equipment type, location, or supplier)' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/equipment/:id ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const {
    name, equipmentTypeId, locationId, manufacturer, modelNumber, serialNumber,
    yearOfManufacture, maxSheetWidth, maxSheetLength, minSheetWidth, minSheetLength,
    maxSpeed, purchaseDate, purchasePrice, warrantyExpiry, lastServiceDate,
    nextServiceDue, assetTagId, partsSupplierId, notes, isActive,
  } = req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (name              !== undefined) d.name              = String(name).trim();
    if (equipmentTypeId   !== undefined) d.equipmentTypeId   = Number(equipmentTypeId);
    if (locationId        !== undefined) d.locationId        = Number(locationId);
    if (manufacturer      !== undefined) d.manufacturer      = manufacturer      != null ? String(manufacturer).trim()      : null;
    if (modelNumber       !== undefined) d.modelNumber       = modelNumber       != null ? String(modelNumber).trim()       : null;
    if (serialNumber      !== undefined) d.serialNumber      = serialNumber      != null ? String(serialNumber).trim()      : null;
    if (yearOfManufacture !== undefined) d.yearOfManufacture = yearOfManufacture != null ? Number(yearOfManufacture)        : null;
    if (maxSheetWidth     !== undefined) d.maxSheetWidth     = maxSheetWidth     != null ? Number(maxSheetWidth)            : null;
    if (maxSheetLength    !== undefined) d.maxSheetLength    = maxSheetLength    != null ? Number(maxSheetLength)           : null;
    if (minSheetWidth     !== undefined) d.minSheetWidth     = minSheetWidth     != null ? Number(minSheetWidth)            : null;
    if (minSheetLength    !== undefined) d.minSheetLength    = minSheetLength    != null ? Number(minSheetLength)           : null;
    if (maxSpeed          !== undefined) d.maxSpeed          = maxSpeed          != null ? Number(maxSpeed)                 : null;
    if (purchaseDate      !== undefined) d.purchaseDate      = purchaseDate      != null ? new Date(purchaseDate as string) : null;
    if (purchasePrice     !== undefined) d.purchasePrice     = purchasePrice     != null ? Number(purchasePrice)            : null;
    if (warrantyExpiry    !== undefined) d.warrantyExpiry    = warrantyExpiry    != null ? new Date(warrantyExpiry as string) : null;
    if (lastServiceDate   !== undefined) d.lastServiceDate   = lastServiceDate   != null ? new Date(lastServiceDate as string) : null;
    if (nextServiceDue    !== undefined) d.nextServiceDue    = nextServiceDue    != null ? new Date(nextServiceDue as string)  : null;
    if (assetTagId        !== undefined) d.assetTagId        = assetTagId        != null ? String(assetTagId).trim()        : null;
    if (partsSupplierId   !== undefined) d.partsSupplierId   = partsSupplierId   != null ? Number(partsSupplierId)         : null;
    if (notes             !== undefined) d.notes             = notes             != null ? String(notes).trim()             : null;
    if (isActive          !== undefined) d.isActive          = Boolean(isActive);

    const equip = await prisma.equipment.update({
      where: { id },
      data:  d as any,
      include: {
        equipmentType: { select: { id: true, typeKey: true, typeName: true } },
        location:      { select: { id: true, name: true } },
      },
    });
    res.json(equip);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Equipment not found' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Referenced record not found (equipment type, location, or supplier)' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/equipment/:id (soft delete) ───────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.equipment.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Equipment not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/protected/equipment/:id/capabilities ──────────────────────────
router.post('/:id/capabilities', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { operationId, maxSpeed, notes } = req.body as Record<string, unknown>;

  if (operationId == null) { res.status(400).json({ error: 'operationId is required' }); return; }

  // Verify equipment exists
  const equip = await prisma.equipment.findUnique({ where: { id } });
  if (!equip) { res.status(404).json({ error: 'Equipment not found' }); return; }

  try {
    const cap = await prisma.equipmentCapability.create({
      data: {
        equipmentId: id,
        operationId: Number(operationId),
        maxSpeed:    maxSpeed != null ? Number(maxSpeed) : null,
        notes:       notes    != null ? String(notes).trim() : null,
      },
      include: {
        operation: { select: { id: true, operationKey: true, operationName: true } },
      },
    });
    res.status(201).json(cap);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'This equipment already has that capability' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Operation not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/equipment/:id/capabilities/:capId ─────────────────
router.delete('/:id/capabilities/:capId', async (req, res) => {
  const id    = parseInt(req.params.id);
  const capId = parseInt(req.params.capId);
  if (isNaN(id))    { res.status(400).json({ error: 'Invalid equipment ID' });  return; }
  if (isNaN(capId)) { res.status(400).json({ error: 'Invalid capability ID' }); return; }

  try {
    // Ensure the capability belongs to this equipment
    const cap = await prisma.equipmentCapability.findUnique({ where: { id: capId } });
    if (!cap || cap.equipmentId !== id) {
      res.status(404).json({ error: 'Capability not found for this equipment' });
      return;
    }

    await prisma.equipmentCapability.delete({ where: { id: capId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Capability not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
