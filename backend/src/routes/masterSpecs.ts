import { Router } from 'express';
import {
  BoxStyle, Flute, WallType, PrintType, CoatingType,
  GrainDirection, JointType,
} from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_BOX_STYLES    = Object.values(BoxStyle);
const VALID_FLUTES        = Object.values(Flute);
const VALID_WALL_TYPES    = Object.values(WallType);
const VALID_PRINT_TYPES   = Object.values(PrintType);
const VALID_COATINGS      = Object.values(CoatingType);
const VALID_GRAINS        = Object.values(GrainDirection);
const VALID_JOINTS        = Object.values(JointType);

// Auto-generate SKU from name: first 4 letters + 2-digit number
async function generateSku(name: string): Promise<string> {
  const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  for (let i = 1; i <= 99; i++) {
    const sku = `${prefix}${String(i).padStart(2, '0')}`;
    const exists = await prisma.masterSpec.findUnique({ where: { sku } });
    if (!exists) return sku;
  }
  return `${prefix}${Date.now() % 1000}`;
}

// ── GET /api/protected/master-specs ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, categoryId, isCustom,
          page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (categoryId)   where.categoryId = parseInt(categoryId);
  if (isCustom !== undefined) where.isCustom = isCustom === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku:  { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.masterSpec.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        category: { select: { id: true, name: true, module: { select: { id: true, moduleKey: true, moduleName: true } } } },
        _count:   { select: { variants: true, bomLines: true, customerItems: true } },
      },
    }),
    prisma.masterSpec.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/master-specs/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const masterSpec = await prisma.masterSpec.findUnique({
    where: { id },
    include: {
      category:  { select: { id: true, name: true, module: { select: { id: true, moduleKey: true, moduleName: true } } } },
      boxSpec:   true,
      blankSpec: {
        include: {
          material:        { select: { id: true, code: true, name: true, unitOfMeasure: true } },
          requiredDie:     { select: { id: true, toolNumber: true, type: true, condition: true } },
          materialVariant: { select: { id: true, variantCode: true, description: true, rollWidth: true, sheetLength: true, sheetWidth: true } },
        },
      },
      bomLines: {
        include: {
          material: { select: { id: true, code: true, name: true, unitOfMeasure: true } },
        },
        orderBy: { material: { name: 'asc' } },
      },
      variants: {
        where: { isActive: true },
        orderBy: { sku: 'asc' },
      },
      specs: {
        orderBy: [{ sortOrder: 'asc' }, { specKey: 'asc' }],
      },
      finishedGoodsInventory: {
        include: {
          location: { select: { id: true, name: true } },
          variant:  { select: { id: true, sku: true, variantDescription: true } },
        },
        orderBy: { location: { name: 'asc' } },
      },
      customerItems: {
        where: { isActive: true },
        include: {
          customer: { select: { id: true, code: true, name: true } },
        },
        orderBy: { customer: { name: 'asc' } },
      },
    },
  });
  if (!masterSpec) { res.status(404).json({ error: 'Master spec not found' }); return; }
  res.json(masterSpec);
});

