import { PrismaClient, Role, ContactType, ProductType, BoxStyle, Flute, WallType, PrintType, CoatingType, GrainDirection, JointType, LocationType } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding BoxERP database...')

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
  await prisma.materialType.upsert({
    where: { typeKey: 'MEDIUM' },
    update: {},
    create: { typeKey: 'MEDIUM', typeName: 'Medium', sortOrder: 2 },
  })
  const mtInk = await prisma.materialType.upsert({
    where: { typeKey: 'INK' },
    update: {},
    create: { typeKey: 'INK', typeName: 'Ink', sortOrder: 3 },
  })
  const mtAdhesive = await prisma.materialType.upsert({
    where: { typeKey: 'ADHESIVE' },
    update: {},
    create: { typeKey: 'ADHESIVE', typeName: 'Adhesive', sortOrder: 4 },
  })
  const mtTape = await prisma.materialType.upsert({
    where: { typeKey: 'TAPE' },
    update: {},
    create: { typeKey: 'TAPE', typeName: 'Tape', sortOrder: 5 },
  })
  const mtStaple = await prisma.materialType.upsert({
    where: { typeKey: 'STAPLE' },
    update: {},
    create: { typeKey: 'STAPLE', typeName: 'Staple', sortOrder: 6 },
  })
  await prisma.materialType.upsert({
    where: { typeKey: 'COATING' },
    update: {},
    create: { typeKey: 'COATING', typeName: 'Coating', sortOrder: 7 },
  })
  await prisma.materialType.upsert({
    where: { typeKey: 'STRETCH_WRAP' },
    update: {},
    create: { typeKey: 'STRETCH_WRAP', typeName: 'Stretch Wrap', sortOrder: 8 },
  })
  await prisma.materialType.upsert({
    where: { typeKey: 'STRAPPING' },
    update: {},
    create: { typeKey: 'STRAPPING', typeName: 'Strapping', sortOrder: 9 },
  })
  await prisma.materialType.upsert({
    where: { typeKey: 'OTHER' },
    update: {},
    create: { typeKey: 'OTHER', typeName: 'Other', sortOrder: 10 },
  })

  console.log('  Material Types: 10 types seeded')

  // ── Work Center Types ─────────────────────────────────────────────────────

  const wctPrintFlexo = await prisma.workCenterType.upsert({
    where: { typeKey: 'PRINTING_FLEXO' },
    update: {},
    create: { typeKey: 'PRINTING_FLEXO', typeName: 'Printing — Flexo', sortOrder: 1 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'PRINTING_LITHO' },
    update: {},
    create: { typeKey: 'PRINTING_LITHO', typeName: 'Printing — Litho', sortOrder: 2 },
  })
  const wctSlitting = await prisma.workCenterType.upsert({
    where: { typeKey: 'SLITTING_SCORING' },
    update: {},
    create: { typeKey: 'SLITTING_SCORING', typeName: 'Slitting / Scoring', sortOrder: 3 },
  })
  const wctDieFlatbed = await prisma.workCenterType.upsert({
    where: { typeKey: 'DIE_CUTTING_FLATBED' },
    update: {},
    create: { typeKey: 'DIE_CUTTING_FLATBED', typeName: 'Die Cutting — Flatbed', sortOrder: 4 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'DIE_CUTTING_ROTARY' },
    update: {},
    create: { typeKey: 'DIE_CUTTING_ROTARY', typeName: 'Die Cutting — Rotary', sortOrder: 5 },
  })
  const wctGluing = await prisma.workCenterType.upsert({
    where: { typeKey: 'GLUING' },
    update: {},
    create: { typeKey: 'GLUING', typeName: 'Gluing', sortOrder: 6 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'FOLDING' },
    update: {},
    create: { typeKey: 'FOLDING', typeName: 'Folding', sortOrder: 7 },
  })
  const wctBundling = await prisma.workCenterType.upsert({
    where: { typeKey: 'BUNDLING_STRAPPING' },
    update: {},
    create: { typeKey: 'BUNDLING_STRAPPING', typeName: 'Bundling / Strapping', sortOrder: 8 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'PALLETIZING' },
    update: {},
    create: { typeKey: 'PALLETIZING', typeName: 'Palletizing', sortOrder: 9 },
  })
  const wctShipping = await prisma.workCenterType.upsert({
    where: { typeKey: 'SHIPPING_DOCK' },
    update: {},
    create: { typeKey: 'SHIPPING_DOCK', typeName: 'Shipping Dock', sortOrder: 10 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'RECEIVING_DOCK' },
    update: {},
    create: { typeKey: 'RECEIVING_DOCK', typeName: 'Receiving Dock', sortOrder: 11 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'BANDSAW' },
    update: {},
    create: { typeKey: 'BANDSAW', typeName: 'Bandsaw', sortOrder: 12 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'STORAGE' },
    update: {},
    create: { typeKey: 'STORAGE', typeName: 'Storage', sortOrder: 13 },
  })
  await prisma.workCenterType.upsert({
    where: { typeKey: 'OTHER' },
    update: {},
    create: { typeKey: 'OTHER', typeName: 'Other', sortOrder: 14 },
  })

  console.log('  Work Center Types: 14 types seeded')

  // ── Operations ────────────────────────────────────────────────────────────

  await prisma.operation.upsert({ where: { operationKey: 'PRINT' }, update: {}, create: { operationKey: 'PRINT', operationName: 'Print', defaultEquipmentTypeId: wctPrintFlexo.id, sortOrder: 1 } })
  await prisma.operation.upsert({ where: { operationKey: 'SCORE_SLIT' }, update: {}, create: { operationKey: 'SCORE_SLIT', operationName: 'Score / Slit', defaultEquipmentTypeId: wctSlitting.id, sortOrder: 2 } })
  await prisma.operation.upsert({ where: { operationKey: 'DIE_CUT' }, update: {}, create: { operationKey: 'DIE_CUT', operationName: 'Die Cut', defaultEquipmentTypeId: wctDieFlatbed.id, sortOrder: 3 } })
  await prisma.operation.upsert({ where: { operationKey: 'GLUE' }, update: {}, create: { operationKey: 'GLUE', operationName: 'Glue', defaultEquipmentTypeId: wctGluing.id, sortOrder: 4 } })
  await prisma.operation.upsert({ where: { operationKey: 'FOLD' }, update: {}, create: { operationKey: 'FOLD', operationName: 'Fold', sortOrder: 5 } })
  await prisma.operation.upsert({ where: { operationKey: 'BUNDLE' }, update: {}, create: { operationKey: 'BUNDLE', operationName: 'Bundle', defaultEquipmentTypeId: wctBundling.id, sortOrder: 6 } })
  await prisma.operation.upsert({ where: { operationKey: 'STRAP' }, update: {}, create: { operationKey: 'STRAP', operationName: 'Strap', sortOrder: 7 } })
  await prisma.operation.upsert({ where: { operationKey: 'PALLETIZE' }, update: {}, create: { operationKey: 'PALLETIZE', operationName: 'Palletize', sortOrder: 8 } })
  await prisma.operation.upsert({ where: { operationKey: 'INSPECT' }, update: {}, create: { operationKey: 'INSPECT', operationName: 'Inspect', sortOrder: 9 } })
  await prisma.operation.upsert({ where: { operationKey: 'SHIP' }, update: {}, create: { operationKey: 'SHIP', operationName: 'Ship', defaultEquipmentTypeId: wctShipping.id, sortOrder: 10 } })
  await prisma.operation.upsert({ where: { operationKey: 'RECEIVE' }, update: {}, create: { operationKey: 'RECEIVE', operationName: 'Receive', sortOrder: 11 } })
  await prisma.operation.upsert({ where: { operationKey: 'BANDSAW' }, update: {}, create: { operationKey: 'BANDSAW', operationName: 'Bandsaw', sortOrder: 12 } })
  await prisma.operation.upsert({ where: { operationKey: 'OTHER' }, update: {}, create: { operationKey: 'OTHER', operationName: 'Other', sortOrder: 13 } })

  console.log('  Operations: 13 operations seeded')

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

  // ── Work Centers ───────────────────────────────────────────────────────────

  const workCenters = await Promise.all([
    prisma.workCenter.upsert({ where: { name: 'Printer 1' },    update: {}, create: { name: 'Printer 1',    workCenterTypeId: wctPrintFlexo.id, description: 'Flexographic printer', locationId: mainPlant.id } }),
    prisma.workCenter.upsert({ where: { name: 'Slitter-Scorer' }, update: {}, create: { name: 'Slitter-Scorer', workCenterTypeId: wctSlitting.id, description: 'Sheet slitting and scoring', locationId: mainPlant.id } }),
    prisma.workCenter.upsert({ where: { name: 'Die Cutter' },   update: {}, create: { name: 'Die Cutter',   workCenterTypeId: wctDieFlatbed.id, description: 'Flatbed die cutter', locationId: mainPlant.id } }),
    prisma.workCenter.upsert({ where: { name: 'Gluer' },        update: {}, create: { name: 'Gluer',        workCenterTypeId: wctGluing.id, description: 'Folder-gluer', locationId: mainPlant.id } }),
    prisma.workCenter.upsert({ where: { name: 'Bundler' },      update: {}, create: { name: 'Bundler',      workCenterTypeId: wctBundling.id, description: 'Bundle and strap', locationId: mainPlant.id } }),
    prisma.workCenter.upsert({ where: { name: 'Shipping Dock' }, update: {}, create: { name: 'Shipping Dock', workCenterTypeId: wctShipping.id, locationId: mainPlant.id } }),
  ])

  console.log(`  Work Centers: ${workCenters.map(w => w.name).join(', ')}`)

  // ── Suppliers ──────────────────────────────────────────────────────────────

  const boardSupplier = await prisma.supplier.upsert({
    where:  { code: 'PKGCORP' },
    update: {},
    create: {
      code: 'PKGCORP', name: 'Packaging Corp',
      street: '100 Paper Mill Rd', city: 'Green Bay', state: 'WI', zip: '54301', country: 'US',
      paymentTermId: termNet30.id,
    },
  })

  const inkSupplier = await prisma.supplier.upsert({
    where:  { code: 'INKCO' },
    update: {},
    create: {
      code: 'INKCO', name: 'Ink Supply Co',
      street: '200 Color Way', city: 'Milwaukee', state: 'WI', zip: '53202', country: 'US',
      paymentTermId: termNet30.id,
    },
  })

  console.log(`  Suppliers: ${boardSupplier.name}, ${inkSupplier.name}`)

  // ── Supplier Contacts ─────────────────────────────────────────────────────

  await prisma.supplierContact.upsert({
    where: { id: 1 }, update: {},
    create: { supplierId: boardSupplier.id, name: 'Jim Rollins', title: 'Account Manager', email: 'orders@packagingcorp.com', phone: '800-555-0101', contactType: ContactType.SALES_REP, isPrimary: true },
  })
  await prisma.supplierContact.upsert({
    where: { id: 2 }, update: {},
    create: { supplierId: inkSupplier.id, name: 'Maria Santos', title: 'Sales', email: 'sales@inksupplyco.com', phone: '800-555-0202', contactType: ContactType.SALES_REP, isPrimary: true },
  })

  console.log('  Supplier Contacts: 2 contacts seeded')

  // ── Materials ──────────────────────────────────────────────────────────────

  const matBoardB = await prisma.material.upsert({
    where:  { code: 'BD-32ECT-B-48' },
    update: {},
    create: { code: 'BD-32ECT-B-48', name: '32 ECT B-Flute 48" Roll', materialTypeId: mtBoard.id, unitOfMeasure: 'sqft', reorderPoint: 5000, reorderQty: 20000, leadTimeDays: 7 },
  })

  const matBoardC = await prisma.material.upsert({
    where:  { code: 'BD-32ECT-C-48' },
    update: {},
    create: { code: 'BD-32ECT-C-48', name: '32 ECT C-Flute 48" Roll', materialTypeId: mtBoard.id, unitOfMeasure: 'sqft', reorderPoint: 5000, reorderQty: 20000, leadTimeDays: 7 },
  })

  const matBoardBC = await prisma.material.upsert({
    where:  { code: 'BD-44ECT-BC-48' },
    update: {},
    create: { code: 'BD-44ECT-BC-48', name: '44 ECT BC Double-Wall 48" Roll', materialTypeId: mtBoard.id, unitOfMeasure: 'sqft', reorderPoint: 2000, reorderQty: 10000, leadTimeDays: 10 },
  })

  const matInkBrown = await prisma.material.upsert({
    where:  { code: 'INK-BROWN' },
    update: {},
    create: { code: 'INK-BROWN', name: 'Brown Kraft Ink', materialTypeId: mtInk.id, unitOfMeasure: 'gal', reorderPoint: 10, reorderQty: 50, leadTimeDays: 5 },
  })

  const matInkWhite = await prisma.material.upsert({
    where:  { code: 'INK-WHITE' },
    update: {},
    create: { code: 'INK-WHITE', name: 'White Ink', materialTypeId: mtInk.id, unitOfMeasure: 'gal', reorderPoint: 10, reorderQty: 50, leadTimeDays: 5 },
  })

  const matAdhesive = await prisma.material.upsert({
    where:  { code: 'ADH-HOTMELT' },
    update: {},
    create: { code: 'ADH-HOTMELT', name: 'Hot Melt Adhesive', materialTypeId: mtAdhesive.id, unitOfMeasure: 'lbs', reorderPoint: 50, reorderQty: 200, leadTimeDays: 5 },
  })

  const matTape = await prisma.material.upsert({
    where:  { code: 'TAPE-2IN-CLR' },
    update: {},
    create: { code: 'TAPE-2IN-CLR', name: '2" Clear Carton Sealing Tape', materialTypeId: mtTape.id, unitOfMeasure: 'roll', reorderPoint: 100, reorderQty: 500, leadTimeDays: 3 },
  })

  const matStaple = await prisma.material.upsert({
    where:  { code: 'STL-34' },
    update: {},
    create: { code: 'STL-34', name: '3/4" Box Staples', materialTypeId: mtStaple.id, unitOfMeasure: 'box', reorderPoint: 20, reorderQty: 100 },
  })

  console.log(`  Materials: ${[matBoardB, matBoardC, matBoardBC, matInkBrown, matInkWhite, matAdhesive, matTape, matStaple].map(m => m.code).join(', ')}`)

  // ── Material Inventory ─────────────────────────────────────────────────────

  const materials = [matBoardB, matBoardC, matBoardBC, matInkBrown, matInkWhite, matAdhesive, matTape, matStaple]
  const locations = [mainPlant, warehouse]

  for (const mat of materials) {
    for (const loc of locations) {
      await prisma.materialInventory.upsert({
        where:  { materialId_locationId: { materialId: mat.id, locationId: loc.id } },
        update: {},
        create: { materialId: mat.id, locationId: loc.id, quantity: 0, avgCost: 0 },
      })
    }
  }

  console.log(`  MaterialInventory: ${materials.length * locations.length} rows`)

  // ── Customers ──────────────────────────────────────────────────────────────

  const acme = await prisma.customer.upsert({
    where:  { code: 'ACME01' },
    update: {},
    create: {
      code: 'ACME01', name: 'Acme Manufacturing Co',
      street: '789 Factory Road', city: 'Springfield', state: 'IL', zip: '62701', country: 'US',
      paymentTermId: termNet30.id, creditLimit: 50000, defaultSalesRepId: csr.id,
    },
  })

  const metro = await prisma.customer.upsert({
    where:  { code: 'METRO02' },
    update: {},
    create: {
      code: 'METRO02', name: 'Metro Foods Inc',
      street: '321 Commerce St', city: 'Chicago', state: 'IL', zip: '60601', country: 'US',
      paymentTermId: termNet60.id, creditLimit: 100000, defaultSalesRepId: csr.id,
    },
  })

  const coastal = await prisma.customer.upsert({
    where:  { code: 'COAST03' },
    update: {},
    create: {
      code: 'COAST03', name: 'Coastal Distribution LLC',
      street: '654 Harbor Blvd', city: 'Waukegan', state: 'IL', zip: '60085', country: 'US',
      paymentTermId: termNet30.id, creditLimit: 75000, defaultSalesRepId: admin.id,
    },
  })

  console.log(`  Customers: ${acme.name}, ${metro.name}, ${coastal.name}`)

  // ── Customer Contacts ──────────────────────────────────────────────────────

  await prisma.customerContact.upsert({
    where: { id: 1 }, update: {},
    create: { customerId: acme.id, name: 'Bob Smith', title: 'Purchasing Manager', email: 'purchasing@acmemfg.com', phone: '555-100-1001', contactType: ContactType.BUYER, isPrimary: true, invoiceDistribution: true },
  })
  await prisma.customerContact.upsert({
    where: { id: 2 }, update: {},
    create: { customerId: acme.id, name: 'Linda Park', title: 'Accounts Payable', email: 'ap@acmemfg.com', phone: '555-100-1002', contactType: ContactType.AP, invoiceDistribution: true },
  })
  await prisma.customerContact.upsert({
    where: { id: 3 }, update: {},
    create: { customerId: metro.id, name: 'Alice Johnson', title: 'Buyer', email: 'alice@metrofoods.com', phone: '555-200-2001', contactType: ContactType.BUYER, isPrimary: true, invoiceDistribution: true },
  })
  await prisma.customerContact.upsert({
    where: { id: 4 }, update: {},
    create: { customerId: metro.id, name: 'Tom Lee', title: 'Receiving Supervisor', email: 'receiving@metrofoods.com', phone: '555-200-2002', contactType: ContactType.RECEIVING },
  })

  console.log('  Customer Contacts: 4 contacts')

  // ── Ship-To Addresses ─────────────────────────────────────────────────────

  await prisma.shipToAddress.upsert({
    where: { id: 1 }, update: {},
    create: { customerId: acme.id, locationName: 'Main Warehouse', street: '789 Factory Road', city: 'Springfield', state: 'IL', zip: '62701', country: 'US', contactName: 'Bob Smith', contactPhone: '555-100-1001', isDefault: true },
  })
  await prisma.shipToAddress.upsert({
    where: { id: 2 }, update: {},
    create: { customerId: metro.id, locationName: 'Chicago DC', street: '321 Commerce St', city: 'Chicago', state: 'IL', zip: '60601', country: 'US', contactName: 'Tom Lee', contactPhone: '555-200-2002', isDefault: true },
  })

  console.log('  Ship-To Addresses: 2 addresses')

  // ── Product Categories ─────────────────────────────────────────────────────

  const catBoxes = await prisma.productCategory.upsert({
    where: { id: 1 }, update: {},
    create: { name: 'Corrugated Boxes', description: 'All manufactured corrugated box products', sortOrder: 1 },
  })
  const catRSC = await prisma.productCategory.upsert({
    where: { id: 2 }, update: {},
    create: { name: 'RSC Boxes', parentId: catBoxes.id, description: 'Regular Slotted Containers', sortOrder: 1 },
  })
  await prisma.productCategory.upsert({
    where: { id: 3 }, update: {},
    create: { name: 'Die Cut Boxes', parentId: catBoxes.id, description: 'Custom die-cut styles', sortOrder: 2 },
  })
  const catSupplies = await prisma.productCategory.upsert({
    where: { id: 4 }, update: {},
    create: { name: 'Packaging Supplies', description: 'Tape, foam, labels, and other supplies', sortOrder: 2 },
  })
  await prisma.productCategory.upsert({
    where: { id: 5 }, update: {},
    create: { name: 'Tape & Adhesive', parentId: catSupplies.id, sortOrder: 1 },
  })

  console.log('  Product Categories: 5 categories')

  // ── Products ───────────────────────────────────────────────────────────────

  const box12x10x8 = await prisma.product.upsert({
    where: { sku: 'BOX-12x10x8-RSC-B' }, update: {},
    create: { sku: 'BOX-12x10x8-RSC-B', name: '12x10x8 RSC B-Flute Box', description: 'Standard regular slotted container, B-flute, 32 ECT, plain kraft', productType: ProductType.CORRUGATED_BOX, categoryId: catRSC.id, listPrice: 1.85 },
  })

  const existingBoxSpec = await prisma.boxSpec.findUnique({ where: { productId: box12x10x8.id } })
  if (!existingBoxSpec) {
    await prisma.boxSpec.create({
      data: { productId: box12x10x8.id, lengthInches: 12, widthInches: 10, heightInches: 8, style: BoxStyle.RSC },
    })
  }

  const existingBlankSpec = await prisma.blankSpec.findUnique({ where: { productId: box12x10x8.id } })
  if (!existingBlankSpec) {
    await prisma.blankSpec.create({
      data: {
        productId: box12x10x8.id, materialId: matBoardB.id,
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
    where: { productId_materialId: { productId: box12x10x8.id, materialId: matAdhesive.id } },
    update: {},
    create: { productId: box12x10x8.id, materialId: matAdhesive.id, quantityPer: 0.01, unitOfMeasure: 'lbs' },
  })

  await prisma.product.upsert({
    where: { sku: 'TAPE-2IN-CLR-36YD' }, update: {},
    create: { sku: 'TAPE-2IN-CLR-36YD', name: '2" Clear Carton Tape — 36yd Roll', description: 'Standard 2" clear polypropylene carton sealing tape', productType: ProductType.PACKAGING_SUPPLY, categoryId: catSupplies.id, listPrice: 2.50 },
  })

  console.log('  Products: 2 products with box spec, blank spec, and BOM')
  console.log('\nSeeding complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
