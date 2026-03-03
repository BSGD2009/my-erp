import { Router } from 'express';
import { ContactType } from '@prisma/client';
import prisma from '../prisma';

const router = Router();

const CONTACT_TYPES = Object.values(ContactType);

// Auto-generate customer code from name: first 4 letters + 2-digit number
async function generateCode(name: string): Promise<string> {
  const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  for (let i = 1; i <= 99; i++) {
    const code = `${prefix}${String(i).padStart(2, '0')}`;
    const exists = await prisma.customer.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `${prefix}${Date.now() % 1000}`;
}

// ── GET /api/protected/customers ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, active, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (search) {
    where.OR = [
      { name:          { contains: search, mode: 'insensitive' } },
      { code:          { contains: search, mode: 'insensitive' } },
      { accountNumber: { contains: search, mode: 'insensitive' } },
      { city:          { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        paymentTerm:    { select: { id: true, termName: true } },
        defaultSalesRep: { select: { id: true, name: true } },
        _count: { select: { contacts: true, orders: true, shipToAddresses: true } },
      },
    }),
    prisma.customer.count({ where: where as any }),
  ]);
  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ── GET /api/protected/customers/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      paymentTerm:    { select: { id: true, termCode: true, termName: true, netDays: true } },
      defaultSalesRep: { select: { id: true, name: true } },
      contacts: {
        where:   { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
      shipToAddresses: {
        where:   { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { locationName: 'asc' }],
      },
      _count: { select: { orders: true, invoices: true } },
    },
  });
  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }
  res.json(customer);
});

