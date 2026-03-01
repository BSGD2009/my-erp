import { Router } from 'express';
import { ContactType } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const CONTACT_TYPES = Object.values(ContactType);

// ── GET /api/protected/customers ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where = {
    isActive: active === 'false' ? false : true,
    ...(search ? {
      OR: [
        { name:        { contains: search, mode: 'insensitive' as const } },
        { code:        { contains: search, mode: 'insensitive' as const } },
        { email:       { contains: search, mode: 'insensitive' as const } },
        { contactName: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { salesRep: { select: { id: true, name: true } } },
    }),
    prisma.customer.count({ where }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/customers/:id ─────────────────────────────────────────
// Returns the customer record plus all active contacts.
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesRep: { select: { id: true, name: true } },
      contacts: {
        where:   { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
    },
  });
  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }
  res.json(customer);
});

// ── POST /api/protected/customers ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    code, name, contactName, email, phone, address, billingAddress,
    paymentTerms, creditLimit, creditHold, taxExempt, taxExemptId, salesRepId, notes,
  } = req.body as Record<string, unknown>;

  if (!String(code ?? '').trim()) { res.status(400).json({ error: 'code is required' }); return; }
  if (!String(name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  try {
    const customer = await prisma.customer.create({
      data: {
        code:           String(code).trim().toUpperCase(),
        name:           String(name).trim(),
        contactName:    contactName    ? String(contactName).trim()    : null,
        email:          email          ? String(email).trim()          : null,
        phone:          phone          ? String(phone).trim()          : null,
        address:        address        ? String(address).trim()        : null,
        billingAddress: billingAddress ? String(billingAddress).trim() : null,
        paymentTerms:   paymentTerms   ? String(paymentTerms).trim()   : null,
        creditLimit:    creditLimit  != null ? (creditLimit as string | number)  : null,
        creditHold:     creditHold   != null ? Boolean(creditHold)     : false,
        taxExempt:      taxExempt    != null ? Boolean(taxExempt)      : false,
        taxExemptId:    taxExemptId    ? String(taxExemptId).trim()    : null,
        salesRepId:     salesRepId   != null ? Number(salesRepId)      : null,
        notes:          notes          ? String(notes).trim()          : null,
      },
    });
    res.status(201).json(customer);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A customer with that code already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Sales rep user not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/customers/:id ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const {
    code, name, contactName, email, phone, address, billingAddress,
    paymentTerms, creditLimit, creditHold, taxExempt, taxExemptId, salesRepId, notes, isActive,
  } = req.body as Record<string, unknown>;

  try {
    // Build imperatively — same pattern as materials.ts to avoid TS union issues
    // with nullable FK fields (salesRepId, creditLimit) in Prisma's generated types.
    const d: Record<string, unknown> = {};
    if (code           !== undefined) d.code           = String(code).trim().toUpperCase();
    if (name           !== undefined) d.name           = String(name).trim();
    if (contactName    !== undefined) d.contactName    = contactName    ? String(contactName).trim()    : null;
    if (email          !== undefined) d.email          = email          ? String(email).trim()          : null;
    if (phone          !== undefined) d.phone          = phone          ? String(phone).trim()          : null;
    if (address        !== undefined) d.address        = address        ? String(address).trim()        : null;
    if (billingAddress !== undefined) d.billingAddress = billingAddress ? String(billingAddress).trim() : null;
    if (paymentTerms   !== undefined) d.paymentTerms   = paymentTerms   ? String(paymentTerms).trim()   : null;
    if (creditLimit    !== undefined) d.creditLimit    = creditLimit  != null ? (creditLimit as string | number) : null;
    if (creditHold     !== undefined) d.creditHold     = Boolean(creditHold);
    if (taxExempt      !== undefined) d.taxExempt      = Boolean(taxExempt);
    if (taxExemptId    !== undefined) d.taxExemptId    = taxExemptId    ? String(taxExemptId).trim()    : null;
    if (salesRepId     !== undefined) d.salesRepId     = salesRepId  != null ? Number(salesRepId)       : null;
    if (notes          !== undefined) d.notes          = notes          ? String(notes).trim()          : null;
    if (isActive       !== undefined) d.isActive       = Boolean(isActive);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = await prisma.customer.update({ where: { id }, data: d as any });
    res.json(customer);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Customer not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Code already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Sales rep user not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/customers/:id (soft delete) ────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    await prisma.customer.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Customer not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER CONTACTS sub-resource
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/protected/customers/:id/contacts ────────────────────────────────
router.get('/:id/contacts', async (req, res) => {
  const customerId = parseInt(req.params.id);
  if (isNaN(customerId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const contacts = await prisma.customerContact.findMany({
    where:   { customerId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
  res.json(contacts);
});

// ── POST /api/protected/customers/:id/contacts ───────────────────────────────
router.post('/:id/contacts', async (req, res) => {
  const customerId = parseInt(req.params.id);
  if (isNaN(customerId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { name, title, email, phone, contactType, isPrimary } =
    req.body as Record<string, unknown>;

  if (!String(name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }
  if (!contactType || !CONTACT_TYPES.includes(contactType as ContactType)) {
    res.status(400).json({ error: `contactType must be one of: ${CONTACT_TYPES.join(', ')}` }); return;
  }

  try {
    // Only one primary contact per customer — clear others first.
    if (isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true },
        data:  { isPrimary: false },
      });
    }

    const contact = await prisma.customerContact.create({
      data: {
        customerId,
        name:        String(name).trim(),
        title:       title ? String(title).trim() : null,
        email:       email ? String(email).trim() : null,
        phone:       phone ? String(phone).trim() : null,
        contactType: contactType as ContactType,
        isPrimary:   isPrimary != null ? Boolean(isPrimary) : false,
      },
    });
    res.status(201).json(contact);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(404).json({ error: 'Customer not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/customers/:id/contacts/:contactId ─────────────────────
router.put('/:id/contacts/:contactId', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const contactId  = parseInt(req.params.contactId);
  if (isNaN(customerId) || isNaN(contactId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { name, title, email, phone, contactType, isPrimary, isActive } =
    req.body as Record<string, unknown>;

  if (contactType !== undefined && !CONTACT_TYPES.includes(contactType as ContactType)) {
    res.status(400).json({ error: `contactType must be one of: ${CONTACT_TYPES.join(', ')}` }); return;
  }

  try {
    // Verify ownership — findFirst allows non-unique compound filter
    const existing = await prisma.customerContact.findFirst({ where: { id: contactId, customerId } });
    if (!existing) { res.status(404).json({ error: 'Contact not found' }); return; }

    if (isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true, id: { not: contactId } },
        data:  { isPrimary: false },
      });
    }

    const contact = await prisma.customerContact.update({
      where: { id: contactId },
      data: {
        ...(name        !== undefined && { name:        String(name).trim() }),
        ...(title       !== undefined && { title:       title ? String(title).trim() : null }),
        ...(email       !== undefined && { email:       email ? String(email).trim() : null }),
        ...(phone       !== undefined && { phone:       phone ? String(phone).trim() : null }),
        ...(contactType !== undefined && { contactType: contactType as ContactType }),
        ...(isPrimary   !== undefined && { isPrimary:   Boolean(isPrimary) }),
        ...(isActive    !== undefined && { isActive:    Boolean(isActive) }),
      },
    });
    res.json(contact);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Contact not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/customers/:id/contacts/:contactId (soft delete) ────
router.delete('/:id/contacts/:contactId', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const contactId  = parseInt(req.params.contactId);
  if (isNaN(customerId) || isNaN(contactId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const result = await prisma.customerContact.updateMany({
      where: { id: contactId, customerId },
      data:  { isActive: false },
    });
    if (result.count === 0) { res.status(404).json({ error: 'Contact not found' }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
