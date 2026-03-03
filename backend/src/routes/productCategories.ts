import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/product-categories ────────────────────────────────────
// Returns flat list. Use ?tree=true for nested hierarchy.
router.get('/', async (req, res) => {
  const { active, tree, moduleId } = req.query as { active?: string; tree?: string; moduleId?: string };

  const where: Record<string, unknown> = { isActive: active === 'false' ? false : true };
  if (moduleId) where.moduleId = parseInt(moduleId);

  const categories = await prisma.productCategory.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      module: { select: { id: true, moduleKey: true, moduleName: true } },
      _count: { select: { masterSpecs: true, children: true } },
    },
  });

  if (tree === 'true') {
    // Build nested tree from flat list
    type CatWithChildren = typeof categories[0] & { children: CatWithChildren[] };
    const map = new Map<number, CatWithChildren>();
    categories.forEach(c => map.set(c.id, { ...c, children: [] }));

    const roots: CatWithChildren[] = [];
    map.forEach(node => {
      if (node.parentId === null) {
        roots.push(node);
      } else {
        const parent = map.get(node.parentId);
        if (parent) parent.children.push(node);
      }
    });
    res.json(roots);
    return;
  }

  res.json(categories);
});

// ── GET /api/protected/product-categories/:id ────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      parent:   { select: { id: true, name: true } },
      module:   { select: { id: true, moduleKey: true, moduleName: true } },
      children: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      _count:   { select: { masterSpecs: true } },
    },
  });
  if (!category) { res.status(404).json({ error: 'Category not found' }); return; }
  res.json(category);
});

// ── POST /api/protected/product-categories ────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, parentId, moduleId, description, sortOrder } = req.body as {
    name?: string; parentId?: number | null; moduleId?: number | null;
    description?: string; sortOrder?: number;
  };
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

  try {
    const category = await prisma.productCategory.create({
      data: {
        name:        name.trim(),
        parentId:    parentId ?? null,
        moduleId:    moduleId ?? null,
        description: description?.trim() || null,
        sortOrder:   sortOrder ?? null,
      },
    });
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(400).json({ error: 'Parent category not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/product-categories/:id ────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { name, parentId, moduleId, description, sortOrder, isActive } = req.body as {
    name?: string; parentId?: number | null; moduleId?: number | null;
    description?: string; sortOrder?: number | null; isActive?: boolean;
  };

  // Guard: cannot set a category as its own parent
  if (parentId === id) {
    res.status(400).json({ error: 'A category cannot be its own parent' }); return;
  }

  try {
    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name:        name.trim() }),
        ...(parentId    !== undefined && { parentId:    parentId ?? null }),
        ...(moduleId    !== undefined && { moduleId:    moduleId ?? null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(sortOrder   !== undefined && { sortOrder:   sortOrder ?? null }),
        ...(isActive    !== undefined && { isActive }),
      },
    });
    res.json(category);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Category not found' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Parent category not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/product-categories/:id (soft delete) ────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.productCategory.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Category not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
