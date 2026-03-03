import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/product-modules ───────────────────────────────────────
router.get('/', async (_req, res) => {
  const modules = await prisma.productModule.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { specFields: true, categories: true } },
    },
  });
  res.json(modules);
});

// ── GET /api/protected/product-modules/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const mod = await prisma.productModule.findUnique({
    where: { id },
    include: {
      specFields: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { categories: true } },
    },
  });
  if (!mod) { res.status(404).json({ error: 'Product module not found' }); return; }
  res.json(mod);
});

// ── POST /api/protected/product-modules ──────────────────────────────────────
router.post('/', async (req, res) => {
  const { moduleKey, moduleName, sortOrder } = req.body as Record<string, unknown>;

  if (!String(moduleKey  ?? '').trim()) { res.status(400).json({ error: 'moduleKey is required' });  return; }
  if (!String(moduleName ?? '').trim()) { res.status(400).json({ error: 'moduleName is required' }); return; }

  try {
    const mod = await prisma.productModule.create({
      data: {
        moduleKey:  String(moduleKey).trim().toUpperCase(),
        moduleName: String(moduleName).trim(),
        sortOrder:  sortOrder != null ? Number(sortOrder) : 0,
      },
    });
    res.status(201).json(mod);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A module with that key already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/product-modules/:id ───────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { moduleKey, moduleName, sortOrder, isActive } = req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (moduleKey  !== undefined) d.moduleKey  = String(moduleKey).trim().toUpperCase();
    if (moduleName !== undefined) d.moduleName = String(moduleName).trim();
    if (sortOrder  !== undefined) d.sortOrder  = Number(sortOrder);
    if (isActive   !== undefined) d.isActive   = Boolean(isActive);

    const mod = await prisma.productModule.update({ where: { id }, data: d as any });
    res.json(mod);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Product module not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Module key already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/product-modules/:id (soft delete) ──────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const catCount = await prisma.productCategory.count({ where: { moduleId: id } });
  if (catCount > 0) {
    res.status(409).json({ error: `Cannot deactivate: referenced by ${catCount} category(ies)`, catCount });
    return;
  }

  try {
    await prisma.productModule.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Product module not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Spec Fields sub-resource ─────────────────────────────────────────────────

router.get('/:id/spec-fields', async (req, res) => {
  const moduleId = parseInt(req.params.id);
  if (isNaN(moduleId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  const fields = await prisma.moduleSpecField.findMany({
    where: { moduleId },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(fields);
});

router.post('/:id/spec-fields', async (req, res) => {
  const moduleId = parseInt(req.params.id);
  if (isNaN(moduleId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { fieldKey, fieldLabel, fieldType, selectOptions, isRequired, sortOrder } =
    req.body as Record<string, unknown>;

  if (!String(fieldKey   ?? '').trim()) { res.status(400).json({ error: 'fieldKey is required' });   return; }
  if (!String(fieldLabel ?? '').trim()) { res.status(400).json({ error: 'fieldLabel is required' }); return; }
  if (!String(fieldType  ?? '').trim()) { res.status(400).json({ error: 'fieldType is required' });  return; }

  try {
    const field = await prisma.moduleSpecField.create({
      data: {
        moduleId,
        fieldKey:      String(fieldKey).trim(),
        fieldLabel:    String(fieldLabel).trim(),
        fieldType:     String(fieldType).trim().toUpperCase(),
        selectOptions: selectOptions != null ? String(selectOptions) : null,
        isRequired:    isRequired != null ? Boolean(isRequired) : false,
        sortOrder:     sortOrder  != null ? Number(sortOrder)  : 0,
      },
    });
    res.status(201).json(field);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A field with that key already exists for this module' }); return; }
    if (err.code === 'P2003') { res.status(404).json({ error: 'Product module not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/spec-fields/:fieldId', async (req, res) => {
  const moduleId = parseInt(req.params.id);
  const fieldId  = parseInt(req.params.fieldId);
  if (isNaN(moduleId) || isNaN(fieldId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.moduleSpecField.findFirst({ where: { id: fieldId, moduleId } });
    if (!existing) { res.status(404).json({ error: 'Spec field not found' }); return; }

    const d: Record<string, unknown> = {};
    if (b.fieldKey      !== undefined) d.fieldKey      = String(b.fieldKey).trim();
    if (b.fieldLabel    !== undefined) d.fieldLabel    = String(b.fieldLabel).trim();
    if (b.fieldType     !== undefined) d.fieldType     = String(b.fieldType).trim().toUpperCase();
    if (b.selectOptions !== undefined) d.selectOptions = b.selectOptions != null ? String(b.selectOptions) : null;
    if (b.isRequired    !== undefined) d.isRequired    = Boolean(b.isRequired);
    if (b.sortOrder     !== undefined) d.sortOrder     = Number(b.sortOrder);

    const field = await prisma.moduleSpecField.update({ where: { id: fieldId }, data: d as any });
    res.json(field);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Spec field not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Field key already in use for this module' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/spec-fields/:fieldId', async (req, res) => {
  const moduleId = parseInt(req.params.id);
  const fieldId  = parseInt(req.params.fieldId);
  if (isNaN(moduleId) || isNaN(fieldId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const existing = await prisma.moduleSpecField.findFirst({ where: { id: fieldId, moduleId } });
    if (!existing) { res.status(404).json({ error: 'Spec field not found' }); return; }
    await prisma.moduleSpecField.delete({ where: { id: fieldId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Spec field not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
