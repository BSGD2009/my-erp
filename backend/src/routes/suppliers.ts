import { Router } from 'express';
import { ContactType } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const CONTACT_TYPES = Object.values(ContactType);

async function generateCode(name: string): Promise<string> {
  const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  for (let i = 1; i <= 99; i++) {
    const code = `${prefix}${String(i).padStart(2, '0')}`;
    const exists = await prisma.supplier.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `${prefix}${Date.now() % 1000}`;
}

// ── GET / ───────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = { isActive: active === 'false' ? false : true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        paymentTerm: { select: { id: true, termName: true } },
        party: {
          include: {
            contacts: {
              where: { isActive: true, isPrimary: true },
              take: 1,
            },
          },
        },
        _count: { select: { purchaseOrders: true } },
      },
    }),
    prisma.supplier.count({ where: where as any }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /:id ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      paymentTerm: { select: { id: true, termCode: true, termName: true, netDays: true } },
      party: {
        include: {
          contacts: {
            where: { isActive: true },
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          },
        },
      },
      _count: { select: { purchaseOrders: true } },
    },
  });
  if (!supplier) { res.status(404).json({ error: 'Supplier not found' }); return; }
  res.json(supplier);
});

// ── POST / ──────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  const code = b.code ? String(b.code).trim().toUpperCase() : await generateCode(String(b.name));

  try {
    const supplier = await prisma.supplier.create({
      data: {
        code,
        name:           String(b.name).trim(),
        accountNumber:  b.accountNumber  ? String(b.accountNumber).trim()  : null,
        taxId:          b.taxId          ? String(b.taxId).trim()          : null,
        is1099Eligible: b.is1099Eligible != null ? Boolean(b.is1099Eligible) : false,
        name1099:       b.name1099       ? String(b.name1099).trim()       : null,
        street:         b.street         ? String(b.street).trim()         : null,
        city:           b.city           ? String(b.city).trim()           : null,
        state:          b.state          ? String(b.state).trim()          : null,
        zip:            b.zip            ? String(b.zip).trim()            : null,
        country:        b.country        ? String(b.country).trim()        : 'US',
        paymentTermId:  b.paymentTermId != null ? Number(b.paymentTermId)  : null,
        creditLimit:    b.creditLimit   != null ? (b.creditLimit as number) : null,
        w9OnFile:       b.w9OnFile != null ? Boolean(b.w9OnFile) : false,
        partyId:        b.partyId       != null ? Number(b.partyId)        : null,
      },
    });
    res.status(201).json(supplier);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A supplier with that code already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /:id ────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;
  try {
    const d: Record<string, unknown> = {};
    if (b.code           !== undefined) d.code           = String(b.code).trim().toUpperCase();
    if (b.name           !== undefined) d.name           = String(b.name).trim();
    if (b.accountNumber  !== undefined) d.accountNumber  = b.accountNumber  ? String(b.accountNumber).trim()  : null;
    if (b.taxId          !== undefined) d.taxId          = b.taxId          ? String(b.taxId).trim()          : null;
    if (b.is1099Eligible !== undefined) d.is1099Eligible = Boolean(b.is1099Eligible);
    if (b.name1099       !== undefined) d.name1099       = b.name1099       ? String(b.name1099).trim()       : null;
    if (b.street         !== undefined) d.street         = b.street         ? String(b.street).trim()         : null;
    if (b.city           !== undefined) d.city           = b.city           ? String(b.city).trim()           : null;
    if (b.state          !== undefined) d.state          = b.state          ? String(b.state).trim()          : null;
    if (b.zip            !== undefined) d.zip            = b.zip            ? String(b.zip).trim()            : null;
    if (b.country        !== undefined) d.country        = b.country        ? String(b.country).trim()        : null;
    if (b.paymentTermId  !== undefined) d.paymentTermId  = b.paymentTermId != null ? Number(b.paymentTermId)  : null;
    if (b.creditLimit    !== undefined) d.creditLimit    = b.creditLimit   != null ? (b.creditLimit as number) : null;
    if (b.w9OnFile       !== undefined) d.w9OnFile       = Boolean(b.w9OnFile);
    if (b.isActive       !== undefined) d.isActive       = Boolean(b.isActive);
    if (b.partyId        !== undefined) d.partyId        = b.partyId       != null ? Number(b.partyId)        : null;

    const supplier = await prisma.supplier.update({ where: { id }, data: d as any });
    res.json(supplier);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Supplier not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Code already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /:id ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id, status: { notIn: ['CANCELLED', 'RECEIVED'] } } });
    if (poCount > 0) {
      res.status(409).json({ error: `Cannot deactivate: ${poCount} active PO(s) exist`, poCount });
      return;
    }
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Supplier not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CONTACTS sub-resource (via Party → PartyContact) ──────────────────────

