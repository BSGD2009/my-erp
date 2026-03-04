import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ── GET /api/protected/board-grades ─────────────────────────────────────────
router.get('/', async (_req, res) => {
  const grades = await prisma.boardGrade.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(grades);
});

// ── GET /api/protected/board-grades/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  const grade = await prisma.boardGrade.findUnique({ where: { id } });
  if (!grade) { res.status(404).json({ error: 'Board grade not found' }); return; }
  res.json(grade);
});

// ── POST /api/protected/board-grades ────────────────────────────────────────
router.post('/', async (req, res) => {
  const { gradeCode, gradeName, wallType, nominalCaliper, description, sortOrder } =
    req.body as Record<string, unknown>;

  if (!String(gradeCode ?? '').trim()) { res.status(400).json({ error: 'gradeCode is required' }); return; }
  if (!String(gradeName ?? '').trim()) { res.status(400).json({ error: 'gradeName is required' }); return; }
  if (!String(wallType  ?? '').trim()) { res.status(400).json({ error: 'wallType is required' });  return; }
  if (nominalCaliper == null)          { res.status(400).json({ error: 'nominalCaliper is required' }); return; }

  try {
    const grade = await prisma.boardGrade.create({
      data: {
        gradeCode:      String(gradeCode).trim().toUpperCase(),
        gradeName:      String(gradeName).trim(),
        wallType:       String(wallType).trim().toUpperCase(),
        nominalCaliper: Number(nominalCaliper),
        description:    description != null ? String(description).trim() : null,
        sortOrder:      sortOrder   != null ? Number(sortOrder) : 0,
      },
    });
    res.status(201).json(grade);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A board grade with that code already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/board-grades/:id ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { gradeCode, gradeName, wallType, nominalCaliper, description, sortOrder, isActive } =
    req.body as Record<string, unknown>;

  const d: Record<string, unknown> = {};
  if (gradeCode      !== undefined) d.gradeCode      = String(gradeCode).trim().toUpperCase();
  if (gradeName      !== undefined) d.gradeName      = String(gradeName).trim();
  if (wallType       !== undefined) d.wallType       = String(wallType).trim().toUpperCase();
  if (nominalCaliper !== undefined) d.nominalCaliper = Number(nominalCaliper);
  if (description    !== undefined) d.description    = description != null ? String(description).trim() : null;
  if (sortOrder      !== undefined) d.sortOrder      = Number(sortOrder);
  if (isActive       !== undefined) d.isActive       = Boolean(isActive);

  try {
    const grade = await prisma.boardGrade.update({ where: { id }, data: d as any });
    res.json(grade);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Board grade not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Grade code already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/board-grades/:id (soft delete) ────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const variantCount = await prisma.productVariant.count({ where: { boardGradeId: id } });
  if (variantCount > 0) {
    res.status(409).json({ error: `Cannot deactivate: referenced by ${variantCount} variant(s)` });
    return;
  }

  try {
    await prisma.boardGrade.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Board grade not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
