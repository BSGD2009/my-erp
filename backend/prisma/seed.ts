import { PrismaClient, Role, WorkCenterType, MaterialType, ContactType, ProductType, BoxStyle, Flute, WallType, PrintType, CoatingType, GrainDirection, JointType } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding BoxERP database...')

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 10)
  const csrHash   = await bcrypt.hash('csr123', 10)

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@boxerp.local' },
    update: {},
    create: {
      email:        'admin@boxerp.local',
      passwordHash: adminHash,
      name:         'Admin User',
      role:         Role.ADMIN,
    },
  })

  const csr = await prisma.user.upsert({
    where:  { email: 'csr@boxerp.local' },
    update: {},
    create: {
      email:        'csr@boxerp.local',
      passwordHash: csrHash,
      name:         'CSR User',
      role:         Role.CSR,
    },
  })

  console.log(`  Users: ${admin.email}, ${csr.email}`)

  // ── Locations ──────────────────────────────────────────────────────────────

  const mainPlant = await prisma.location.upsert({
    where:  { name: 'Main Plant' },
    update: {},
    create: {
      name:      'Main Plant',
      address:   '123 Industrial Drive',
      isDefault: true,
    },
  })

  const warehouse = await prisma.location.upsert({
    where:  { name: 'Warehouse' },
    update: {},
    create: {
      name:    'Warehouse',
      address: '456 Distribution Blvd',
    },
  })

  console.log(`  Locations: ${mainPlant.name}, ${warehouse.name}`)

  // ── Work Centers ───────────────────────────────────────────────────────────

  const workCenters = await Promise.all([
    prisma.workCenter.upsert({
      where:  { name: 'Printer 1' },
      update: {},
      create: { name: 'Printer 1', type: WorkCenterType.PRINTING, description: 'Flexographic printer' },
    }),
    prisma.workCenter.upsert({
      where:  { name: 'Slitter-Scorer' },
      update: {},
      create: { name: 'Slitter-Scorer', type: WorkCenterType.SLITTING_SCORING, description: 'Sheet slitting and scoring' },
    }),
    prisma.workCenter.upsert({
      where:  { name: 'Die Cutter' },
      update: {},
      create: { name: 'Die Cutter', type: WorkCenterType.DIE_CUTTING, description: 'Flatbed die cutter' },
    }),
    prisma.workCenter.upsert({
      where:  { name: 'Gluer' },
      update: {},
      create: { name: 'Gluer', type: WorkCenterType.GLUING, description: 'Folder-gluer' },
    }),
    prisma.workCenter.upsert({
      where:  { name: 'Bundler' },
      update: {},
      create: { name: 'Bundler', type: WorkCenterType.BUNDLING_STRAPPING, description: 'Bundle and strap' },
    }),
    prisma.workCenter.upsert({
      where:  { name: 'Shipping Dock' },
      update: {},
      create: { name: 'Shipping Dock', type: WorkCenterType.SHIPPING },
    }),
  ])

  console.log(`  Work Centers: ${workCenters.map(w => w.name).join(', ')}`)

  // ── Suppliers ──────────────────────────────────────────────────────────────

  const boardSupplier = await prisma.supplier.upsert({
    where:  { code: 'PKGCORP' },
    update: {},
    create: {
      code:         'PKGCORP',
      name:         'Packaging Corp',
      contactName:  'Jim Rollins',
      email:        'orders@packagingcorp.com',
      phone:        '800-555-0101',
      paymentTerms: 'Net 30',
      leadTimeDays: 7,
    },
  })

  const inkSupplier = await prisma.supplier.upsert({
    where:  { code: 'INKCO' },
    update: {},
    create: {
      code:         'INKCO',
      name:         'Ink Supply Co',
      contactName:  'Maria Santos',
      email:        'sales@inksupplyco.com',
      phone:        '800-555-0202',
      paymentTerms: 'Net 30',
      leadTimeDays: 5,
    },
  })

  console.log(`  Suppliers: ${boardSupplier.name}, ${inkSupplier.name}`)

  // ── Materials ──────────────────────────────────────────────────────────────

  const matBoardB = await prisma.material.upsert({
    where:  { code: 'BD-32ECT-B-48' },
    update: {},
    create: {
      code:          'BD-32ECT-B-48',
      name:          '32 ECT B-Flute 48" Roll',
      type:          MaterialType.BOARD,
      unitOfMeasure: 'sqft',
      supplierId:    boardSupplier.id,
      reorderPoint:  5000,
      reorderQty:    20000,
      leadTimeDays:  7,
    },
  })

  const matBoardC = await prisma.material.upsert({
    where:  { code: 'BD-32ECT-C-48' },
    update: {},
    create: {
      code:          'BD-32ECT-C-48',
      name:          '32 ECT C-Flute 48" Roll',
      type:          MaterialType.BOARD,
      unitOfMeasure: 'sqft',
      supplierId:    boardSupplier.id,
      reorderPoint:  5000,
      reorderQty:    20000,
      leadTimeDays:  7,
    },
  })

  const matBoardBC = await prisma.material.upsert({
    where:  { code: 'BD-44ECT-BC-48' },
    update: {},
    create: {
      code:          'BD-44ECT-BC-48',
      name:          '44 ECT BC Double-Wall 48" Roll',
      type:          MaterialType.BOARD,
      unitOfMeasure: 'sqft',
      supplierId:    boardSupplier.id,
      reorderPoint:  2000,
      reorderQty:    10000,
      leadTimeDays:  10,
    },
  })

  const matInkBrown = await prisma.material.upsert({
    where:  { code: 'INK-BROWN' },
    update: {},
    create: {
      code:          'INK-BROWN',
      name:          'Brown Kraft Ink',
      type:          MaterialType.INK,
      unitOfMeasure: 'gal',
      supplierId:    inkSupplier.id,
      reorderPoint:  10,
      reorderQty:    50,
      leadTimeDays:  5,
    },
  })

  const matInkWhite = await prisma.material.upsert({
    where:  { code: 'INK-WHITE' },
    update: {},
    create: {
      code:          'INK-WHITE',
      name:          'White Ink',
      type:          MaterialType.INK,
      unitOfMeasure: 'gal',
      supplierId:    inkSupplier.id,
      reorderPoint:  10,
      reorderQty:    50,
      leadTimeDays:  5,
    },
  })

  const matAdhesive = await prisma.material.upsert({
    where:  { code: 'ADH-HOTMELT' },
    update: {},
    create: {
      code:          'ADH-HOTMELT',
      name:          'Hot Melt Adhesive',
      type:          MaterialType.ADHESIVE,
      unitOfMeasure: 'lbs',
      supplierId:    boardSupplier.id,
      reorderPoint:  50,
      reorderQty:    200,
      leadTimeDays:  5,
    },
  })

  const matTape = await prisma.material.upsert({
    where:  { code: 'TAPE-2IN-CLR' },
    update: {},
    create: {
      code:          'TAPE-2IN-CLR',
      name:          '2" Clear Carton Sealing Tape',
      type:          MaterialType.TAPE,
      unitOfMeasure: 'roll',
      supplierId:    boardSupplier.id,
      reorderPoint:  100,
      reorderQty:    500,
      leadTimeDays:  3,
    },
  })

  const matStaple = await prisma.material.upsert({
    where:  { code: 'STL-34' },
    update: {},
    create: {
      code:          'STL-34',
      name:          '3/4" Box Staples',
      type:          MaterialType.STAPLE,
      unitOfMeasure: 'box',
      supplierId:    boardSupplier.id,
      reorderPoint:  20,
      reorderQty:    100,
    },
  })

  console.log(`  Materials: ${[matBoardB, matBoardC, matBoardBC, matInkBrown, matInkWhite, matAdhesive, matTape, matStaple].map(m => m.code).join(', ')}`)

  // ── Seed zero-quantity inventory rows for each material at each location ───
  // This establishes the inventory structure. Actual quantities come in via receipts.

  const materials  = [matBoardB, matBoardC, matBoardBC, matInkBrown, matInkWhite, matAdhesive, matTape, matStaple]
  const locations  = [mainPlant, warehouse]

  for (const mat of materials) {
    for (const loc of locations) {
      await prisma.materialInventory.upsert({
        where:  { materialId_locationId: { materialId: mat.id, locationId: loc.id } },
        update: {},
        create: { materialId: mat.id, locationId: loc.id, quantity: 0, avgCost: 0 },
      })
    }
  }

  console.log(`  MaterialInventory: ${materials.length * locations.length} rows (all zero — add receipts to populate)`)

  // ── Customers ──────────────────────────────────────────────────────────────

  const acme = await prisma.customer.upsert({
    where:  { code: 'ACME01' },
    update: {},
    create: {
      code:         'ACME01',
      name:         'Acme Manufacturing Co',
      contactName:  'Bob Smith',
      email:        'purchasing@acmemfg.com',
      phone:        '555-100-1000',
      address:      '789 Factory Road, Springfield, IL 62701',
      paymentTerms: 'Net 30',
      creditLimit:  50000,
      salesRepId:   csr.id,
    },
  })

  const metro = await prisma.customer.upsert({
    where:  { code: 'METRO02' },
    update: {},
    create: {
      code:         'METRO02',
      name:         'Metro Foods Inc',
      contactName:  'Alice Johnson',
      email:        'alice@metrofoods.com',
      phone:        '555-200-2000',
      address:      '321 Commerce St, Chicago, IL 60601',
      paymentTerms: 'Net 60',
      creditLimit:  100000,
      salesRepId:   csr.id,
    },
  })

  const coastal = await prisma.customer.upsert({
    where:  { code: 'COAST03' },
    update: {},
    create: {
      code:         'COAST03',
      name:         'Coastal Distribution LLC',
      contactName:  'Carlos Rivera',
      email:        'carlos@coastaldist.com',
      phone:        '555-300-3000',
      address:      '654 Harbor Blvd, Waukegan, IL 60085',
      paymentTerms: 'Net 30',
      creditLimit:  75000,
      salesRepId:   admin.id,
    },
  })

  console.log(`  Customers: ${acme.name}, ${metro.name}, ${coastal.name}`)

  // ── Customer Contacts ──────────────────────────────────────────────────────

  // Acme contacts
  await prisma.customerContact.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      customerId:  acme.id,
      name:        'Bob Smith',
      title:       'Purchasing Manager',
      email:       'purchasing@acmemfg.com',
      phone:       '555-100-1001',
      contactType: ContactType.BUYER,
      isPrimary:   true,
    },
  })

  await prisma.customerContact.upsert({
    where:  { id: 2 },
    update: {},
    create: {
      customerId:  acme.id,
      name:        'Linda Park',
      title:       'Accounts Payable',
      email:       'ap@acmemfg.com',
      phone:       '555-100-1002',
      contactType: ContactType.AP,
    },
  })

  // Metro contacts
  await prisma.customerContact.upsert({
    where:  { id: 3 },
    update: {},
    create: {
      customerId:  metro.id,
      name:        'Alice Johnson',
      title:       'Buyer',
      email:       'alice@metrofoods.com',
      phone:       '555-200-2001',
      contactType: ContactType.BUYER,
      isPrimary:   true,
    },
  })

  await prisma.customerContact.upsert({
    where:  { id: 4 },
    update: {},
    create: {
      customerId:  metro.id,
      name:        'Tom Lee',
      title:       'Receiving Supervisor',
      email:       'receiving@metrofoods.com',
      phone:       '555-200-2002',
      contactType: ContactType.RECEIVING,
    },
  })

  console.log(`  Customer Contacts: 4 contacts across 2 customers`)

  // ── Product Categories ─────────────────────────────────────────────────────

  const catBoxes = await prisma.productCategory.upsert({
    where:  { id: 1 },
    update: {},
    create: { name: 'Corrugated Boxes', description: 'All manufactured corrugated box products', sortOrder: 1 },
  })

  const catRSC = await prisma.productCategory.upsert({
    where:  { id: 2 },
    update: {},
    create: { name: 'RSC Boxes', parentId: catBoxes.id, description: 'Regular Slotted Containers', sortOrder: 1 },
  })

  const catDieCut = await prisma.productCategory.upsert({
    where:  { id: 3 },
    update: {},
    create: { name: 'Die Cut Boxes', parentId: catBoxes.id, description: 'Custom die-cut styles', sortOrder: 2 },
  })

  const catSupplies = await prisma.productCategory.upsert({
    where:  { id: 4 },
    update: {},
    create: { name: 'Packaging Supplies', description: 'Tape, foam, labels, and other supplies', sortOrder: 2 },
  })

  const catTape = await prisma.productCategory.upsert({
    where:  { id: 5 },
    update: {},
    create: { name: 'Tape & Adhesive', parentId: catSupplies.id, sortOrder: 1 },
  })

  console.log(`  Product Categories: Corrugated Boxes (RSC, Die Cut), Packaging Supplies (Tape & Adhesive)`)

  // ── Sample Products ────────────────────────────────────────────────────────

  // --- Corrugated box product with BoxSpec and BlankSpec ---

  const box12x10x8 = await prisma.product.upsert({
    where:  { sku: 'BOX-12x10x8-RSC-B' },
    update: {},
    create: {
      sku:         'BOX-12x10x8-RSC-B',
      name:        '12x10x8 RSC B-Flute Box',
      description: 'Standard regular slotted container, B-flute, 32 ECT, plain kraft',
      productType: ProductType.CORRUGATED_BOX,
      categoryId:  catRSC.id,
      listPrice:   1.85,
    },
  })

  // BoxSpec: customer-facing dimensions
  const existingBoxSpec = await prisma.boxSpec.findUnique({ where: { productId: box12x10x8.id } })
  if (!existingBoxSpec) {
    await prisma.boxSpec.create({
      data: {
        productId:    box12x10x8.id,
        lengthInches: 12,
        widthInches:  10,
        heightInches: 8,
        style:        BoxStyle.RSC,
      },
    })
  }

  // BlankSpec: full manufacturing recipe
  const existingBlankSpec = await prisma.blankSpec.findUnique({ where: { productId: box12x10x8.id } })
  if (!existingBlankSpec) {
    await prisma.blankSpec.create({
      data: {
        productId:         box12x10x8.id,
        materialId:        matBoardB.id,
        blankLengthInches: 45.25,
        blankWidthInches:  24.5,
        grainDirection:    GrainDirection.LONG_GRAIN,
        boardGrade:        '32 ECT',
        flute:             Flute.B,
        wallType:          WallType.SINGLE,
        scoreCount:        4,
        scorePositions:    JSON.stringify([
          { position: 1, measurement: 10.0 },
          { position: 2, measurement: 22.0 },
          { position: 3, measurement: 32.0 },
          { position: 4, measurement: 44.0 },
        ]),
        slotDepth:  4.25,
        slotWidth:  0.25,
        jointType:  JointType.GLUED,
        printType:  PrintType.NONE,
        printColors: 0,
        coating:    CoatingType.NONE,
        bundleCount: 25,
        tieHigh:    4,
        tierWide:   5,
      },
    })
  }

  // BOMLine: adhesive (board captured by blankSpec.materialId)
  await prisma.bOMLine.upsert({
    where:  { productId_materialId: { productId: box12x10x8.id, materialId: matAdhesive.id } },
    update: {},
    create: {
      productId:     box12x10x8.id,
      materialId:    matAdhesive.id,
      quantityPer:   0.01,
      unitOfMeasure: 'lbs',
    },
  })

  // --- Packaging supply product ---

  const tape2in = await prisma.product.upsert({
    where:  { sku: 'TAPE-2IN-CLR-36YD' },
    update: {},
    create: {
      sku:         'TAPE-2IN-CLR-36YD',
      name:        '2" Clear Carton Tape — 36yd Roll',
      description: 'Standard 2" clear polypropylene carton sealing tape',
      productType: ProductType.PACKAGING_SUPPLY,
      categoryId:  catTape.id,
      listPrice:   2.50,
    },
  })

  console.log(`  Products: ${box12x10x8.name}, ${tape2in.name}`)
  console.log('\nSeeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