// ── POST /api/protected/master-specs ────────────────────────────────────────
router.post('/', async (req, res) => {
  const { sku, name, description, categoryId, isCustom, listPrice } =
    req.body as Record<string, unknown>;

  if (!String(name  ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  const finalSku = sku && String(sku).trim()
    ? String(sku).trim().toUpperCase()
    : await generateSku(String(name));

  try {
    const masterSpec = await prisma.masterSpec.create({
      data: {
        sku:         finalSku,
        name:        String(name).trim(),
        description: description != null ? String(description).trim() : null,
        categoryId:  categoryId  != null ? Number(categoryId) : null,
        isCustom:    isCustom    != null ? Boolean(isCustom)  : false,
        listPrice:   listPrice   != null ? (listPrice as string | number) : null,
      },
      include: { category: { select: { id: true, name: true, module: { select: { id: true, moduleKey: true, moduleName: true } } } } },
    });
    res.status(201).json(masterSpec);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A master spec with that SKU already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Category not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/master-specs/:id ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { sku, name, description, categoryId, isCustom, listPrice, isActive } =
    req.body as Record<string, unknown>;

  const d: Record<string, unknown> = {};
  if (sku         !== undefined) d.sku         = String(sku).trim().toUpperCase();
  if (name        !== undefined) d.name        = String(name).trim();
  if (description !== undefined) d.description = description != null ? String(description).trim() : null;
  if (categoryId  !== undefined) d.categoryId  = categoryId  != null ? Number(categoryId)  : null;
  if (isCustom    !== undefined) d.isCustom    = Boolean(isCustom);
  if (listPrice   !== undefined) d.listPrice   = listPrice   != null ? (listPrice as string | number) : null;
  if (isActive    !== undefined) d.isActive    = Boolean(isActive);

  try {
    const masterSpec = await prisma.masterSpec.update({
      where: { id },
      data:  d as any,
      include: { category: { select: { id: true, name: true, module: { select: { id: true, moduleKey: true, moduleName: true } } } } },
    });
    res.json(masterSpec);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Master spec not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'SKU already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/master-specs/:id (soft delete) ────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    // Safety check: active customer items referencing this spec
    const ciCount = await prisma.customerItem.count({ where: { masterSpecId: id, isActive: true } });
    if (ciCount > 0) {
      res.status(409).json({ error: `Cannot deactivate: ${ciCount} active customer item(s) reference this spec`, count: ciCount });
      return;
    }

    await prisma.masterSpec.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Master spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// VARIANTS  /api/protected/master-specs/:id/variants
// =============================================================================

router.get('/:id/variants', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const { active } = req.query as Record<string, string>;
  const variants = await prisma.productVariant.findMany({
    where: {
      masterSpecId,
      ...(active === 'false' ? {} : { isActive: true }),
    },
    orderBy: { sku: 'asc' },
  });
  res.json(variants);
});

router.post('/:id/variants', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const { sku, variantDescription, width, length, thickness,
          bundleQty, caseQty, listPrice } = req.body as Record<string, unknown>;

  if (!String(sku ?? '').trim()) { res.status(400).json({ error: 'sku is required' }); return; }

  // Verify parent master spec exists
  const masterSpec = await prisma.masterSpec.findUnique({ where: { id: masterSpecId }, select: { id: true } });
  if (!masterSpec) { res.status(404).json({ error: 'Master spec not found' }); return; }

  try {
    const variant = await prisma.productVariant.create({
      data: {
        masterSpecId,
        sku:               String(sku).trim().toUpperCase(),
        variantDescription: variantDescription != null ? String(variantDescription).trim() : null,
        width:             width     != null ? (width     as string | number) : null,
        length:            length    != null ? (length    as string | number) : null,
        thickness:         thickness != null ? (thickness as string | number) : null,
        bundleQty:         bundleQty != null ? Number(bundleQty) : null,
        caseQty:           caseQty   != null ? Number(caseQty)   : null,
        listPrice:         listPrice != null ? (listPrice as string | number) : null,
      },
    });
    res.status(201).json(variant);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A variant with that SKU already exists' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/variants/:vid', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  const variantId = parseInt(req.params.vid);
  if (isNaN(masterSpecId) || isNaN(variantId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { sku, variantDescription, width, length, thickness,
          bundleQty, caseQty, listPrice, isActive } = req.body as Record<string, unknown>;

  const d: Record<string, unknown> = {};
  if (sku                !== undefined) d.sku                = String(sku).trim().toUpperCase();
  if (variantDescription !== undefined) d.variantDescription = variantDescription != null ? String(variantDescription).trim() : null;
  if (width              !== undefined) d.width              = width     != null ? (width     as string | number) : null;
  if (length             !== undefined) d.length             = length    != null ? (length    as string | number) : null;
  if (thickness          !== undefined) d.thickness          = thickness != null ? (thickness as string | number) : null;
  if (bundleQty          !== undefined) d.bundleQty          = bundleQty != null ? Number(bundleQty) : null;
  if (caseQty            !== undefined) d.caseQty            = caseQty   != null ? Number(caseQty)   : null;
  if (listPrice          !== undefined) d.listPrice          = listPrice != null ? (listPrice as string | number) : null;
  if (isActive           !== undefined) d.isActive           = Boolean(isActive);

  try {
    const variant = await prisma.productVariant.update({
      where: { id: variantId, masterSpecId },
      data:  d as any,
    });
    res.json(variant);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Variant not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'SKU already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/variants/:vid', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  const variantId = parseInt(req.params.vid);
  if (isNaN(masterSpecId) || isNaN(variantId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.productVariant.update({
      where: { id: variantId, masterSpecId },
      data:  { isActive: false },
    });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Variant not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// SPECS  /api/protected/master-specs/:id/specs
// =============================================================================

router.get('/:id/specs', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }
  const specs = await prisma.productSpec.findMany({
    where: { masterSpecId },
    orderBy: [{ sortOrder: 'asc' }, { specKey: 'asc' }],
  });
  res.json(specs);
});

router.post('/:id/specs', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const { variantId, specKey, specValue, specUnit, sortOrder } = req.body as Record<string, unknown>;
  if (!String(specKey   ?? '').trim()) { res.status(400).json({ error: 'specKey is required' });   return; }
  if (!String(specValue ?? '').trim()) { res.status(400).json({ error: 'specValue is required' }); return; }

  const masterSpec = await prisma.masterSpec.findUnique({ where: { id: masterSpecId }, select: { id: true } });
  if (!masterSpec) { res.status(404).json({ error: 'Master spec not found' }); return; }

  try {
    const spec = await prisma.productSpec.create({
      data: {
        masterSpecId,
        variantId: variantId != null ? Number(variantId) : null,
        specKey:   String(specKey).trim(),
        specValue: String(specValue).trim(),
        specUnit:  specUnit  != null ? String(specUnit).trim() : null,
        sortOrder: sortOrder != null ? Number(sortOrder)       : null,
      },
    });
    res.status(201).json(spec);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(400).json({ error: 'Variant not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/specs/:sid', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  const specId    = parseInt(req.params.sid);
  if (isNaN(masterSpecId) || isNaN(specId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { specKey, specValue, specUnit, sortOrder } = req.body as Record<string, unknown>;
  const d: Record<string, unknown> = {};
  if (specKey   !== undefined) d.specKey   = String(specKey).trim();
  if (specValue !== undefined) d.specValue = String(specValue).trim();
  if (specUnit  !== undefined) d.specUnit  = specUnit  != null ? String(specUnit).trim() : null;
  if (sortOrder !== undefined) d.sortOrder = sortOrder != null ? Number(sortOrder)       : null;

  try {
    const spec = await prisma.productSpec.update({ where: { id: specId, masterSpecId }, data: d as any });
    res.json(spec);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/specs/:sid', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  const specId    = parseInt(req.params.sid);
  if (isNaN(masterSpecId) || isNaN(specId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.productSpec.delete({ where: { id: specId, masterSpecId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// BOM LINES  /api/protected/master-specs/:id/bom
// =============================================================================

router.get('/:id/bom', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }
  const lines = await prisma.bOMLine.findMany({
    where: { masterSpecId },
    include: {
      material: {
        select: { id: true, code: true, name: true, unitOfMeasure: true },
      },
    },
    orderBy: { material: { name: 'asc' } },
  });
  res.json(lines);
});

router.post('/:id/bom', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const { materialId, quantityPer, unitOfMeasure } = req.body as Record<string, unknown>;
  if (!materialId)                      { res.status(400).json({ error: 'materialId is required' });    return; }
  if (quantityPer == null)              { res.status(400).json({ error: 'quantityPer is required' });   return; }
  if (!String(unitOfMeasure ?? '').trim()) { res.status(400).json({ error: 'unitOfMeasure is required' }); return; }

  const masterSpec = await prisma.masterSpec.findUnique({ where: { id: masterSpecId }, select: { id: true } });
  if (!masterSpec) { res.status(404).json({ error: 'Master spec not found' }); return; }

  try {
    const line = await prisma.bOMLine.create({
      data: {
        masterSpecId,
        materialId:   Number(materialId),
        quantityPer:  quantityPer as string | number,
        unitOfMeasure: String(unitOfMeasure).trim(),
      },
      include: { material: { select: { id: true, code: true, name: true, unitOfMeasure: true } } },
    });
    res.status(201).json(line);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'This material is already on the BOM — update the existing line' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Material not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/bom/:bid', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  const bomId     = parseInt(req.params.bid);
  if (isNaN(masterSpecId) || isNaN(bomId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { quantityPer, unitOfMeasure } = req.body as Record<string, unknown>;
  const d: Record<string, unknown> = {};
  if (quantityPer   !== undefined) d.quantityPer   = quantityPer as string | number;
  if (unitOfMeasure !== undefined) d.unitOfMeasure = String(unitOfMeasure).trim();

  try {
    const line = await prisma.bOMLine.update({
      where: { id: bomId, masterSpecId },
      data:  d as any,
      include: { material: { select: { id: true, code: true, name: true, unitOfMeasure: true } } },
    });
    res.json(line);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'BOM line not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/bom/:bid', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  const bomId     = parseInt(req.params.bid);
  if (isNaN(masterSpecId) || isNaN(bomId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.bOMLine.delete({ where: { id: bomId, masterSpecId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'BOM line not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// BOX SPEC  /api/protected/master-specs/:id/box-spec
// =============================================================================

router.get('/:id/box-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const spec = await prisma.boxSpec.findUnique({ where: { masterSpecId } });
  if (!spec) { res.status(404).json({ error: 'No box spec for this master spec' }); return; }
  res.json(spec);
});

router.post('/:id/box-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const { lengthInches, widthInches, heightInches, outsideDimensions,
          style, hasDieCut, hasPerforations, notes } = req.body as Record<string, unknown>;

  if (lengthInches == null) { res.status(400).json({ error: 'lengthInches is required' }); return; }
  if (widthInches  == null) { res.status(400).json({ error: 'widthInches is required' });  return; }
  if (heightInches == null) { res.status(400).json({ error: 'heightInches is required' }); return; }

  if (style !== undefined && !VALID_BOX_STYLES.includes(style as BoxStyle)) {
    res.status(400).json({ error: `style must be one of: ${VALID_BOX_STYLES.join(', ')}` }); return;
  }

  const masterSpec = await prisma.masterSpec.findUnique({ where: { id: masterSpecId }, select: { id: true } });
  if (!masterSpec) { res.status(404).json({ error: 'Master spec not found' }); return; }

  try {
    const spec = await prisma.boxSpec.create({
      data: {
        masterSpecId,
        lengthInches:      lengthInches as string | number,
        widthInches:       widthInches  as string | number,
        heightInches:      heightInches as string | number,
        outsideDimensions: outsideDimensions != null ? Boolean(outsideDimensions) : false,
        style:             (style as BoxStyle | undefined) ?? 'RSC',
        hasDieCut:         hasDieCut         != null ? Boolean(hasDieCut)         : false,
        hasPerforations:   hasPerforations   != null ? Boolean(hasPerforations)   : false,
        notes:             notes             != null ? String(notes).trim()       : null,
      },
    });
    res.status(201).json(spec);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Box spec already exists — use PUT to update' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/box-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  if (!await prisma.boxSpec.findUnique({ where: { masterSpecId } })) {
    res.status(404).json({ error: 'No box spec found — use POST to create one' }); return;
  }

  const { lengthInches, widthInches, heightInches, outsideDimensions,
          style, hasDieCut, hasPerforations, notes } = req.body as Record<string, unknown>;

  if (style !== undefined && !VALID_BOX_STYLES.includes(style as BoxStyle)) {
    res.status(400).json({ error: `style must be one of: ${VALID_BOX_STYLES.join(', ')}` }); return;
  }

  const d: Record<string, unknown> = {};
  if (lengthInches      !== undefined) d.lengthInches      = lengthInches as string | number;
  if (widthInches       !== undefined) d.widthInches       = widthInches  as string | number;
  if (heightInches      !== undefined) d.heightInches      = heightInches as string | number;
  if (outsideDimensions !== undefined) d.outsideDimensions = Boolean(outsideDimensions);
  if (style             !== undefined) d.style             = style as BoxStyle;
  if (hasDieCut         !== undefined) d.hasDieCut         = Boolean(hasDieCut);
  if (hasPerforations   !== undefined) d.hasPerforations   = Boolean(hasPerforations);
  if (notes             !== undefined) d.notes             = notes != null ? String(notes).trim() : null;

  try {
    const spec = await prisma.boxSpec.update({ where: { masterSpecId }, data: d as any });
    res.json(spec);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/box-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }
  try {
    await prisma.boxSpec.delete({ where: { masterSpecId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Box spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// BLANK SPEC  /api/protected/master-specs/:id/blank-spec
// =============================================================================

function validateBlankSpecBody(body: Record<string, unknown>, isCreate: boolean): string | null {
  if (isCreate) {
    if (!body.materialId)                         return 'materialId is required';
    if (body.blankLengthInches == null)           return 'blankLengthInches is required';
    if (body.blankWidthInches  == null)           return 'blankWidthInches is required';
    if (!body.boardGrade || !String(body.boardGrade).trim()) return 'boardGrade is required';
    if (body.scoreCount == null)                  return 'scoreCount is required';
  }
  if (body.grainDirection !== undefined && !VALID_GRAINS.includes(body.grainDirection as GrainDirection))
    return `grainDirection must be one of: ${VALID_GRAINS.join(', ')}`;
  if (body.flute          !== undefined && !VALID_FLUTES.includes(body.flute as Flute))
    return `flute must be one of: ${VALID_FLUTES.join(', ')}`;
  if (body.wallType       !== undefined && !VALID_WALL_TYPES.includes(body.wallType as WallType))
    return `wallType must be one of: ${VALID_WALL_TYPES.join(', ')}`;
  if (body.printType      !== undefined && !VALID_PRINT_TYPES.includes(body.printType as PrintType))
    return `printType must be one of: ${VALID_PRINT_TYPES.join(', ')}`;
  if (body.coating        !== undefined && !VALID_COATINGS.includes(body.coating as CoatingType))
    return `coating must be one of: ${VALID_COATINGS.join(', ')}`;
  if (body.jointType      !== undefined && !VALID_JOINTS.includes(body.jointType as JointType))
    return `jointType must be one of: ${VALID_JOINTS.join(', ')}`;
  return null;
}

function buildBlankSpecData(body: Record<string, unknown>): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  const num  = (v: unknown) => v != null ? (v as string | number) : null;
  const str  = (v: unknown) => v != null ? String(v).trim() : null;
  const int  = (v: unknown) => v != null ? Number(v) : null;

  if (body.materialId         !== undefined) d.materialId         = Number(body.materialId);
  if (body.outsPerSheet       !== undefined) d.outsPerSheet       = Number(body.outsPerSheet);
  if (body.sheetsPerBox       !== undefined) d.sheetsPerBox       = num(body.sheetsPerBox);
  if (body.sheetLengthInches  !== undefined) d.sheetLengthInches  = num(body.sheetLengthInches);
  if (body.sheetWidthInches   !== undefined) d.sheetWidthInches   = num(body.sheetWidthInches);
  if (body.layoutNotes        !== undefined) d.layoutNotes        = str(body.layoutNotes);
  if (body.rollWidthRequired  !== undefined) d.rollWidthRequired  = num(body.rollWidthRequired);
  if (body.requiredDieId      !== undefined) d.requiredDieId      = body.requiredDieId != null ? Number(body.requiredDieId) : null;
  if (body.requiredPlateIds   !== undefined) d.requiredPlateIds   = str(body.requiredPlateIds);
  if (body.materialVariantId  !== undefined) d.materialVariantId  = body.materialVariantId != null ? Number(body.materialVariantId) : null;
  if (body.blankLengthInches  !== undefined) d.blankLengthInches  = num(body.blankLengthInches);
  if (body.blankWidthInches   !== undefined) d.blankWidthInches   = num(body.blankWidthInches);
  if (body.grainDirection     !== undefined) d.grainDirection     = body.grainDirection as GrainDirection;
  if (body.boardGrade         !== undefined) d.boardGrade         = String(body.boardGrade).trim();
  if (body.flute              !== undefined) d.flute              = body.flute as Flute;
  if (body.wallType           !== undefined) d.wallType           = body.wallType as WallType;
  if (body.scoreCount         !== undefined) d.scoreCount         = Number(body.scoreCount);
  if (body.scorePositions     !== undefined) d.scorePositions     = typeof body.scorePositions === 'string'
    ? body.scorePositions : JSON.stringify(body.scorePositions);
  if (body.slotDepth          !== undefined) d.slotDepth          = num(body.slotDepth);
  if (body.slotWidth          !== undefined) d.slotWidth          = num(body.slotWidth);
  if (body.specialCuts        !== undefined) d.specialCuts        = str(body.specialCuts);
  if (body.trimAmount         !== undefined) d.trimAmount         = num(body.trimAmount);
  if (body.jointType          !== undefined) d.jointType          = body.jointType as JointType;
  if (body.printType          !== undefined) d.printType          = body.printType as PrintType;
  if (body.printColors        !== undefined) d.printColors        = Number(body.printColors);
  if (body.inkTypes           !== undefined) d.inkTypes           = str(body.inkTypes);
  if (body.plateNumbers       !== undefined) d.plateNumbers       = str(body.plateNumbers);
  if (body.coating            !== undefined) d.coating            = body.coating as CoatingType;
  if (body.bundleCount        !== undefined) d.bundleCount        = int(body.bundleCount);
  if (body.tieHigh            !== undefined) d.tieHigh            = int(body.tieHigh);
  if (body.tierWide           !== undefined) d.tierWide           = int(body.tierWide);
  if (body.palletsPerOrder    !== undefined) d.palletsPerOrder    = int(body.palletsPerOrder);
  if (body.notes              !== undefined) d.notes              = str(body.notes);
  return d;
}

const BLANK_SPEC_INCLUDE = {
  material:        { select: { id: true, code: true, name: true, unitOfMeasure: true } },
  requiredDie:     { select: { id: true, toolNumber: true, type: true, condition: true } },
  materialVariant: { select: { id: true, variantCode: true, description: true, rollWidth: true, sheetLength: true, sheetWidth: true } },
};

router.get('/:id/blank-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const spec = await prisma.blankSpec.findUnique({ where: { masterSpecId }, include: BLANK_SPEC_INCLUDE });
  if (!spec) { res.status(404).json({ error: 'No blank spec for this master spec' }); return; }
  res.json(spec);
});

router.post('/:id/blank-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const body = req.body as Record<string, unknown>;
  const err  = validateBlankSpecBody(body, true);
  if (err) { res.status(400).json({ error: err }); return; }

  const masterSpec = await prisma.masterSpec.findUnique({ where: { id: masterSpecId }, select: { id: true } });
  if (!masterSpec) { res.status(404).json({ error: 'Master spec not found' }); return; }

  const data = buildBlankSpecData(body);
  // Required defaults for create
  data.masterSpecId   = masterSpecId;
  if (!data.grainDirection) data.grainDirection = 'LONG_GRAIN';
  if (!data.flute)          data.flute          = 'C';
  if (!data.wallType)       data.wallType       = 'SINGLE';
  if (!data.jointType)      data.jointType      = 'GLUED';
  if (!data.scorePositions) data.scorePositions = '[]';

  try {
    const spec = await prisma.blankSpec.create({ data: data as any, include: BLANK_SPEC_INCLUDE });
    res.status(201).json(spec);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(409).json({ error: 'Blank spec already exists — use PUT to update' }); return; }
    if (e.code === 'P2003') { res.status(400).json({ error: 'Referenced material, die, or variant not found' }); return; }
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/blank-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  if (!await prisma.blankSpec.findUnique({ where: { masterSpecId } })) {
    res.status(404).json({ error: 'No blank spec found — use POST to create one' }); return;
  }

  const body = req.body as Record<string, unknown>;
  const err  = validateBlankSpecBody(body, false);
  if (err) { res.status(400).json({ error: err }); return; }

  const data = buildBlankSpecData(body);

  try {
    const spec = await prisma.blankSpec.update({ where: { masterSpecId }, data: data as any, include: BLANK_SPEC_INCLUDE });
    res.json(spec);
  } catch (e: any) {
    if (e.code === 'P2003') { res.status(400).json({ error: 'Referenced material, die, or variant not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/blank-spec', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }
  try {
    await prisma.blankSpec.delete({ where: { masterSpecId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Blank spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// FINISHED GOODS INVENTORY  /api/protected/master-specs/:id/inventory
// =============================================================================

router.get('/:id/inventory', async (req, res) => {
  const masterSpecId = parseInt(req.params.id);
  if (isNaN(masterSpecId)) { res.status(400).json({ error: 'Invalid master spec ID' }); return; }

  const rows = await prisma.finishedGoodsInventory.findMany({
    where: { masterSpecId },
    include: {
      location: { select: { id: true, name: true } },
      variant:  { select: { id: true, sku: true, variantDescription: true } },
    },
    orderBy: { location: { name: 'asc' } },
  });

  const totalQty = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
  res.json({ rows, totalQty });
});

export default router;
