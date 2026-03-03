import { Router } from 'express';
import { ToolType, ToolCondition } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_TYPES      = Object.values(ToolType);
const VALID_CONDITIONS = Object.values(ToolCondition);

// ── GET /api/protected/tooling ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, type, condition, customerId, locationId,
          page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (type      && VALID_TYPES.includes(type as ToolType))           where.type      = type as ToolType;
  if (condition && VALID_CONDITIONS.includes(condition as ToolCondition)) where.condition = condition as ToolCondition;
  if (customerId) where.customerId = parseInt(customerId);
  if (locationId) where.locationId = parseInt(locationId);
  if (search) {
    where.OR = [
      { toolNumber:   { contains: search, mode: 'insensitive' } },
      { description:  { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.tooling.findMany({
      where,
      orderBy: [{ type: 'asc' }, { toolNumber: 'asc' }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        customer: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, name: true } },
        _count:   { select: { blankSpecs: true } },
      },
    }),
    prisma.tooling.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/tooling/:id ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const tool = await prisma.tooling.findUnique({
    where: { id },
    include: {
      customer:   { select: { id: true, code: true, name: true } },
      location:   { select: { id: true, name: true } },
      customerItem: { select: { id: true, code: true, name: true } },
      masterSpec:   { select: { id: true, sku: true, name: true } },
      blankSpecs: {
        include: { masterSpec: { select: { id: true, sku: true, name: true } } },
        where:    { masterSpecId: { not: null } },
      },
    },
  });
  if (!tool) { res.status(404).json({ error: 'Tooling not found' }); return; }
  res.json(tool);
});

// ── POST /api/protected/tooling ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { toolNumber, type, description, customerId, condition, locationId,
          customerItemId, masterSpecId, fileUrl, fileName } =
    req.body as Record<string, unknown>;

  if (!String(toolNumber ?? '').trim()) { res.status(400).json({ error: 'toolNumber is required' }); return; }
  if (!type      || !VALID_TYPES.includes(type as ToolType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }
  if (!condition || !VALID_CONDITIONS.includes(condition as ToolCondition)) {
    res.status(400).json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` }); return;
  }
  if (!locationId) { res.status(400).json({ error: 'locationId is required' }); return; }

  try {
    const tool = await prisma.tooling.create({
      data: {
        toolNumber:  String(toolNumber).trim().toUpperCase(),
        type:        type as ToolType,
        description: description != null ? String(description).trim() : null,
        customerId:    customerId    != null ? Number(customerId)    : null,
        condition:     condition as ToolCondition,
        locationId:    Number(locationId),
        customerItemId: customerItemId != null ? Number(customerItemId) : null,
        masterSpecId:   masterSpecId   != null ? Number(masterSpecId)   : null,
        fileUrl:        fileUrl  != null ? String(fileUrl).trim()  : null,
        fileName:       fileName != null ? String(fileName).trim() : null,
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(tool);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A tool with that number already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Customer or location not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/tooling/:id ───────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { toolNumber, type, description, customerId, condition, locationId, isActive,
          customerItemId, masterSpecId, fileUrl, fileName } =
    req.body as Record<string, unknown>;

  if (type      !== undefined && !VALID_TYPES.includes(type as ToolType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }
  if (condition !== undefined && !VALID_CONDITIONS.includes(condition as ToolCondition)) {
    res.status(400).json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` }); return;
  }

  const d: Record<string, unknown> = {};
  if (toolNumber   !== undefined) d.toolNumber   = String(toolNumber).trim().toUpperCase();
  if (type         !== undefined) d.type         = type as ToolType;
  if (description  !== undefined) d.description  = description != null ? String(description).trim() : null;
  if (customerId   !== undefined) d.customerId   = customerId  != null ? Number(customerId)  : null;
  if (condition    !== undefined) d.condition    = condition as ToolCondition;
  if (locationId     !== undefined) d.locationId     = Number(locationId);
  if (isActive       !== undefined) d.isActive       = Boolean(isActive);
  if (customerItemId !== undefined) d.customerItemId = customerItemId != null ? Number(customerItemId) : null;
  if (masterSpecId   !== undefined) d.masterSpecId   = masterSpecId   != null ? Number(masterSpecId)   : null;
  if (fileUrl        !== undefined) d.fileUrl        = fileUrl  != null ? String(fileUrl).trim()  : null;
  if (fileName       !== undefined) d.fileName       = fileName != null ? String(fileName).trim() : null;

  try {
    const tool = await prisma.tooling.update({
      where: { id },
      data:  d as any,
      include: {
        customer: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    res.json(tool);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Tooling not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Tool number already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Customer or location not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/tooling/:id (soft delete) ──────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.tooling.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Tooling not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
