import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/resources ────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, resourceTypeId, locationId,
          page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (resourceTypeId) where.resourceTypeId = parseInt(resourceTypeId);
  if (locationId)     where.locationId     = parseInt(locationId);
  if (search) {
    where.OR = [
      { name:          { contains: search, mode: 'insensitive' } },
      { description:   { contains: search, mode: 'insensitive' } },
      { manufacturer:  { contains: search, mode: 'insensitive' } },
      { modelNumber:   { contains: search, mode: 'insensitive' } },
      { serialNumber:  { contains: search, mode: 'insensitive' } },
      { assetTagId:    { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.resource.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        resourceType: { select: { id: true, typeKey: true, typeName: true } },
        location:     { select: { id: true, name: true } },
      },
    }),
    prisma.resource.count({ where: where as any }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/resources/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      resourceType:  { select: { id: true, typeKey: true, typeName: true } },
      location:      { select: { id: true, name: true } },
      partsSupplier: { select: { id: true, code: true, name: true } },
      capabilities: {
        include: { operation: true },
        orderBy: { id: 'asc' },
      },
      _count: { select: { jobs: true } },
    },
  });
  if (!resource) { res.status(404).json({ error: 'Resource not found' }); return; }
  res.json(resource);
});

// ── POST /api/protected/resources ───────────────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim())   { res.status(400).json({ error: 'name is required' }); return; }
  if (!b.resourceTypeId)              { res.status(400).json({ error: 'resourceTypeId is required' }); return; }
  if (!b.locationId)                  { res.status(400).json({ error: 'locationId is required' }); return; }

  try {
    const resource = await prisma.resource.create({
      data: {
        name:               String(b.name).trim(),
        resourceTypeId:     Number(b.resourceTypeId),
        locationId:         Number(b.locationId),
        description:        b.description        ? String(b.description).trim()    : null,
        manufacturer:       b.manufacturer       ? String(b.manufacturer).trim()   : null,
        modelNumber:        b.modelNumber        ? String(b.modelNumber).trim()    : null,
        serialNumber:       b.serialNumber       ? String(b.serialNumber).trim()   : null,
        yearOfManufacture:  b.yearOfManufacture != null ? Number(b.yearOfManufacture) : null,
        maxSheetWidth:      b.maxSheetWidth     != null ? Number(b.maxSheetWidth)     : null,
        maxSheetLength:     b.maxSheetLength    != null ? Number(b.maxSheetLength)    : null,
        minSheetWidth:      b.minSheetWidth     != null ? Number(b.minSheetWidth)     : null,
        minSheetLength:     b.minSheetLength    != null ? Number(b.minSheetLength)    : null,
        maxSpeed:           b.maxSpeed          != null ? Number(b.maxSpeed)           : null,
        purchaseDate:       b.purchaseDate       ? new Date(String(b.purchaseDate))   : null,
        purchasePrice:      b.purchasePrice     != null ? Number(b.purchasePrice)     : null,
        warrantyExpiry:     b.warrantyExpiry     ? new Date(String(b.warrantyExpiry)) : null,
        lastServiceDate:    b.lastServiceDate    ? new Date(String(b.lastServiceDate)): null,
        nextServiceDue:     b.nextServiceDue     ? new Date(String(b.nextServiceDue)) : null,
        assetTagId:         b.assetTagId         ? String(b.assetTagId).trim()        : null,
        partsSupplierId:    b.partsSupplierId   != null ? Number(b.partsSupplierId)   : null,
        notes:              b.notes              ? String(b.notes).trim()              : null,
      },
      include: {
        resourceType: { select: { id: true, typeKey: true, typeName: true } },
        location:     { select: { id: true, name: true } },
      },
    });
    res.status(201).json(resource);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A resource with that name already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/resources/:id ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (b.name              !== undefined) d.name              = String(b.name).trim();
    if (b.resourceTypeId    !== undefined) d.resourceTypeId    = Number(b.resourceTypeId);
    if (b.locationId        !== undefined) d.locationId        = Number(b.locationId);
    if (b.description       !== undefined) d.description       = b.description       ? String(b.description).trim()    : null;
    if (b.manufacturer      !== undefined) d.manufacturer      = b.manufacturer      ? String(b.manufacturer).trim()   : null;
    if (b.modelNumber       !== undefined) d.modelNumber       = b.modelNumber       ? String(b.modelNumber).trim()    : null;
    if (b.serialNumber      !== undefined) d.serialNumber      = b.serialNumber      ? String(b.serialNumber).trim()   : null;
    if (b.yearOfManufacture !== undefined) d.yearOfManufacture = b.yearOfManufacture != null ? Number(b.yearOfManufacture) : null;
    if (b.maxSheetWidth     !== undefined) d.maxSheetWidth     = b.maxSheetWidth     != null ? Number(b.maxSheetWidth)     : null;
    if (b.maxSheetLength    !== undefined) d.maxSheetLength    = b.maxSheetLength    != null ? Number(b.maxSheetLength)    : null;
    if (b.minSheetWidth     !== undefined) d.minSheetWidth     = b.minSheetWidth     != null ? Number(b.minSheetWidth)     : null;
    if (b.minSheetLength    !== undefined) d.minSheetLength    = b.minSheetLength    != null ? Number(b.minSheetLength)    : null;
    if (b.maxSpeed          !== undefined) d.maxSpeed          = b.maxSpeed          != null ? Number(b.maxSpeed)           : null;
    if (b.purchaseDate      !== undefined) d.purchaseDate      = b.purchaseDate       ? new Date(String(b.purchaseDate))   : null;
    if (b.purchasePrice     !== undefined) d.purchasePrice     = b.purchasePrice     != null ? Number(b.purchasePrice)     : null;
    if (b.warrantyExpiry    !== undefined) d.warrantyExpiry    = b.warrantyExpiry     ? new Date(String(b.warrantyExpiry)) : null;
    if (b.lastServiceDate   !== undefined) d.lastServiceDate   = b.lastServiceDate    ? new Date(String(b.lastServiceDate)): null;
    if (b.nextServiceDue    !== undefined) d.nextServiceDue    = b.nextServiceDue     ? new Date(String(b.nextServiceDue)) : null;
    if (b.assetTagId        !== undefined) d.assetTagId        = b.assetTagId         ? String(b.assetTagId).trim()        : null;
    if (b.partsSupplierId   !== undefined) d.partsSupplierId   = b.partsSupplierId   != null ? Number(b.partsSupplierId)   : null;
    if (b.notes             !== undefined) d.notes             = b.notes              ? String(b.notes).trim()              : null;
    if (b.isActive          !== undefined) d.isActive          = Boolean(b.isActive);

    const resource = await prisma.resource.update({
      where: { id },
      data: d as any,
      include: {
        resourceType: { select: { id: true, typeKey: true, typeName: true } },
        location:     { select: { id: true, name: true } },
      },
    });
    res.json(resource);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Resource not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Name already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/resources/:id (soft delete) ───────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.resource.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Resource not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITIES sub-resource
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/protected/resources/:id/capabilities ──────────────────────────
router.post('/:id/capabilities', async (req, res) => {
  const resourceId = parseInt(req.params.id);
  if (isNaN(resourceId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;
  if (!b.operationId) { res.status(400).json({ error: 'operationId is required' }); return; }

  try {
    // Verify resource exists
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) { res.status(404).json({ error: 'Resource not found' }); return; }

    const capability = await prisma.resourceCapability.create({
      data: {
        resourceId,
        operationId: Number(b.operationId),
        maxSpeed:    b.maxSpeed != null ? Number(b.maxSpeed) : null,
        notes:       b.notes   ? String(b.notes).trim()     : null,
      },
      include: {
        operation: true,
      },
    });
    res.status(201).json(capability);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/resources/:id/capabilities/:capId ─────────────────
router.delete('/:id/capabilities/:capId', async (req, res) => {
  const resourceId = parseInt(req.params.id);
  const capId      = parseInt(req.params.capId);
  if (isNaN(resourceId) || isNaN(capId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    // Verify the capability belongs to this resource
    const capability = await prisma.resourceCapability.findFirst({
      where: { id: capId, resourceId },
    });
    if (!capability) { res.status(404).json({ error: 'Capability not found' }); return; }

    await prisma.resourceCapability.delete({ where: { id: capId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Capability not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
