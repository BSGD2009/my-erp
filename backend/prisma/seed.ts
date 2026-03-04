import { PrismaClient, Role, ContactType, PartyRoleType, BoxStyle, Flute, WallType, PrintType, CoatingType, GrainDirection, JointType, LocationType, FulfillmentPath, AcquisitionStatus } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding BoxERP database (schema v9)...')

  // ── Payment Terms ──────────────────────────────────────────────────────────

  const termNet30 = await prisma.paymentTerm.upsert({
    where: { termCode: 'NET30' },
    update: {},
    create: { termCode: 'NET30', termName: 'Net 30', netDays: 30, sortOrder: 1 },
  })
  await prisma.paymentTerm.upsert({
    where: { termCode: 'NET15' },
    update: {},
    create: { termCode: 'NET15', termName: 'Net 15', netDays: 15, sortOrder: 2 },
  })
  await prisma.paymentTerm.upsert({
    where: { termCode: 'NET45' },
    update: {},
    create: { termCode: 'NET45', termName: 'Net 45', netDays: 45, sortOrder: 3 },
  })
  const termNet60 = await prisma.paymentTerm.upsert({
    where: { termCode: 'NET60' },
    update: {},
    create: { termCode: 'NET60', termName: 'Net 60', netDays: 60, sortOrder: 4 },
  })
  await prisma.paymentTerm.upsert({
    where: { termCode: 'NET90' },
    update: {},
    create: { termCode: 'NET90', termName: 'Net 90', netDays: 90, sortOrder: 5 },
  })
  await prisma.paymentTerm.upsert({
    where: { termCode: '1_10_NET30' },
    update: {},
    create: { termCode: '1_10_NET30', termName: '1% 10 Net 30', discountPercent: 1.0, discountDays: 10, netDays: 30, sortOrder: 6 },
  })
  await prisma.paymentTerm.upsert({
    where: { termCode: '2_10_NET30' },
    update: {},
    create: { termCode: '2_10_NET30', termName: '2% 10 Net 30', discountPercent: 2.0, discountDays: 10, netDays: 30, sortOrder: 7 },
  })
  await prisma.paymentTerm.upsert({
    where: { termCode: 'DUE_ON_RECEIPT' },
    update: {},
    create: { termCode: 'DUE_ON_RECEIPT', termName: 'Due on Receipt', netDays: 0, sortOrder: 8 },
  })

  console.log('  Payment Terms: 8 terms seeded')

  // ── Material Types ────────────────────────────────────────────────────────

  const mtBoard = await prisma.materialType.upsert({
    where: { typeKey: 'BOARD' },
    update: {},
    create: { typeKey: 'BOARD', typeName: 'Board', sortOrder: 1 },
  })
  await prisma.materialType.upsert({ where: { typeKey: 'MEDIUM' }, update: {}, create: { typeKey: 'MEDIUM', typeName: 'Medium', sortOrder: 2 } })
  const mtInk = await prisma.materialType.upsert({ where: { typeKey: 'INK' }, update: {}, create: { typeKey: 'INK', typeName: 'Ink', sortOrder: 3 } })
  const mtAdhesive = await prisma.materialType.upsert({ where: { typeKey: 'ADHESIVE' }, update: {}, create: { typeKey: 'ADHESIVE', typeName: 'Adhesive', sortOrder: 4 } })
  const mtTape = await prisma.materialType.upsert({ where: { typeKey: 'TAPE' }, update: {}, create: { typeKey: 'TAPE', typeName: 'Tape', sortOrder: 5 } })
  const mtStaple = await prisma.materialType.upsert({ where: { typeKey: 'STAPLE' }, update: {}, create: { typeKey: 'STAPLE', typeName: 'Staple', sortOrder: 6 } })
  await prisma.materialType.upsert({ where: { typeKey: 'COATING' }, update: {}, create: { typeKey: 'COATING', typeName: 'Coating', sortOrder: 7 } })
  await prisma.materialType.upsert({ where: { typeKey: 'STRETCH_WRAP' }, update: {}, create: { typeKey: 'STRETCH_WRAP', typeName: 'Stretch Wrap', sortOrder: 8 } })
  await prisma.materialType.upsert({ where: { typeKey: 'STRAPPING' }, update: {}, create: { typeKey: 'STRAPPING', typeName: 'Strapping', sortOrder: 9 } })
  await prisma.materialType.upsert({ where: { typeKey: 'OTHER' }, update: {}, create: { typeKey: 'OTHER', typeName: 'Other', sortOrder: 10 } })

  console.log('  Material Types: 10 types seeded')

  // ── Resource Types (was Work Center Types) ──────────────────────────────

  const rtPrintFlexo = await prisma.resourceType.upsert({ where: { typeKey: 'PRINTING_FLEXO' }, update: {}, create: { typeKey: 'PRINTING_FLEXO', typeName: 'Printing — Flexo', sortOrder: 1 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'PRINTING_LITHO' }, update: {}, create: { typeKey: 'PRINTING_LITHO', typeName: 'Printing — Litho', sortOrder: 2 } })
  const rtSlitting = await prisma.resourceType.upsert({ where: { typeKey: 'SLITTING_SCORING' }, update: {}, create: { typeKey: 'SLITTING_SCORING', typeName: 'Slitting / Scoring', sortOrder: 3 } })
  const rtDieFlatbed = await prisma.resourceType.upsert({ where: { typeKey: 'DIE_CUTTING_FLATBED' }, update: {}, create: { typeKey: 'DIE_CUTTING_FLATBED', typeName: 'Die Cutting — Flatbed', sortOrder: 4 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'DIE_CUTTING_ROTARY' }, update: {}, create: { typeKey: 'DIE_CUTTING_ROTARY', typeName: 'Die Cutting — Rotary', sortOrder: 5 } })
  const rtGluing = await prisma.resourceType.upsert({ where: { typeKey: 'GLUING' }, update: {}, create: { typeKey: 'GLUING', typeName: 'Gluing', sortOrder: 6 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'FOLDING' }, update: {}, create: { typeKey: 'FOLDING', typeName: 'Folding', sortOrder: 7 } })
  const rtBundling = await prisma.resourceType.upsert({ where: { typeKey: 'BUNDLING_STRAPPING' }, update: {}, create: { typeKey: 'BUNDLING_STRAPPING', typeName: 'Bundling / Strapping', sortOrder: 8 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'PALLETIZING' }, update: {}, create: { typeKey: 'PALLETIZING', typeName: 'Palletizing', sortOrder: 9 } })
  const rtShipping = await prisma.resourceType.upsert({ where: { typeKey: 'SHIPPING_DOCK' }, update: {}, create: { typeKey: 'SHIPPING_DOCK', typeName: 'Shipping Dock', sortOrder: 10 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'RECEIVING_DOCK' }, update: {}, create: { typeKey: 'RECEIVING_DOCK', typeName: 'Receiving Dock', sortOrder: 11 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'BANDSAW' }, update: {}, create: { typeKey: 'BANDSAW', typeName: 'Bandsaw', sortOrder: 12 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'STORAGE' }, update: {}, create: { typeKey: 'STORAGE', typeName: 'Storage', sortOrder: 13 } })
  await prisma.resourceType.upsert({ where: { typeKey: 'OTHER' }, update: {}, create: { typeKey: 'OTHER', typeName: 'Other', sortOrder: 14 } })

  console.log('  Resource Types: 14 types seeded')

  // ── Product Modules ─────────────────────────────────────────────────────

  const modCorrugated = await prisma.productModule.upsert({
    where: { moduleKey: 'CORRUGATED_BOX' }, update: {},
    create: { moduleKey: 'CORRUGATED_BOX', moduleName: 'Corrugated Box', sortOrder: 1 },
  })
  const modPackaging = await prisma.productModule.upsert({
    where: { moduleKey: 'PACKAGING_SUPPLY' }, update: {},
    create: { moduleKey: 'PACKAGING_SUPPLY', moduleName: 'Packaging Supply', sortOrder: 2 },
  })
  await prisma.productModule.upsert({
    where: { moduleKey: 'RESALE' }, update: {},
    create: { moduleKey: 'RESALE', moduleName: 'Resale', sortOrder: 3 },
  })
  await prisma.productModule.upsert({
    where: { moduleKey: 'LABOR_SERVICE' }, update: {},
    create: { moduleKey: 'LABOR_SERVICE', moduleName: 'Labor / Service', sortOrder: 4 },
  })
  await prisma.productModule.upsert({
    where: { moduleKey: 'OTHER' }, update: {},
    create: { moduleKey: 'OTHER', moduleName: 'Other', sortOrder: 5 },
  })

  console.log('  Product Modules: 5 modules seeded')

  // ── Board Grades ──────────────────────────────────────────────────────────

  const boardGrades = [
    { gradeCode: '125LB',   gradeName: '125# Test',  wallType: 'SW', nominalCaliper: 0.118, sortOrder: 1 },
    { gradeCode: '200LB',   gradeName: '200# Test',  wallType: 'SW', nominalCaliper: 0.140, sortOrder: 2 },
    { gradeCode: '275LB',   gradeName: '275# Test',  wallType: 'SW', nominalCaliper: 0.175, sortOrder: 3 },
    { gradeCode: '32ECT',   gradeName: '32 ECT',     wallType: 'SW', nominalCaliper: 0.140, sortOrder: 4 },
    { gradeCode: '40ECT',   gradeName: '40 ECT',     wallType: 'SW', nominalCaliper: 0.155, sortOrder: 5 },
    { gradeCode: '44ECT',   gradeName: '44 ECT',     wallType: 'SW', nominalCaliper: 0.172, sortOrder: 6 },
    { gradeCode: 'NONTEST', gradeName: 'Non-Test DW', wallType: 'DW', nominalCaliper: 0.225, sortOrder: 7 },
    { gradeCode: '275DW',   gradeName: '275# DW',    wallType: 'DW', nominalCaliper: 0.250, sortOrder: 8 },
    { gradeCode: '350LB',   gradeName: '350# Test',  wallType: 'DW', nominalCaliper: 0.250, sortOrder: 9 },
    { gradeCode: '400LB',   gradeName: '400# Test',  wallType: 'DW', nominalCaliper: 0.300, sortOrder: 10 },
    { gradeCode: '450LB',   gradeName: '450# Test',  wallType: 'DW', nominalCaliper: 0.350, sortOrder: 11 },
    { gradeCode: '48ECT',   gradeName: '48 ECT',     wallType: 'DW', nominalCaliper: 0.275, sortOrder: 12 },
    { gradeCode: '51ECT',   gradeName: '51 ECT',     wallType: 'DW', nominalCaliper: 0.300, sortOrder: 13 },
    { gradeCode: '61ECT',   gradeName: '61 ECT',     wallType: 'DW', nominalCaliper: 0.350, sortOrder: 14 },
    { gradeCode: '71ECT',   gradeName: '71 ECT',     wallType: 'DW', nominalCaliper: 0.400, sortOrder: 15 },
  ]

  const bg32ECT = await prisma.boardGrade.upsert({
    where: { gradeCode: '32ECT' }, update: {},
    create: boardGrades.find(g => g.gradeCode === '32ECT')!,
  })

  for (const g of boardGrades.filter(g => g.gradeCode !== '32ECT')) {
    await prisma.boardGrade.upsert({ where: { gradeCode: g.gradeCode }, update: {}, create: g })
  }

  console.log('  Board Grades: 15 grades seeded')

  // ── Module Spec Fields (corrugated box dynamic specs) ───────────────────

  const specFields = [
    { moduleId: modCorrugated.id, fieldKey: 'length', fieldLabel: 'Length (in)', fieldType: 'NUMBER', isRequired: true, sortOrder: 1 },
    { moduleId: modCorrugated.id, fieldKey: 'width', fieldLabel: 'Width (in)', fieldType: 'NUMBER', isRequired: true, sortOrder: 2 },
    { moduleId: modCorrugated.id, fieldKey: 'height', fieldLabel: 'Height (in)', fieldType: 'NUMBER', isRequired: true, sortOrder: 3 },
    { moduleId: modCorrugated.id, fieldKey: 'flute', fieldLabel: 'Flute', fieldType: 'SELECT', selectOptions: JSON.stringify(['A','B','C','E','F','BC','EB']), isRequired: true, sortOrder: 4 },
    { moduleId: modCorrugated.id, fieldKey: 'wall_type', fieldLabel: 'Wall Type', fieldType: 'SELECT', selectOptions: JSON.stringify(['Single','Double','Triple']), isRequired: true, sortOrder: 5 },
    { moduleId: modCorrugated.id, fieldKey: 'board_grade', fieldLabel: 'Board Grade', fieldType: 'TEXT', isRequired: true, sortOrder: 6 },
    { moduleId: modCorrugated.id, fieldKey: 'box_style', fieldLabel: 'Box Style', fieldType: 'SELECT', selectOptions: JSON.stringify(['RSC','HSC','FOL','Telescope','Die Cut','Bliss','Tray']), isRequired: true, sortOrder: 7 },
    { moduleId: modCorrugated.id, fieldKey: 'print_type', fieldLabel: 'Print Type', fieldType: 'SELECT', selectOptions: JSON.stringify(['None','1-Color','2-Color','3-Color','4-Color']), sortOrder: 8 },
    { moduleId: modCorrugated.id, fieldKey: 'coating', fieldLabel: 'Coating', fieldType: 'SELECT', selectOptions: JSON.stringify(['None','Wax','Clay','UV','Varnish']), sortOrder: 9 },
    { moduleId: modPackaging.id, fieldKey: 'unit_of_measure', fieldLabel: 'Unit of Measure', fieldType: 'TEXT', isRequired: true, sortOrder: 1 },
    { moduleId: modPackaging.id, fieldKey: 'pack_size', fieldLabel: 'Pack Size', fieldType: 'NUMBER', sortOrder: 2 },
  ]

  for (const sf of specFields) {
    await prisma.moduleSpecField.upsert({
      where: { moduleId_fieldKey: { moduleId: sf.moduleId, fieldKey: sf.fieldKey } },
      update: {},
      create: sf,
    })
  }

  console.log('  Module Spec Fields: 11 fields seeded')

  // ── Operations ────────────────────────────────────────────────────────────

  await prisma.operation.upsert({ where: { operationKey: 'PRINT' }, update: {}, create: { operationKey: 'PRINT', operationName: 'Print', sortOrder: 1 } })
  await prisma.operation.upsert({ where: { operationKey: 'SCORE_SLIT' }, update: {}, create: { operationKey: 'SCORE_SLIT', operationName: 'Score / Slit', sortOrder: 2 } })
  await prisma.operation.upsert({ where: { operationKey: 'DIE_CUT' }, update: {}, create: { operationKey: 'DIE_CUT', operationName: 'Die Cut', sortOrder: 3 } })
  await prisma.operation.upsert({ where: { operationKey: 'GLUE' }, update: {}, create: { operationKey: 'GLUE', operationName: 'Glue', sortOrder: 4 } })
  await prisma.operation.upsert({ where: { operationKey: 'FOLD' }, update: {}, create: { operationKey: 'FOLD', operationName: 'Fold', sortOrder: 5 } })
  await prisma.operation.upsert({ where: { operationKey: 'BUNDLE' }, update: {}, create: { operationKey: 'BUNDLE', operationName: 'Bundle', sortOrder: 6 } })
  await prisma.operation.upsert({ where: { operationKey: 'STRAP' }, update: {}, create: { operationKey: 'STRAP', operationName: 'Strap', sortOrder: 7 } })
  await prisma.operation.upsert({ where: { operationKey: 'PALLETIZE' }, update: {}, create: { operationKey: 'PALLETIZE', operationName: 'Palletize', sortOrder: 8 } })
  await prisma.operation.upsert({ where: { operationKey: 'INSPECT' }, update: {}, create: { operationKey: 'INSPECT', operationName: 'Inspect', sortOrder: 9 } })
  await prisma.operation.upsert({ where: { operationKey: 'SHIP' }, update: {}, create: { operationKey: 'SHIP', operationName: 'Ship', sortOrder: 10 } })
  await prisma.operation.upsert({ where: { operationKey: 'RECEIVE' }, update: {}, create: { operationKey: 'RECEIVE', operationName: 'Receive', sortOrder: 11 } })
  await prisma.operation.upsert({ where: { operationKey: 'BANDSAW' }, update: {}, create: { operationKey: 'BANDSAW', operationName: 'Bandsaw', sortOrder: 12 } })
  await prisma.operation.upsert({ where: { operationKey: 'OTHER' }, update: {}, create: { operationKey: 'OTHER', operationName: 'Other', sortOrder: 13 } })

  console.log('  Operations: 13 operations seeded')

  // ── Operation Requirements (link operations to resource types) ──────────

  const opPrint = await prisma.operation.findUnique({ where: { operationKey: 'PRINT' } })
  const opScoreSlit = await prisma.operation.findUnique({ where: { operationKey: 'SCORE_SLIT' } })
  const opDieCut = await prisma.operation.findUnique({ where: { operationKey: 'DIE_CUT' } })
  const opGlue = await prisma.operation.findUnique({ where: { operationKey: 'GLUE' } })
  const opBundle = await prisma.operation.findUnique({ where: { operationKey: 'BUNDLE' } })
  const opShip = await prisma.operation.findUnique({ where: { operationKey: 'SHIP' } })

  if (opPrint) await prisma.operationRequirement.upsert({ where: { operationId_resourceTypeId: { operationId: opPrint.id, resourceTypeId: rtPrintFlexo.id } }, update: {}, create: { operationId: opPrint.id, resourceTypeId: rtPrintFlexo.id } })
  if (opScoreSlit) await prisma.operationRequirement.upsert({ where: { operationId_resourceTypeId: { operationId: opScoreSlit.id, resourceTypeId: rtSlitting.id } }, update: {}, create: { operationId: opScoreSlit.id, resourceTypeId: rtSlitting.id } })
  if (opDieCut) await prisma.operationRequirement.upsert({ where: { operationId_resourceTypeId: { operationId: opDieCut.id, resourceTypeId: rtDieFlatbed.id } }, update: {}, create: { operationId: opDieCut.id, resourceTypeId: rtDieFlatbed.id } })
  if (opGlue) await prisma.operationRequirement.upsert({ where: { operationId_resourceTypeId: { operationId: opGlue.id, resourceTypeId: rtGluing.id } }, update: {}, create: { operationId: opGlue.id, resourceTypeId: rtGluing.id } })
  if (opBundle) await prisma.operationRequirement.upsert({ where: { operationId_resourceTypeId: { operationId: opBundle.id, resourceTypeId: rtBundling.id } }, update: {}, create: { operationId: opBundle.id, resourceTypeId: rtBundling.id } })
  if (opShip) await prisma.operationRequirement.upsert({ where: { operationId_resourceTypeId: { operationId: opShip.id, resourceTypeId: rtShipping.id } }, update: {}, create: { operationId: opShip.id, resourceTypeId: rtShipping.id } })

  console.log('  Operation Requirements: 6 requirements seeded')

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 10)
  const csrHash   = await bcrypt.hash('csr123', 10)

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@boxerp.local' },
    update: {},
    create: { email: 'admin@boxerp.local', passwordHash: adminHash, name: 'Admin User', role: Role.ADMIN },
  })

  const csr = await prisma.user.upsert({
    where:  { email: 'csr@boxerp.local' },
    update: {},
    create: { email: 'csr@boxerp.local', passwordHash: csrHash, name: 'CSR User', role: Role.CSR },
  })

  console.log(`  Users: ${admin.email}, ${csr.email}`)

  // ── Locations ──────────────────────────────────────────────────────────────

  const mainPlant = await prisma.location.upsert({
    where:  { name: 'Main Plant' },
    update: {},
    create: {
      name: 'Main Plant', locationType: LocationType.OWN_PLANT, isRegistered: true, isDefault: true,
      street: '123 Industrial Drive', city: 'Springfield', state: 'IL', zip: '62701', country: 'US',
    },
  })

  const warehouse = await prisma.location.upsert({
    where:  { name: 'Warehouse' },
    update: {},
    create: {
      name: 'Warehouse', locationType: LocationType.OWN_WAREHOUSE,
      street: '456 Distribution Blvd', city: 'Springfield', state: 'IL', zip: '62702', country: 'US',
    },
  })

  console.log(`  Locations: ${mainPlant.name}, ${warehouse.name}`)

  // ── Parties + Roles + Contacts ──────────────────────────────────────────

  // Party: Packaging Corp (supplier)
  const partyPkgCorp = await prisma.party.upsert({
    where: { partyCode: 'PKGCORP' }, update: {},
    create: { partyCode: 'PKGCORP', name: 'Packaging Corp' },
  })
  await prisma.partyRole.upsert({
    where: { partyId_roleType: { partyId: partyPkgCorp.id, roleType: PartyRoleType.SUPPLIER } },
    update: {}, create: { partyId: partyPkgCorp.id, roleType: PartyRoleType.SUPPLIER },
  })
  await prisma.partyContact.create({
    data: { partyId: partyPkgCorp.id, name: 'Jim Rollins', title: 'Account Manager', email: 'orders@packagingcorp.com', phone: '800-555-0101', contactType: ContactType.SALES_REP, isPrimary: true },
  })

  // Party: Ink Supply Co (supplier)
  const partyInkCo = await prisma.party.upsert({
    where: { partyCode: 'INKCO' }, update: {},
    create: { partyCode: 'INKCO', name: 'Ink Supply Co' },
  })
  await prisma.partyRole.upsert({
    where: { partyId_roleType: { partyId: partyInkCo.id, roleType: PartyRoleType.SUPPLIER } },
    update: {}, create: { partyId: partyInkCo.id, roleType: PartyRoleType.SUPPLIER },
  })
  await prisma.partyContact.create({
    data: { partyId: partyInkCo.id, name: 'Maria Santos', title: 'Sales', email: 'sales@inksupplyco.com', phone: '800-555-0202', contactType: ContactType.SALES_REP, isPrimary: true },
  })

  // Party: Acme Manufacturing (customer)
  const partyAcme = await prisma.party.upsert({
    where: { partyCode: 'ACME' }, update: {},
    create: { partyCode: 'ACME', name: 'Acme Manufacturing Co' },
  })
  await prisma.partyRole.upsert({
    where: { partyId_roleType: { partyId: partyAcme.id, roleType: PartyRoleType.CUSTOMER } },
    update: {}, create: { partyId: partyAcme.id, roleType: PartyRoleType.CUSTOMER },
  })
  await prisma.partyContact.create({
    data: { partyId: partyAcme.id, name: 'Bob Smith', title: 'Purchasing Manager', email: 'purchasing@acmemfg.com', phone: '555-100-1001', contactType: ContactType.BUYER, isPrimary: true, invoiceDistribution: true },
  })
  await prisma.partyContact.create({
    data: { partyId: partyAcme.id, name: 'Linda Park', title: 'Accounts Payable', email: 'ap@acmemfg.com', phone: '555-100-1002', contactType: ContactType.AP, invoiceDistribution: true },
  })

  // Party: Metro Foods (customer)
  const partyMetro = await prisma.party.upsert({
    where: { partyCode: 'METRO' }, update: {},
    create: { partyCode: 'METRO', name: 'Metro Foods Inc' },
  })
  await prisma.partyRole.upsert({
    where: { partyId_roleType: { partyId: partyMetro.id, roleType: PartyRoleType.CUSTOMER } },
    update: {}, create: { partyId: partyMetro.id, roleType: PartyRoleType.CUSTOMER },
  })
  await prisma.partyContact.create({
    data: { partyId: partyMetro.id, name: 'Alice Johnson', title: 'Buyer', email: 'alice@metrofoods.com', phone: '555-200-2001', contactType: ContactType.BUYER, isPrimary: true, invoiceDistribution: true },
  })
  await prisma.partyContact.create({
    data: { partyId: partyMetro.id, name: 'Tom Lee', title: 'Receiving Supervisor', email: 'receiving@metrofoods.com', phone: '555-200-2002', contactType: ContactType.RECEIVING },
  })

  // Party: Coastal Distribution (customer)
  const partyCoastal = await prisma.party.upsert({
    where: { partyCode: 'COAST' }, update: {},
    create: { partyCode: 'COAST', name: 'Coastal Distribution LLC' },
  })
  await prisma.partyRole.upsert({
    where: { partyId_roleType: { partyId: partyCoastal.id, roleType: PartyRoleType.CUSTOMER } },
    update: {}, create: { partyId: partyCoastal.id, roleType: PartyRoleType.CUSTOMER },
  })

  console.log('  Parties: 5 parties with roles and contacts')

  // ── Suppliers ──────────────────────────────────────────────────────────────

  const boardSupplier = await prisma.supplier.upsert({
    where:  { code: 'PKGCORP' }, update: {},
    create: {
      code: 'PKGCORP', name: 'Packaging Corp', partyId: partyPkgCorp.id,
      street: '100 Paper Mill Rd', city: 'Green Bay', state: 'WI', zip: '54301', country: 'US',
      paymentTermId: termNet30.id,
    },
  })

  const inkSupplier = await prisma.supplier.upsert({
    where:  { code: 'INKCO' }, update: {},
    create: {
      code: 'INKCO', name: 'Ink Supply Co', partyId: partyInkCo.id,
      street: '200 Color Way', city: 'Milwaukee', state: 'WI', zip: '53202', country: 'US',
      paymentTermId: termNet30.id,
    },
  })

  console.log(`  Suppliers: ${boardSupplier.name}, ${inkSupplier.name}`)

  // ── Materials ──────────────────────────────────────────────────────────────

  const matBoardB = await prisma.material.upsert({
    where: { code: 'BD-32ECT-B-48' }, update: {},
    create: { code: 'BD-32ECT-B-48', name: '32 ECT B-Flute 48" Roll', materialTypeId: mtBoard.id, unitOfMeasure: 'sqft', reorderPoint: 5000, reorderQty: 20000, leadTimeDays: 7 },
  })
  const matBoardC = await prisma.material.upsert({
    where: { code: 'BD-32ECT-C-48' }, update: {},
    create: { code: 'BD-32ECT-C-48', name: '32 ECT C-Flute 48" Roll', materialTypeId: mtBoard.id, unitOfMeasure: 'sqft', reorderPoint: 5000, reorderQty: 20000, leadTimeDays: 7 },
  })
  const matBoardBC = await prisma.material.upsert({
    where: { code: 'BD-44ECT-BC-48' }, update: {},
    create: { code: 'BD-44ECT-BC-48', name: '44 ECT BC Double-Wall 48" Roll', materialTypeId: mtBoard.id, unitOfMeasure: 'sqft', reorderPoint: 2000, reorderQty: 10000, leadTimeDays: 10 },
  })
  const matInkBrown = await prisma.material.upsert({
    where: { code: 'INK-BROWN' }, update: {},
    create: { code: 'INK-BROWN', name: 'Brown Kraft Ink', materialTypeId: mtInk.id, unitOfMeasure: 'gal', reorderPoint: 10, reorderQty: 50, leadTimeDays: 5 },
  })
  const matInkWhite = await prisma.material.upsert({
    where: { code: 'INK-WHITE' }, update: {},
    create: { code: 'INK-WHITE', name: 'White Ink', materialTypeId: mtInk.id, unitOfMeasure: 'gal', reorderPoint: 10, reorderQty: 50, leadTimeDays: 5 },
  })
  const matAdhesive = await prisma.material.upsert({
    where: { code: 'ADH-HOTMELT' }, update: {},
    create: { code: 'ADH-HOTMELT', name: 'Hot Melt Adhesive', materialTypeId: mtAdhesive.id, unitOfMeasure: 'lbs', reorderPoint: 50, reorderQty: 200, leadTimeDays: 5 },
  })
  const matTape = await prisma.material.upsert({
    where: { code: 'TAPE-2IN-CLR' }, update: {},
    create: { code: 'TAPE-2IN-CLR', name: '2" Clear Carton Sealing Tape', materialTypeId: mtTape.id, unitOfMeasure: 'roll', reorderPoint: 100, reorderQty: 500, leadTimeDays: 3 },
  })
  const matStaple = await prisma.material.upsert({
    where: { code: 'STL-34' }, update: {},
    create: { code: 'STL-34', name: '3/4" Box Staples', materialTypeId: mtStaple.id, unitOfMeasure: 'box', reorderPoint: 20, reorderQty: 100 },
  })

  console.log(`  Materials: 8 materials seeded`)

  // ── Material Inventory ─────────────────────────────────────────────────────

  const materials = [matBoardB, matBoardC, matBoardBC, matInkBrown, matInkWhite, matAdhesive, matTape, matStaple]
  const locations = [mainPlant, warehouse]

  for (const mat of materials) {
    for (const loc of locations) {
      await prisma.materialInventory.upsert({
        where: { materialId_locationId: { materialId: mat.id, locationId: loc.id } },
        update: {},
        create: { materialId: mat.id, locationId: loc.id, quantity: 0, avgCost: 0 },
      })
    }
  }

  console.log(`  MaterialInventory: ${materials.length * locations.length} rows`)

  // ── Customers ──────────────────────────────────────────────────────────────

  const acme = await prisma.customer.upsert({
    where: { code: 'ACME01' }, update: {},
    create: {
      code: 'ACME01', name: 'Acme Manufacturing Co', partyId: partyAcme.id,
      street: '789 Factory Road', city: 'Springfield', state: 'IL', zip: '62701', country: 'US',
      paymentTermId: termNet30.id, creditLimit: 50000, defaultSalesRepId: csr.id,
      acquisitionStatus: AcquisitionStatus.ACTIVE,
    },
  })

  const metro = await prisma.customer.upsert({
    where: { code: 'METRO02' }, update: {},
    create: {
      code: 'METRO02', name: 'Metro Foods Inc', partyId: partyMetro.id,
      street: '321 Commerce St', city: 'Chicago', state: 'IL', zip: '60601', country: 'US',
      paymentTermId: termNet60.id, creditLimit: 100000, defaultSalesRepId: csr.id,
      acquisitionStatus: AcquisitionStatus.ACTIVE,
    },
  })

  const coastal = await prisma.customer.upsert({
    where: { code: 'COAST03' }, update: {},
    create: {
      code: 'COAST03', name: 'Coastal Distribution LLC', partyId: partyCoastal.id,
      street: '654 Harbor Blvd', city: 'Waukegan', state: 'IL', zip: '60085', country: 'US',
      paymentTermId: termNet30.id, creditLimit: 75000, defaultSalesRepId: admin.id,
      acquisitionStatus: AcquisitionStatus.ACTIVE,
    },
  })

  console.log(`  Customers: ${acme.name}, ${metro.name}, ${coastal.name}`)

  // ── Customer Ship-To Locations ──────────────────────────────────────────

  await prisma.location.upsert({
    where: { name: 'Acme - Main Warehouse' }, update: {},
    create: {
      name: 'Acme - Main Warehouse', locationType: LocationType.CUSTOMER, partyId: partyAcme.id,
      street: '789 Factory Road', city: 'Springfield', state: 'IL', zip: '62701', country: 'US',
      contactName: 'Bob Smith', contactPhone: '555-100-1001', isDefault: false,
    },
  })
  await prisma.location.upsert({
    where: { name: 'Metro Foods - Chicago DC' }, update: {},
    create: {
      name: 'Metro Foods - Chicago DC', locationType: LocationType.CUSTOMER, partyId: partyMetro.id,
      street: '321 Commerce St', city: 'Chicago', state: 'IL', zip: '60601', country: 'US',
      contactName: 'Tom Lee', contactPhone: '555-200-2002', isDefault: false,
    },
  })

  console.log('  Customer Ship-To Locations: 2 locations')

  // ── Resources (replaces Work Centers + Equipment) ─────────────────────

  const resources = await Promise.all([
    prisma.resource.upsert({ where: { name: 'Printer 1' }, update: {}, create: { name: 'Printer 1', resourceTypeId: rtPrintFlexo.id, description: 'Flexographic printer', locationId: mainPlant.id, manufacturer: 'BW Papersystems', modelNumber: 'FP-2800', maxSheetWidth: 60, maxSheetLength: 96, maxSpeed: 15000 } }),
    prisma.resource.upsert({ where: { name: 'Slitter-Scorer' }, update: {}, create: { name: 'Slitter-Scorer', resourceTypeId: rtSlitting.id, description: 'Sheet slitting and scoring', locationId: mainPlant.id, manufacturer: 'Fosber', maxSheetWidth: 60 } }),
    prisma.resource.upsert({ where: { name: 'Die Cutter' }, update: {}, create: { name: 'Die Cutter', resourceTypeId: rtDieFlatbed.id, description: 'Flatbed die cutter', locationId: mainPlant.id, manufacturer: 'Bobst', modelNumber: 'SPO 1600', maxSheetWidth: 48, maxSheetLength: 64 } }),
    prisma.resource.upsert({ where: { name: 'Gluer' }, update: {}, create: { name: 'Gluer', resourceTypeId: rtGluing.id, description: 'Folder-gluer', locationId: mainPlant.id, manufacturer: 'Bobst', maxSpeed: 12000 } }),
    prisma.resource.upsert({ where: { name: 'Bundler' }, update: {}, create: { name: 'Bundler', resourceTypeId: rtBundling.id, description: 'Bundle and strap', locationId: mainPlant.id } }),
    prisma.resource.upsert({ where: { name: 'Shipping Dock' }, update: {}, create: { name: 'Shipping Dock', resourceTypeId: rtShipping.id, locationId: mainPlant.id } }),
  ])

  console.log(`  Resources: ${resources.map(r => r.name).join(', ')}`)

  // ── Product Categories ─────────────────────────────────────────────────────

  const catBoxes = await prisma.productCategory.upsert({
    where: { id: 1 }, update: {},
    create: { name: 'Corrugated Boxes', moduleId: modCorrugated.id, description: 'All manufactured corrugated box products', sortOrder: 1 },
  })
  const catRSC = await prisma.productCategory.upsert({
    where: { id: 2 }, update: {},
    create: { name: 'RSC Boxes', parentId: catBoxes.id, moduleId: modCorrugated.id, description: 'Regular Slotted Containers', sortOrder: 1 },
  })
  await prisma.productCategory.upsert({
    where: { id: 3 }, update: {},
    create: { name: 'Die Cut Boxes', parentId: catBoxes.id, moduleId: modCorrugated.id, description: 'Custom die-cut styles', sortOrder: 2 },
  })
  const catSupplies = await prisma.productCategory.upsert({
    where: { id: 4 }, update: {},
    create: { name: 'Packaging Supplies', moduleId: modPackaging.id, description: 'Tape, foam, labels, and other supplies', sortOrder: 2 },
  })
  await prisma.productCategory.upsert({
    where: { id: 5 }, update: {},
    create: { name: 'Tape & Adhesive', parentId: catSupplies.id, moduleId: modPackaging.id, sortOrder: 1 },
  })

  console.log('  Product Categories: 5 categories (with moduleId)')

  // ── Master Specs (was Products) ─────────────────────────────────────────

  const box12x10x8 = await prisma.masterSpec.upsert({
    where: { sku: 'BOX-12x10x8-RSC' }, update: {},
    create: { sku: 'BOX-12x10x8-RSC', name: '12x10x8 RSC Box', description: 'Standard regular slotted container, plain kraft', categoryId: catRSC.id, listPrice: 1.85 },
  })

  const existingBoxSpec = await prisma.boxSpec.findUnique({ where: { masterSpecId: box12x10x8.id } })
  if (!existingBoxSpec) {
    await prisma.boxSpec.create({
      data: { masterSpecId: box12x10x8.id, lengthInches: 12, widthInches: 10, heightInches: 8, style: BoxStyle.RSC },
    })
  }

  // Variant: 32 ECT B-Flute
  const variant32B = await prisma.productVariant.upsert({
    where: { sku: 'BOX-12x10x8-RSC-32ECT-B' }, update: {},
    create: {
      masterSpecId: box12x10x8.id, sku: 'BOX-12x10x8-RSC-32ECT-B',
      variantDescription: '32 ECT B-Flute',
      boardGradeId: bg32ECT.id, flute: 'B', caliper: 0.140,
    },
  })

  const existingBlankSpec = await prisma.blankSpec.findUnique({ where: { variantId: variant32B.id } })
  if (!existingBlankSpec) {
    await prisma.blankSpec.create({
      data: {
        variantId: variant32B.id, materialId: matBoardB.id,
        blankLengthInches: 45.25, blankWidthInches: 24.5,
        grainDirection: GrainDirection.LONG_GRAIN, boardGrade: '32 ECT',
        flute: Flute.B, wallType: WallType.SINGLE,
        scoreCount: 4, scorePositions: JSON.stringify([
          { position: 1, measurement: 10.0 }, { position: 2, measurement: 22.0 },
          { position: 3, measurement: 32.0 }, { position: 4, measurement: 44.0 },
        ]),
        slotDepth: 4.25, slotWidth: 0.25,
        jointType: JointType.GLUED, printType: PrintType.NONE, printColors: 0, coating: CoatingType.NONE,
        bundleCount: 25, tieHigh: 4, tierWide: 5,
      },
    })
  }

  await prisma.bOMLine.upsert({
    where: { variantId_materialId: { variantId: variant32B.id, materialId: matAdhesive.id } },
    update: {},
    create: { variantId: variant32B.id, materialId: matAdhesive.id, quantityPer: 0.01, unitOfMeasure: 'lbs' },
  })

  await prisma.masterSpec.upsert({
    where: { sku: 'TAPE-2IN-CLR-36YD' }, update: {},
    create: { sku: 'TAPE-2IN-CLR-36YD', name: '2" Clear Carton Tape — 36yd Roll', description: 'Standard 2" clear polypropylene carton sealing tape', categoryId: catSupplies.id, listPrice: 2.50 },
  })

  console.log('  Master Specs: 2 specs with box spec, variant, blank spec, and BOM')

  // ── Customer Items ─────────────────────────────────────────────────────

  await prisma.customerItem.upsert({
    where: { code: 'ACME-BOX-001' }, update: {},
    create: {
      code: 'ACME-BOX-001', name: 'Acme Standard Shipping Box',
      customerId: acme.id, masterSpecId: box12x10x8.id, variantId: variant32B.id,
      listPrice: 1.95, fulfillmentPath: FulfillmentPath.MANUFACTURE,
    },
  })

  console.log('  Customer Items: 1 item seeded')
  console.log('\nSeeding complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
