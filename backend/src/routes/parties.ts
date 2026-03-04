import { Router } from 'express';
import { PartyRoleType } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const VALID_ROLE_TYPES = Object.values(PartyRoleType);

// Auto-generate partyCode from name: first 4 chars uppercase + 2-digit number
async function generatePartyCode(name: string): Promise<string> {
  const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  for (let i = 1; i <= 99; i++) {
    const code = `${prefix}${String(i).padStart(2, '0')}`;
    const exists = await prisma.party.findUnique({ where: { partyCode: code } });
    if (!exists) return code;
  }
  return `${prefix}${Date.now() % 1000}`;
}

// ── GET /api/protected/parties ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { active, search, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (search) {
    where.OR = [
      { name:      { contains: search, mode: 'insensitive' } },
      { partyCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.party.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        roles:  { orderBy: { roleType: 'asc' } },
        _count: { select: { contacts: true } },
      },
    }),
    prisma.party.count({ where: where as any }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/parties/:id ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      roles: { orderBy: { roleType: 'asc' } },
      contacts: {
        where:   { isActive: true },
        orderBy: { name: 'asc' },
      },
      customers: { select: { id: true, code: true, name: true, isActive: true } },
      suppliers: { select: { id: true, code: true, name: true, isActive: true } },
    },
  });
  if (!party) { res.status(404).json({ error: 'Party not found' }); return; }
  res.json(party);
});

// ── POST /api/protected/parties ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  const partyCode = b.partyCode
    ? String(b.partyCode).trim().toUpperCase()
    : await generatePartyCode(String(b.name));

  try {
    const party = await prisma.party.create({
      data: {
        partyCode,
        name: String(b.name).trim(),
      },
      include: {
        roles:  true,
        _count: { select: { contacts: true } },
      },
    });
    res.status(201).json(party);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A party with that code already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/parties/:id ──────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (b.partyCode !== undefined) d.partyCode = String(b.partyCode).trim().toUpperCase();
    if (b.name      !== undefined) d.name      = String(b.name).trim();
    if (b.isActive  !== undefined) d.isActive  = Boolean(b.isActive);

    const party = await prisma.party.update({
      where: { id },
      data: d as any,
      include: {
        roles:  { orderBy: { roleType: 'asc' } },
        _count: { select: { contacts: true } },
      },
    });
    res.json(party);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Party not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Party code already in use' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/parties/:id (soft delete) ─────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.party.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Party not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLES sub-resource
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/protected/parties/:id/roles ───────────────────────────────────
router.post('/:id/roles', async (req, res) => {
  const partyId = parseInt(req.params.id);
  if (isNaN(partyId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;
  if (!b.roleType || !VALID_ROLE_TYPES.includes(b.roleType as PartyRoleType)) {
    res.status(400).json({ error: `roleType must be one of: ${VALID_ROLE_TYPES.join(', ')}` }); return;
  }

  try {
    // Verify party exists
    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) { res.status(404).json({ error: 'Party not found' }); return; }

    const role = await prisma.partyRole.create({
      data: {
        partyId,
        roleType: b.roleType as PartyRoleType,
      },
    });
    res.status(201).json(role);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'This party already has that role' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/parties/:id/roles/:roleId (deactivate) ────────────
router.delete('/:id/roles/:roleId', async (req, res) => {
  const partyId = parseInt(req.params.id);
  const roleId  = parseInt(req.params.roleId);
  if (isNaN(partyId) || isNaN(roleId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    // Verify the role belongs to this party
    const role = await prisma.partyRole.findFirst({
      where: { id: roleId, partyId },
    });
    if (!role) { res.status(404).json({ error: 'Role not found' }); return; }

    await prisma.partyRole.update({
      where: { id: roleId },
      data:  { isActive: false },
    });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Role not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
