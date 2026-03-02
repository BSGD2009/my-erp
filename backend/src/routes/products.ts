import { Router } from 'express';
import {
  ProductType, BoxStyle, Flute, WallType, PrintType, CoatingType,
  GrainDirection, JointType,
} from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_PRODUCT_TYPES = Object.values(ProductType);
const VALID_BOX_STYLES    = Object.values(BoxStyle);
const VALID_FLUTES        = Object.values(Flute);
const VALID_WALL_TYPES    = Object.values(WallType);
const VALID_PRINT_TYPES   = Object.values(PrintType);
const VALID_COATINGS      = Object.values(CoatingType);
const VALID_GRAINS        = Object.values(GrainDirection);
const VALID_JOINTS        = Object.values(JointType);

// ── GET /api/protected/products ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, productType, categoryId, isCustom,
          page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (productType && VALID_PRODUCT_TYPES.includes(productType as ProductType)) {
    where.productType = productType as ProductType;
  }
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
    prisma.product.findMany({
      where,
      orderBy: [{ productType: 'asc' }, { name: 'asc' }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        category: { select: { id: true, name: true } },
        _count:   { select: { variants: true, bomLines: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/products/:id ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category:  { select: { id: true, name: true } },
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
    },
  });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
  res.json(product);
});

// ── POST /api/protected/products ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { sku, name, description, productType, categoryId, isCustom, listPrice } =
    req.body as Record<string, unknown>;

  if (!String(sku   ?? '').trim()) { res.status(400).json({ error: 'sku is required' });         return; }
  if (!String(name  ?? '').trim()) { res.status(400).json({ error: 'name is required' });        return; }
  if (!productType || !VALID_PRODUCT_TYPES.includes(productType as ProductType)) {
    res.status(400).json({ error: `productType must be one of: ${VALID_PRODUCT_TYPES.join(', ')}` }); return;
  }

  try {
    const product = await prisma.product.create({
      data: {
        sku:         String(sku).trim().toUpperCase(),
        name:        String(name).trim(),
        description: description != null ? String(description).trim() : null,
        productType: productType as ProductType,
        categoryId:  categoryId  != null ? Number(categoryId) : null,
        isCustom:    isCustom    != null ? Boolean(isCustom)  : false,
        listPrice:   listPrice   != null ? (listPrice as string | number) : null,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    res.status(201).json(product);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A product with that SKU already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Category not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/products/:id ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { sku, name, description, productType, categoryId, isCustom, listPrice, isActive } =
    req.body as Record<string, unknown>;

  if (productType !== undefined && !VALID_PRODUCT_TYPES.includes(productType as ProductType)) {
    res.status(400).json({ error: `productType must be one of: ${VALID_PRODUCT_TYPES.join(', ')}` }); return;
  }

  const d: Record<string, unknown> = {};
  if (sku         !== undefined) d.sku         = String(sku).trim().toUpperCase();
  if (name        !== undefined) d.name        = String(name).trim();
  if (description !== undefined) d.description = description != null ? String(description).trim() : null;
  if (productType !== undefined) d.productType = productType as ProductType;
  if (categoryId  !== undefined) d.categoryId  = categoryId  != null ? Number(categoryId)  : null;
  if (isCustom    !== undefined) d.isCustom    = Boolean(isCustom);
  if (listPrice   !== undefined) d.listPrice   = listPrice   != null ? (listPrice as string | number) : null;
  if (isActive    !== undefined) d.isActive    = Boolean(isActive);

  try {
    const product = await prisma.product.update({
      where: { id },
      data:  d as any,
      include: { category: { select: { id: true, name: true } } },
    });
    res.json(product);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Product not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'SKU already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/products/:id (soft delete) ─────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Product not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// VARIANTS  /api/protected/products/:id/variants
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/variants', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const { active } = req.query as Record<string, string>;
  const variants = await prisma.productVariant.findMany({
    where: {
      productId,
      ...(active === 'false' ? {} : { isActive: true }),
    },
    orderBy: { sku: 'asc' },
  });
  res.json(variants);
});

router.post('/:id/variants', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const { sku, variantDescription, width, length, thickness,
          bundleQty, caseQty, listPrice } = req.body as Record<string, unknown>;

  if (!String(sku ?? '').trim()) { res.status(400).json({ error: 'sku is required' }); return; }

  // Verify parent product exists
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId,
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
  const productId = parseInt(req.params.id);
  const variantId = parseInt(req.params.vid);
  if (isNaN(productId) || isNaN(variantId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

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
      where: { id: variantId, productId },
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
  const productId = parseInt(req.params.id);
  const variantId = parseInt(req.params.vid);
  if (isNaN(productId) || isNaN(variantId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.productVariant.update({
      where: { id: variantId, productId },
      data:  { isActive: false },
    });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Variant not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SPECS  /api/protected/products/:id/specs
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/specs', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }
  const specs = await prisma.productSpec.findMany({
    where: { productId },
    orderBy: [{ sortOrder: 'asc' }, { specKey: 'asc' }],
  });
  res.json(specs);
});

router.post('/:id/specs', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const { variantId, specKey, specValue, specUnit, sortOrder } = req.body as Record<string, unknown>;
  if (!String(specKey   ?? '').trim()) { res.status(400).json({ error: 'specKey is required' });   return; }
  if (!String(specValue ?? '').trim()) { res.status(400).json({ error: 'specValue is required' }); return; }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

  try {
    const spec = await prisma.productSpec.create({
      data: {
        productId,
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
  const productId = parseInt(req.params.id);
  const specId    = parseInt(req.params.sid);
  if (isNaN(productId) || isNaN(specId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { specKey, specValue, specUnit, sortOrder } = req.body as Record<string, unknown>;
  const d: Record<string, unknown> = {};
  if (specKey   !== undefined) d.specKey   = String(specKey).trim();
  if (specValue !== undefined) d.specValue = String(specValue).trim();
  if (specUnit  !== undefined) d.specUnit  = specUnit  != null ? String(specUnit).trim() : null;
  if (sortOrder !== undefined) d.sortOrder = sortOrder != null ? Number(sortOrder)       : null;

  try {
    const spec = await prisma.productSpec.update({ where: { id: specId, productId }, data: d as any });
    res.json(spec);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/specs/:sid', async (req, res) => {
  const productId = parseInt(req.params.id);
  const specId    = parseInt(req.params.sid);
  if (isNaN(productId) || isNaN(specId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.productSpec.delete({ where: { id: specId, productId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// BOM LINES  /api/protected/products/:id/bom
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/bom', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }
  const lines = await prisma.bOMLine.findMany({
    where: { productId },
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
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const { materialId, quantityPer, unitOfMeasure } = req.body as Record<string, unknown>;
  if (!materialId)                      { res.status(400).json({ error: 'materialId is required' });    return; }
  if (quantityPer == null)              { res.status(400).json({ error: 'quantityPer is required' });   return; }
  if (!String(unitOfMeasure ?? '').trim()) { res.status(400).json({ error: 'unitOfMeasure is required' }); return; }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

  try {
    const line = await prisma.bOMLine.create({
      data: {
        productId,
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
  const productId = parseInt(req.params.id);
  const bomId     = parseInt(req.params.bid);
  if (isNaN(productId) || isNaN(bomId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { quantityPer, unitOfMeasure } = req.body as Record<string, unknown>;
  const d: Record<string, unknown> = {};
  if (quantityPer   !== undefined) d.quantityPer   = quantityPer as string | number;
  if (unitOfMeasure !== undefined) d.unitOfMeasure = String(unitOfMeasure).trim();

  try {
    const line = await prisma.bOMLine.update({
      where: { id: bomId, productId },
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
  const productId = parseInt(req.params.id);
  const bomId     = parseInt(req.params.bid);
  if (isNaN(productId) || isNaN(bomId)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    await prisma.bOMLine.delete({ where: { id: bomId, productId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'BOM line not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// BOX SPEC  /api/protected/products/:id/box-spec
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/box-spec', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const spec = await prisma.boxSpec.findUnique({ where: { productId } });
  if (!spec) { res.status(404).json({ error: 'No box spec for this product' }); return; }
  res.json(spec);
});

router.post('/:id/box-spec', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const { lengthInches, widthInches, heightInches, outsideDimensions,
          style, hasDieCut, hasPerforations, notes } = req.body as Record<string, unknown>;

  if (lengthInches == null) { res.status(400).json({ error: 'lengthInches is required' }); return; }
  if (widthInches  == null) { res.status(400).json({ error: 'widthInches is required' });  return; }
  if (heightInches == null) { res.status(400).json({ error: 'heightInches is required' }); return; }

  if (style !== undefined && !VALID_BOX_STYLES.includes(style as BoxStyle)) {
    res.status(400).json({ error: `style must be one of: ${VALID_BOX_STYLES.join(', ')}` }); return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, productType: true } });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
  if (product.productType !== 'CORRUGATED_BOX') {
    res.status(400).json({ error: 'Box specs only apply to CORRUGATED_BOX products' }); return;
  }

  try {
    const spec = await prisma.boxSpec.create({
      data: {
        productId,
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
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  if (!await prisma.boxSpec.findUnique({ where: { productId } })) {
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
    const spec = await prisma.boxSpec.update({ where: { productId }, data: d as any });
    res.json(spec);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/box-spec', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }
  try {
    await prisma.boxSpec.delete({ where: { productId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Box spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// BLANK SPEC  /api/protected/products/:id/blank-spec
// ═════════════════════════════════════════════════════════════════════════════

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
  const bool = (v: unknown) => Boolean(v);

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
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const spec = await prisma.blankSpec.findUnique({ where: { productId }, include: BLANK_SPEC_INCLUDE });
  if (!spec) { res.status(404).json({ error: 'No blank spec for this product' }); return; }
  res.json(spec);
});

router.post('/:id/blank-spec', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const body = req.body as Record<string, unknown>;
  const err  = validateBlankSpecBody(body, true);
  if (err) { res.status(400).json({ error: err }); return; }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, productType: true } });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
  if (product.productType !== 'CORRUGATED_BOX') {
    res.status(400).json({ error: 'Blank specs only apply to CORRUGATED_BOX products' }); return;
  }

  const data = buildBlankSpecData(body);
  // Required defaults for create
  data.productId      = productId;
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
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  if (!await prisma.blankSpec.findUnique({ where: { productId } })) {
    res.status(404).json({ error: 'No blank spec found — use POST to create one' }); return;
  }

  const body = req.body as Record<string, unknown>;
  const err  = validateBlankSpecBody(body, false);
  if (err) { res.status(400).json({ error: err }); return; }

  const data = buildBlankSpecData(body);

  try {
    const spec = await prisma.blankSpec.update({ where: { productId }, data: data as any, include: BLANK_SPEC_INCLUDE });
    res.json(spec);
  } catch (e: any) {
    if (e.code === 'P2003') { res.status(400).json({ error: 'Referenced material, die, or variant not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/blank-spec', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }
  try {
    await prisma.blankSpec.delete({ where: { productId } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Blank spec not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// FINISHED GOODS INVENTORY  /api/protected/products/:id/inventory
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/inventory', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

  const rows = await prisma.finishedGoodsInventory.findMany({
    where: { productId },
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