// Helper: look up supplier and return its partyId, or send error response
async function getSupplierPartyId(req: any, res: any): Promise<number | null> {
  const supplierId = parseInt(req.params.id);
  if (isNaN(supplierId)) { res.status(400).json({ error: 'Invalid ID' }); return null; }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, partyId: true },
  });
  if (!supplier) { res.status(404).json({ error: 'Supplier not found' }); return null; }
  if (!supplier.partyId) { res.status(400).json({ error: 'Supplier has no linked party. Set partyId first.' }); return null; }
  return supplier.partyId;
}

router.get('/:id/contacts', async (req, res) => {
  const supplierId = parseInt(req.params.id);
  if (isNaN(supplierId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, partyId: true },
  });
  if (!supplier) { res.status(404).json({ error: 'Supplier not found' }); return; }

  // If no party linked yet, return empty array (not an error)
  if (!supplier.partyId) { res.json([]); return; }

  const contacts = await prisma.partyContact.findMany({
    where: { partyId: supplier.partyId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
  res.json(contacts);
});

router.post('/:id/contacts', async (req, res) => {
  const partyId = await getSupplierPartyId(req, res);
  if (partyId === null) return;

  const b = req.body as Record<string, unknown>;
  if (!b.contactType || !CONTACT_TYPES.includes(b.contactType as ContactType)) {
    res.status(400).json({ error: `contactType must be one of: ${CONTACT_TYPES.join(', ')}` }); return;
  }

  try {
    if (b.isPrimary) {
      await prisma.partyContact.updateMany({ where: { partyId, isPrimary: true }, data: { isPrimary: false } });
    }
    const contact = await prisma.partyContact.create({
      data: {
        partyId,
        name:                b.name  ? String(b.name).trim()  : null,
        title:               b.title ? String(b.title).trim() : null,
        email:               b.email ? String(b.email).trim() : null,
        phone:               b.phone ? String(b.phone).trim() : null,
        contactType:         b.contactType as ContactType,
        isPrimary:           b.isPrimary != null ? Boolean(b.isPrimary) : false,
        invoiceDistribution: b.invoiceDistribution != null ? Boolean(b.invoiceDistribution) : false,
      },
    });
    res.status(201).json(contact);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(404).json({ error: 'Party not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/contacts/:contactId', async (req, res) => {
  const partyId = await getSupplierPartyId(req, res);
  if (partyId === null) return;

  const contactId = parseInt(req.params.contactId);
  if (isNaN(contactId)) { res.status(400).json({ error: 'Invalid contact ID' }); return; }

  const b = req.body as Record<string, unknown>;
  try {
    const existing = await prisma.partyContact.findFirst({ where: { id: contactId, partyId } });
    if (!existing) { res.status(404).json({ error: 'Contact not found' }); return; }

    if (b.isPrimary) {
      await prisma.partyContact.updateMany({ where: { partyId, isPrimary: true, id: { not: contactId } }, data: { isPrimary: false } });
    }

    const d: Record<string, unknown> = {};
    if (b.name                !== undefined) d.name                = b.name  ? String(b.name).trim()  : null;
    if (b.title               !== undefined) d.title               = b.title ? String(b.title).trim() : null;
    if (b.email               !== undefined) d.email               = b.email ? String(b.email).trim() : null;
    if (b.phone               !== undefined) d.phone               = b.phone ? String(b.phone).trim() : null;
    if (b.contactType         !== undefined) d.contactType         = b.contactType as ContactType;
    if (b.isPrimary           !== undefined) d.isPrimary           = Boolean(b.isPrimary);
    if (b.invoiceDistribution !== undefined) d.invoiceDistribution = Boolean(b.invoiceDistribution);
    if (b.isActive            !== undefined) d.isActive            = Boolean(b.isActive);

    const contact = await prisma.partyContact.update({ where: { id: contactId }, data: d as any });
    res.json(contact);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Contact not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/contacts/:contactId', async (req, res) => {
  const partyId = await getSupplierPartyId(req, res);
  if (partyId === null) return;

  const contactId = parseInt(req.params.contactId);
  if (isNaN(contactId)) { res.status(400).json({ error: 'Invalid contact ID' }); return; }

  try {
    const result = await prisma.partyContact.updateMany({ where: { id: contactId, partyId }, data: { isActive: false } });
    if (result.count === 0) { res.status(404).json({ error: 'Contact not found' }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
