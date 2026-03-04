import { Router, Request, Response } from 'express';
import { ContactType } from '@prisma/client';
import prisma from '../prisma';
import { requireRole } from '../middleware/auth';

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
  const { search, active, acquisitionStatus, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const where: Record<string, unknown> = {
    isActive: active === 'false' ? false : true,
  };
  if (acquisitionStatus) {
    const statuses = String(acquisitionStatus).split(',').map(s => s.trim());
    where.acquisitionStatus = { in: statuses };
  }
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
        party: {
          include: {
            contacts: { where: { isPrimary: true, isActive: true }, take: 1 },
          },
        },
        paymentTerm:     { select: { id: true, termName: true } },
        defaultSalesRep: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
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
      party: {
        include: {
          contacts: {
            where:   { isActive: true },
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          },
        },
      },
      paymentTerm:     { select: { id: true, termCode: true, termName: true, netDays: true } },
      defaultSalesRep: { select: { id: true, name: true } },
      _count: { select: { orders: true, invoices: true } },
    },
  });
  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }

  // Fetch ship-to locations via partyId
  let shipToLocations: any[] = [];
  if (customer.partyId) {
    shipToLocations = await prisma.location.findMany({
      where: { partyId: customer.partyId, locationType: 'CUSTOMER', isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  res.json({ ...customer, shipToLocations });
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
        partyId:                 b.partyId != null            ? Number(b.partyId)                        : null,
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
        acquisitionStatus:       b.acquisitionStatus       ? (b.acquisitionStatus as any)               : null,
        leadSource:              b.leadSource              ? (b.leadSource as any)                      : null,
        competitorName:          b.competitorName          ? String(b.competitorName).trim()           : null,
        competitorRelationship:  b.competitorRelationship  ? (b.competitorRelationship as any)          : null,
        estimatedAnnualSpend:    b.estimatedAnnualSpend   != null ? Number(b.estimatedAnnualSpend)     : null,
        accountPotentialRating:  b.accountPotentialRating  ? (b.accountPotentialRating as any)          : null,
        otherProductsNeeded:     b.otherProductsNeeded    ? String(b.otherProductsNeeded).trim()      : null,
        currentSupplierNotes:    b.currentSupplierNotes   ? String(b.currentSupplierNotes).trim()     : null,
        blanketPoEligible:       b.blanketPoEligible      != null ? Boolean(b.blanketPoEligible)       : false,
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
    if (b.partyId                 !== undefined) d.partyId                 = b.partyId != null ? Number(b.partyId) : null;
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
    if (b.acquisitionStatus      !== undefined) d.acquisitionStatus      = b.acquisitionStatus || null;
    if (b.leadSource             !== undefined) d.leadSource             = b.leadSource || null;
    if (b.competitorName         !== undefined) d.competitorName         = b.competitorName ? String(b.competitorName).trim() : null;
    if (b.competitorRelationship !== undefined) d.competitorRelationship = b.competitorRelationship || null;
    if (b.estimatedAnnualSpend   !== undefined) d.estimatedAnnualSpend   = b.estimatedAnnualSpend != null ? Number(b.estimatedAnnualSpend) : null;
    if (b.accountPotentialRating !== undefined) d.accountPotentialRating  = b.accountPotentialRating || null;
    if (b.otherProductsNeeded    !== undefined) d.otherProductsNeeded    = b.otherProductsNeeded ? String(b.otherProductsNeeded).trim() : null;
    if (b.currentSupplierNotes   !== undefined) d.currentSupplierNotes   = b.currentSupplierNotes ? String(b.currentSupplierNotes).trim() : null;
    if (b.blanketPoEligible      !== undefined) d.blanketPoEligible      = Boolean(b.blanketPoEligible);

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
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
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
// CONTACTS sub-resource  (PartyContact via customer.partyId)
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve customer → partyId, or send 404/400 and return null */
async function resolvePartyId(req: Request, res: Response): Promise<number | null> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return null; }

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { partyId: true },
  });
  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return null; }
  if (!customer.partyId) { res.status(400).json({ error: 'Customer has no linked party — create or assign a party first' }); return null; }
  return customer.partyId;
}