// ── POST /api/protected/customers ────────────────────────────────────────────
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  const code = b.code ? String(b.code).trim().toUpperCase() : await generateCode(String(b.name));

  try {
    const customer = await prisma.customer.create({
      data: {
        code,
        name:                    String(b.name).trim(),
        accountNumber:           b.accountNumber           ? String(b.accountNumber).trim()           : null,
        taxId:                   b.taxId                   ? String(b.taxId).trim()                   : null,
        resaleCertificateNumber: b.resaleCertificateNumber ? String(b.resaleCertificateNumber).trim() : null,
        street:                  b.street                  ? String(b.street).trim()                  : null,
        city:                    b.city                    ? String(b.city).trim()                    : null,
        state:                   b.state                   ? String(b.state).trim()                   : null,
        zip:                     b.zip                     ? String(b.zip).trim()                     : null,
        country:                 b.country                 ? String(b.country).trim()                 : 'US',
        billingStreet:           b.billingStreet           ? String(b.billingStreet).trim()           : null,
        billingCity:             b.billingCity             ? String(b.billingCity).trim()             : null,
        billingState:            b.billingState            ? String(b.billingState).trim()            : null,
        billingZip:              b.billingZip              ? String(b.billingZip).trim()              : null,
        billingCountry:          b.billingCountry          ? String(b.billingCountry).trim()          : 'US',
        paymentTermId:           b.paymentTermId != null   ? Number(b.paymentTermId)                  : null,
        creditLimit:             b.creditLimit   != null   ? (b.creditLimit as number)                : null,
        creditHold:              b.creditHold    != null   ? Boolean(b.creditHold)                    : false,
        taxExempt:               b.taxExempt     != null   ? Boolean(b.taxExempt)                     : false,
        taxExemptId:             b.taxExemptId             ? String(b.taxExemptId).trim()             : null,
        defaultSalesRepId:       b.defaultSalesRepId != null ? Number(b.defaultSalesRepId)            : null,
        notes:                   b.notes                   ? String(b.notes).trim()                   : null,
      },
    });
    res.status(201).json(customer);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A customer with that code already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/protected/customers/:id ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;

  try {
    const d: Record<string, unknown> = {};
    if (b.code                    !== undefined) d.code                    = String(b.code).trim().toUpperCase();
    if (b.name                    !== undefined) d.name                    = String(b.name).trim();
    if (b.accountNumber           !== undefined) d.accountNumber           = b.accountNumber           ? String(b.accountNumber).trim()           : null;
    if (b.taxId                   !== undefined) d.taxId                   = b.taxId                   ? String(b.taxId).trim()                   : null;
    if (b.resaleCertificateNumber !== undefined) d.resaleCertificateNumber = b.resaleCertificateNumber ? String(b.resaleCertificateNumber).trim() : null;
    if (b.street                  !== undefined) d.street                  = b.street                  ? String(b.street).trim()                  : null;
    if (b.city                    !== undefined) d.city                    = b.city                    ? String(b.city).trim()                    : null;
    if (b.state                   !== undefined) d.state                   = b.state                   ? String(b.state).trim()                   : null;
    if (b.zip                     !== undefined) d.zip                     = b.zip                     ? String(b.zip).trim()                     : null;
    if (b.country                 !== undefined) d.country                 = b.country                 ? String(b.country).trim()                 : null;
    if (b.billingStreet           !== undefined) d.billingStreet           = b.billingStreet           ? String(b.billingStreet).trim()           : null;
    if (b.billingCity             !== undefined) d.billingCity             = b.billingCity             ? String(b.billingCity).trim()             : null;
    if (b.billingState            !== undefined) d.billingState            = b.billingState            ? String(b.billingState).trim()            : null;
    if (b.billingZip              !== undefined) d.billingZip              = b.billingZip              ? String(b.billingZip).trim()              : null;
    if (b.billingCountry          !== undefined) d.billingCountry          = b.billingCountry          ? String(b.billingCountry).trim()          : null;
    if (b.paymentTermId           !== undefined) d.paymentTermId           = b.paymentTermId  != null  ? Number(b.paymentTermId)                  : null;
    if (b.creditLimit             !== undefined) d.creditLimit             = b.creditLimit    != null  ? (b.creditLimit as number)                : null;
    if (b.creditHold              !== undefined) d.creditHold              = Boolean(b.creditHold);
    if (b.taxExempt               !== undefined) d.taxExempt               = Boolean(b.taxExempt);
    if (b.taxExemptId             !== undefined) d.taxExemptId             = b.taxExemptId             ? String(b.taxExemptId).trim()             : null;
    if (b.defaultSalesRepId       !== undefined) d.defaultSalesRepId       = b.defaultSalesRepId != null ? Number(b.defaultSalesRepId)            : null;
    if (b.notes                   !== undefined) d.notes                   = b.notes                   ? String(b.notes).trim()                   : null;
    if (b.isActive                !== undefined) d.isActive                = Boolean(b.isActive);

    const customer = await prisma.customer.update({ where: { id }, data: d as any });
    res.json(customer);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Customer not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'Code already in use' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/protected/customers/:id (soft delete) ────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    // Check for active orders
    const orderCount = await prisma.salesOrder.count({ where: { customerId: id, status: { notIn: ['CANCELLED', 'INVOICED'] } } });
    if (orderCount > 0) {
      res.status(409).json({ error: `Cannot deactivate: ${orderCount} active order(s) exist`, orderCount });
      return;
    }
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

router.get('/:id/contacts', async (req, res) => {
  const customerId = parseInt(req.params.id);
  if (isNaN(customerId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const contacts = await prisma.customerContact.findMany({
    where:   { customerId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
  res.json(contacts);
});

router.post('/:id/contacts', async (req, res) => {
  const customerId = parseInt(req.params.id);
  if (isNaN(customerId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { name, title, email, phone, contactType, isPrimary, invoiceDistribution } =
    req.body as Record<string, unknown>;

  if (!String(name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }
  if (!contactType || !CONTACT_TYPES.includes(contactType as ContactType)) {
    res.status(400).json({ error: `contactType must be one of: ${CONTACT_TYPES.join(', ')}` }); return;
  }

  try {
    if (isPrimary) {
      await prisma.customerContact.updateMany({ where: { customerId, isPrimary: true }, data: { isPrimary: false } });
    }

    const contact = await prisma.customerContact.create({
      data: {
        customerId,
        name:                String(name).trim(),
        title:               title ? String(title).trim() : null,
        email:               email ? String(email).trim() : null,
        phone:               phone ? String(phone).trim() : null,
        contactType:         contactType as ContactType,
        isPrimary:           isPrimary != null ? Boolean(isPrimary) : false,
        invoiceDistribution: invoiceDistribution != null ? Boolean(invoiceDistribution) : false,
      },
    });
    res.status(201).json(contact);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(404).json({ error: 'Customer not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/contacts/:contactId', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const contactId  = parseInt(req.params.contactId);
  if (isNaN(customerId) || isNaN(contactId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;

  if (b.contactType !== undefined && !CONTACT_TYPES.includes(b.contactType as ContactType)) {
    res.status(400).json({ error: `contactType must be one of: ${CONTACT_TYPES.join(', ')}` }); return;
  }

  try {
    const existing = await prisma.customerContact.findFirst({ where: { id: contactId, customerId } });
    if (!existing) { res.status(404).json({ error: 'Contact not found' }); return; }

    if (b.isPrimary) {
      await prisma.customerContact.updateMany({ where: { customerId, isPrimary: true, id: { not: contactId } }, data: { isPrimary: false } });
    }

    const d: Record<string, unknown> = {};
    if (b.name                !== undefined) d.name                = String(b.name).trim();
    if (b.title               !== undefined) d.title               = b.title ? String(b.title).trim() : null;
    if (b.email               !== undefined) d.email               = b.email ? String(b.email).trim() : null;
    if (b.phone               !== undefined) d.phone               = b.phone ? String(b.phone).trim() : null;
    if (b.contactType         !== undefined) d.contactType         = b.contactType as ContactType;
    if (b.isPrimary           !== undefined) d.isPrimary           = Boolean(b.isPrimary);
    if (b.invoiceDistribution !== undefined) d.invoiceDistribution = Boolean(b.invoiceDistribution);
    if (b.isActive            !== undefined) d.isActive            = Boolean(b.isActive);

    const contact = await prisma.customerContact.update({ where: { id: contactId }, data: d as any });
    res.json(contact);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Contact not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/contacts/:contactId', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const contactId  = parseInt(req.params.contactId);
  if (isNaN(customerId) || isNaN(contactId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const result = await prisma.customerContact.updateMany({ where: { id: contactId, customerId }, data: { isActive: false } });
    if (result.count === 0) { res.status(404).json({ error: 'Contact not found' }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SHIP-TO ADDRESSES sub-resource
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/ship-to', async (req, res) => {
  const customerId = parseInt(req.params.id);
  if (isNaN(customerId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const addresses = await prisma.shipToAddress.findMany({
    where:   { customerId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { locationName: 'asc' }],
  });
  res.json(addresses);
});

router.post('/:id/ship-to', async (req, res) => {
  const customerId = parseInt(req.params.id);
  if (isNaN(customerId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;
  if (!String(b.locationName ?? '').trim()) { res.status(400).json({ error: 'locationName is required' }); return; }

  try {
    if (b.isDefault) {
      await prisma.shipToAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
    }
    const addr = await prisma.shipToAddress.create({
      data: {
        customerId,
        locationName:         String(b.locationName).trim(),
        street:               b.street               ? String(b.street).trim()               : null,
        city:                 b.city                 ? String(b.city).trim()                 : null,
        state:                b.state                ? String(b.state).trim()                : null,
        zip:                  b.zip                  ? String(b.zip).trim()                  : null,
        country:              b.country              ? String(b.country).trim()              : 'US',
        contactName:          b.contactName          ? String(b.contactName).trim()          : null,
        contactPhone:         b.contactPhone         ? String(b.contactPhone).trim()         : null,
        contactEmail:         b.contactEmail         ? String(b.contactEmail).trim()         : null,
        isDefault:            b.isDefault != null ? Boolean(b.isDefault) : false,
        deliveryInstructions: b.deliveryInstructions ? String(b.deliveryInstructions).trim() : null,
      },
    });
    res.status(201).json(addr);
  } catch (err: any) {
    if (err.code === 'P2003') { res.status(404).json({ error: 'Customer not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/ship-to/:addrId', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const addrId     = parseInt(req.params.addrId);
  if (isNaN(customerId) || isNaN(addrId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const b = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.shipToAddress.findFirst({ where: { id: addrId, customerId } });
    if (!existing) { res.status(404).json({ error: 'Ship-to address not found' }); return; }

    if (b.isDefault) {
      await prisma.shipToAddress.updateMany({ where: { customerId, isDefault: true, id: { not: addrId } }, data: { isDefault: false } });
    }

    const d: Record<string, unknown> = {};
    if (b.locationName         !== undefined) d.locationName         = String(b.locationName).trim();
    if (b.street               !== undefined) d.street               = b.street               ? String(b.street).trim()               : null;
    if (b.city                 !== undefined) d.city                 = b.city                 ? String(b.city).trim()                 : null;
    if (b.state                !== undefined) d.state                = b.state                ? String(b.state).trim()                : null;
    if (b.zip                  !== undefined) d.zip                  = b.zip                  ? String(b.zip).trim()                  : null;
    if (b.country              !== undefined) d.country              = b.country              ? String(b.country).trim()              : null;
    if (b.contactName          !== undefined) d.contactName          = b.contactName          ? String(b.contactName).trim()          : null;
    if (b.contactPhone         !== undefined) d.contactPhone         = b.contactPhone         ? String(b.contactPhone).trim()         : null;
    if (b.contactEmail         !== undefined) d.contactEmail         = b.contactEmail         ? String(b.contactEmail).trim()         : null;
    if (b.isDefault            !== undefined) d.isDefault            = Boolean(b.isDefault);
    if (b.deliveryInstructions !== undefined) d.deliveryInstructions = b.deliveryInstructions ? String(b.deliveryInstructions).trim() : null;
    if (b.isActive             !== undefined) d.isActive             = Boolean(b.isActive);

    const addr = await prisma.shipToAddress.update({ where: { id: addrId }, data: d as any });
    res.json(addr);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Address not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/ship-to/:addrId', async (req, res) => {
  const customerId = parseInt(req.params.id);
  const addrId     = parseInt(req.params.addrId);
  if (isNaN(customerId) || isNaN(addrId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  try {
    const result = await prisma.shipToAddress.updateMany({ where: { id: addrId, customerId }, data: { isActive: false } });
    if (result.count === 0) { res.status(404).json({ error: 'Address not found' }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
