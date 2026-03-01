-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CSR');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('BUYER', 'AP', 'RECEIVING', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkCenterType" AS ENUM ('PRINTING', 'SLITTING_SCORING', 'DIE_CUTTING', 'GLUING', 'BUNDLING_STRAPPING', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('BOARD', 'INK', 'ADHESIVE', 'TAPE', 'STAPLE', 'COATING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('CORRUGATED_BOX', 'PACKAGING_SUPPLY', 'RESALE', 'LABOR_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "BoxStyle" AS ENUM ('RSC', 'HSC', 'FOL', 'TELESCOPE', 'DIE_CUT', 'BLISS', 'TRAY', 'OTHER');

-- CreateEnum
CREATE TYPE "Flute" AS ENUM ('A', 'B', 'C', 'E', 'F', 'BC', 'EB', 'OTHER');

-- CreateEnum
CREATE TYPE "WallType" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE');

-- CreateEnum
CREATE TYPE "PrintType" AS ENUM ('NONE', 'ONE_COLOR', 'TWO_COLOR', 'THREE_COLOR', 'FOUR_COLOR');

-- CreateEnum
CREATE TYPE "CoatingType" AS ENUM ('NONE', 'WAX', 'CLAY', 'UV', 'VARNISH');

-- CreateEnum
CREATE TYPE "GrainDirection" AS ENUM ('LONG_GRAIN', 'SHORT_GRAIN');

-- CreateEnum
CREATE TYPE "JointType" AS ENUM ('GLUED', 'STAPLED', 'TAPED', 'NONE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'SHIPPED', 'INVOICED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETE', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'VOIDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "QbSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCED', 'ERROR');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEIPT', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('DIE', 'PLATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ToolCondition" AS ENUM ('NEW', 'GOOD', 'WORN', 'RETIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CSR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "billingAddress" TEXT,
    "paymentTerms" TEXT,
    "creditLimit" DECIMAL(12,2),
    "creditHold" BOOLEAN NOT NULL DEFAULT false,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxExemptId" TEXT,
    "salesRepId" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactType" "ContactType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCenter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkCenterType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "supplierId" INTEGER,
    "reorderPoint" DECIMAL(12,4),
    "reorderQty" DECIMAL(12,4),
    "leadTimeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialInventory" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceipt" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "purchaseOrderItemId" INTEGER,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "vendorName" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTransaction" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "referenceType" TEXT,
    "referenceId" INTEGER,
    "notes" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "status" "PoStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "poId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "quantityOrdered" DECIMAL(14,4) NOT NULL,
    "quantityReceived" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productType" "ProductType" NOT NULL,
    "categoryId" INTEGER,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "listPrice" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoxSpec" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER,
    "quoteItemId" INTEGER,
    "lengthInches" DECIMAL(8,3) NOT NULL,
    "widthInches" DECIMAL(8,3) NOT NULL,
    "heightInches" DECIMAL(8,3) NOT NULL,
    "outsideDimensions" BOOLEAN NOT NULL DEFAULT false,
    "style" "BoxStyle" NOT NULL DEFAULT 'RSC',
    "hasDieCut" BOOLEAN NOT NULL DEFAULT false,
    "hasPerforations" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "BoxSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlankSpec" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER,
    "quoteItemId" INTEGER,
    "materialId" INTEGER NOT NULL,
    "blankLengthInches" DECIMAL(8,3) NOT NULL,
    "blankWidthInches" DECIMAL(8,3) NOT NULL,
    "grainDirection" "GrainDirection" NOT NULL,
    "boardGrade" TEXT NOT NULL,
    "flute" "Flute" NOT NULL,
    "wallType" "WallType" NOT NULL,
    "scoreCount" INTEGER NOT NULL,
    "scorePositions" TEXT NOT NULL,
    "slotDepth" DECIMAL(8,3),
    "slotWidth" DECIMAL(8,3),
    "specialCuts" TEXT,
    "trimAmount" DECIMAL(8,3),
    "jointType" "JointType" NOT NULL,
    "printType" "PrintType" NOT NULL DEFAULT 'NONE',
    "printColors" INTEGER NOT NULL DEFAULT 0,
    "inkTypes" TEXT,
    "plateNumbers" TEXT,
    "coating" "CoatingType" NOT NULL DEFAULT 'NONE',
    "bundleCount" INTEGER,
    "tieHigh" INTEGER,
    "tierWide" INTEGER,
    "palletsPerOrder" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlankSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOMLine" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "quantityPer" DECIMAL(14,6) NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,

    CONSTRAINT "BOMLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tooling" (
    "id" SERIAL NOT NULL,
    "toolNumber" TEXT NOT NULL,
    "type" "ToolType" NOT NULL,
    "description" TEXT,
    "customerId" INTEGER,
    "condition" "ToolCondition" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tooling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" SERIAL NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "productId" INTEGER,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItemBOMLine" (
    "id" SERIAL NOT NULL,
    "quoteItemId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "quantityPer" DECIMAL(14,6) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "QuoteItemBOMLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "quoteId" INTEGER,
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedShipDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "quoteItemId" INTEGER,
    "productId" INTEGER,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "qtyShipped" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" SERIAL NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "workCenterId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "quantityOrdered" INTEGER NOT NULL,
    "quantityComplete" INTEGER NOT NULL DEFAULT 0,
    "wasteQty" INTEGER NOT NULL DEFAULT 0,
    "estimatedSetupMinutes" INTEGER,
    "actualSetupMinutes" INTEGER,
    "estimatedRunMinutes" INTEGER,
    "actualRunMinutes" INTEGER,
    "plateNumber" TEXT,
    "dieNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" SERIAL NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "bolNumber" TEXT,
    "totalWeight" DECIMAL(10,2),
    "palletCount" INTEGER,
    "shippedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "shipmentId" INTEGER,
    "customerId" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "qbSyncStatus" "QbSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "qbSyncedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_salesRepId_idx" ON "Customer"("salesRepId");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenter_name_key" ON "WorkCenter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_type_idx" ON "Material"("type");

-- CreateIndex
CREATE INDEX "Material_supplierId_idx" ON "Material"("supplierId");

-- CreateIndex
CREATE INDEX "MaterialInventory_locationId_idx" ON "MaterialInventory"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialInventory_materialId_locationId_key" ON "MaterialInventory"("materialId", "locationId");

-- CreateIndex
CREATE INDEX "MaterialReceipt_materialId_idx" ON "MaterialReceipt"("materialId");

-- CreateIndex
CREATE INDEX "MaterialReceipt_purchaseOrderItemId_idx" ON "MaterialReceipt"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "MaterialTransaction_materialId_locationId_idx" ON "MaterialTransaction"("materialId", "locationId");

-- CreateIndex
CREATE INDEX "MaterialTransaction_createdAt_idx" ON "MaterialTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_poId_idx" ON "PurchaseOrderItem"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderItem_poId_lineNumber_key" ON "PurchaseOrderItem"("poId", "lineNumber");

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_idx" ON "ProductCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BoxSpec_productId_key" ON "BoxSpec"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BoxSpec_quoteItemId_key" ON "BoxSpec"("quoteItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BlankSpec_productId_key" ON "BlankSpec"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BlankSpec_quoteItemId_key" ON "BlankSpec"("quoteItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BOMLine_productId_materialId_key" ON "BOMLine"("productId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "Tooling_toolNumber_key" ON "Tooling"("toolNumber");

-- CreateIndex
CREATE INDEX "Tooling_customerId_idx" ON "Tooling"("customerId");

-- CreateIndex
CREATE INDEX "Tooling_type_idx" ON "Tooling"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteItem_quoteId_lineNumber_key" ON "QuoteItem"("quoteId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteItemBOMLine_quoteItemId_materialId_key" ON "QuoteItemBOMLine"("quoteItemId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orderNumber_key" ON "SalesOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_quoteId_key" ON "SalesOrder"("quoteId");

-- CreateIndex
CREATE INDEX "SalesOrder_customerId_idx" ON "SalesOrder"("customerId");

-- CreateIndex
CREATE INDEX "SalesOrder_status_idx" ON "SalesOrder"("status");

-- CreateIndex
CREATE INDEX "SalesOrderItem_orderId_idx" ON "SalesOrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderItem_orderId_lineNumber_key" ON "SalesOrderItem"("orderId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_jobNumber_key" ON "ProductionJob"("jobNumber");

-- CreateIndex
CREATE INDEX "ProductionJob_status_idx" ON "ProductionJob"("status");

-- CreateIndex
CREATE INDEX "ProductionJob_workCenterId_idx" ON "ProductionJob"("workCenterId");

-- CreateIndex
CREATE INDEX "ProductionJob_scheduledDate_idx" ON "ProductionJob"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentItem_shipmentId_orderItemId_key" ON "ShipmentItem"("shipmentId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_qbSyncStatus_idx" ON "Invoice"("qbSyncStatus");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialInventory" ADD CONSTRAINT "MaterialInventory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialInventory" ADD CONSTRAINT "MaterialInventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTransaction" ADD CONSTRAINT "MaterialTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxSpec" ADD CONSTRAINT "BoxSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxSpec" ADD CONSTRAINT "BoxSpec_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMLine" ADD CONSTRAINT "BOMLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMLine" ADD CONSTRAINT "BOMLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooling" ADD CONSTRAINT "Tooling_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooling" ADD CONSTRAINT "Tooling_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemBOMLine" ADD CONSTRAINT "QuoteItemBOMLine_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemBOMLine" ADD CONSTRAINT "QuoteItemBOMLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