router.get('/:id/contacts', async (req, res) => {
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const contacts = await prisma.partyContact.findMany({
    where:   { partyId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
  res.json(contacts);
});

router.post('/:id/contacts', async (req, res) => {
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const { name, title, email, phone, contactType, isPrimary, invoiceDistribution } =
    req.body as Record<string, unknown>;

  if (!contactType || !CONTACT_TYPES.includes(contactType as ContactType)) {
    res.status(400).json({ error: `contactType must be one of: ${CONTACT_TYPES.join(', ')}` }); return;
  }

  try {
    if (isPrimary) {
      await prisma.partyContact.updateMany({ where: { partyId, isPrimary: true }, data: { isPrimary: false } });
    }

    const contact = await prisma.partyContact.create({
      data: {
        partyId,
        name:                name ? String(name).trim() : null,
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
    if (err.code === 'P2003') { res.status(404).json({ error: 'Party not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/contacts/:contactId', async (req, res) => {
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const contactId = parseInt(req.params.contactId);
  if (isNaN(contactId)) { res.status(400).json({ error: 'Invalid contact ID' }); return; }

  const b = req.body as Record<string, unknown>;

  if (b.contactType !== undefined && !CONTACT_TYPES.includes(b.contactType as ContactType)) {
    res.status(400).json({ error: `contactType must be one of: ${CONTACT_TYPES.join(', ')}` }); return;
  }

  try {
    const existing = await prisma.partyContact.findFirst({ where: { id: contactId, partyId } });
    if (!existing) { res.status(404).json({ error: 'Contact not found for this customer' }); return; }

    if (b.isPrimary && !existing.isPrimary) {
      await prisma.partyContact.updateMany({ where: { partyId, isPrimary: true, id: { not: contactId } }, data: { isPrimary: false } });
    }

    const d: Record<string, unknown> = {};
    if (b.name                !== undefined) d.name                = b.name ? String(b.name).trim() : null;
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
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const contactId = parseInt(req.params.contactId);
  if (isNaN(contactId)) { res.status(400).json({ error: 'Invalid contact ID' }); return; }

  try {
    const result = await prisma.partyContact.updateMany({ where: { id: contactId, partyId }, data: { isActive: false } });
    if (result.count === 0) { res.status(404).json({ error: 'Contact not found for this customer' }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SHIP-TO ADDRESSES sub-resource  (Location with locationType CUSTOMER)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/ship-to', async (req, res) => {
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const locations = await prisma.location.findMany({
    where:   { partyId, locationType: 'CUSTOMER', isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  res.json(locations);
});

router.post('/:id/ship-to', async (req, res) => {
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const b = req.body as Record<string, unknown>;
  if (!String(b.name ?? '').trim()) { res.status(400).json({ error: 'name is required' }); return; }

  try {
    if (b.isDefault) {
      await prisma.location.updateMany({ where: { partyId, locationType: 'CUSTOMER', isDefault: true }, data: { isDefault: false } });
    }

    const location = await prisma.location.create({
      data: {
        name:                 String(b.name).trim(),
        locationType:         'CUSTOMER',
        partyId,
        isRegistered:         b.isRegistered != null ? Boolean(b.isRegistered) : false,
        isDefault:            b.isDefault != null ? Boolean(b.isDefault) : false,
        street:               b.street               ? String(b.street).trim()               : null,
        city:                 b.city                 ? String(b.city).trim()                 : null,
        state:                b.state                ? String(b.state).trim()                : null,
        zip:                  b.zip                  ? String(b.zip).trim()                  : null,
        country:              b.country              ? String(b.country).trim()              : 'US',
        phone:                b.phone                ? String(b.phone).trim()                : null,
        email:                b.email                ? String(b.email).trim()                : null,
        contactName:          b.contactName          ? String(b.contactName).trim()          : null,
        contactPhone:         b.contactPhone         ? String(b.contactPhone).trim()         : null,
        contactEmail:         b.contactEmail         ? String(b.contactEmail).trim()         : null,
        deliveryInstructions: b.deliveryInstructions ? String(b.deliveryInstructions).trim() : null,
      },
    });
    res.status(201).json(location);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'A location with that name already exists' }); return; }
    if (err.code === 'P2003') { res.status(400).json({ error: 'Invalid foreign key reference' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/ship-to/:addrId', async (req, res) => {
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const addrId = parseInt(req.params.addrId);
  if (isNaN(addrId)) { res.status(400).json({ error: 'Invalid address ID' }); return; }

  const b = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.location.findFirst({ where: { id: addrId, partyId, locationType: 'CUSTOMER' } });
    if (!existing) { res.status(404).json({ error: 'Ship-to address not found for this customer' }); return; }

    if (b.isDefault && !existing.isDefault) {
      await prisma.location.updateMany({ where: { partyId, locationType: 'CUSTOMER', isDefault: true, id: { not: addrId } }, data: { isDefault: false } });
    }

    const d: Record<string, unknown> = {};
    if (b.name                 !== undefined) d.name                 = String(b.name).trim();
    if (b.isDefault            !== undefined) d.isDefault            = Boolean(b.isDefault);
    if (b.isRegistered         !== undefined) d.isRegistered         = Boolean(b.isRegistered);
    if (b.street               !== undefined) d.street               = b.street               ? String(b.street).trim()               : null;
    if (b.city                 !== undefined) d.city                 = b.city                 ? String(b.city).trim()                 : null;
    if (b.state                !== undefined) d.state                = b.state                ? String(b.state).trim()                : null;
    if (b.zip                  !== undefined) d.zip                  = b.zip                  ? String(b.zip).trim()                  : null;
    if (b.country              !== undefined) d.country              = b.country              ? String(b.country).trim()              : null;
    if (b.phone                !== undefined) d.phone                = b.phone                ? String(b.phone).trim()                : null;
    if (b.email                !== undefined) d.email                = b.email                ? String(b.email).trim()                : null;
    if (b.contactName          !== undefined) d.contactName          = b.contactName          ? String(b.contactName).trim()          : null;
    if (b.contactPhone         !== undefined) d.contactPhone         = b.contactPhone         ? String(b.contactPhone).trim()         : null;
    if (b.contactEmail         !== undefined) d.contactEmail         = b.contactEmail         ? String(b.contactEmail).trim()         : null;
    if (b.deliveryInstructions !== undefined) d.deliveryInstructions = b.deliveryInstructions ? String(b.deliveryInstructions).trim() : null;
    if (b.isActive             !== undefined) d.isActive             = Boolean(b.isActive);

    const location = await prisma.location.update({ where: { id: addrId }, data: d as any });
    res.json(location);
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Address not found' }); return; }
    if (err.code === 'P2002') { res.status(409).json({ error: 'A location with that name already exists' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/ship-to/:addrId', async (req, res) => {
  const partyId = await resolvePartyId(req, res);
  if (partyId === null) return;

  const addrId = parseInt(req.params.addrId);
  if (isNaN(addrId)) { res.status(400).json({ error: 'Invalid address ID' }); return; }

  try {
    const result = await prisma.location.updateMany({
      where: { id: addrId, partyId, locationType: 'CUSTOMER' },
      data:  { isActive: false },
    });
    if (result.count === 0) { res.status(404).json({ error: 'Ship-to address not found for this customer' }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
