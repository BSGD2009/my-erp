-- CreateEnum
CREATE TYPE "JobReadiness" AS ENUM ('WAITING_SHEETS', 'WAITING_TOOLING', 'WAITING_BOTH', 'READY', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('DRAFT', 'WAREHOUSE_ENTERED', 'CONFIRMED', 'SHIPPED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "VarianceReason" AS ENUM ('RECOUNT', 'DAMAGE', 'CUSTOMER_REQUEST', 'TOLERANCE_APPLIED', 'HOLD_FOR_NEXT_SHIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'ISSUED_TO_JOB';
ALTER TYPE "TransactionType" ADD VALUE 'RETURNED_FROM_JOB';
ALTER TYPE "TransactionType" ADD VALUE 'CONVERTED_TO_FG';
ALTER TYPE "TransactionType" ADD VALUE 'WASTE';

-- AlterTable
ALTER TABLE "BlankSpec" ADD COLUMN     "layoutNotes" TEXT,
ADD COLUMN     "materialVariantId" INTEGER,
ADD COLUMN     "outsPerSheet" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "requiredDieId" INTEGER,
ADD COLUMN     "requiredPlateIds" TEXT,
ADD COLUMN     "rollWidthRequired" DECIMAL(8,3),
ADD COLUMN     "sheetLengthInches" DECIMAL(8,3),
ADD COLUMN     "sheetWidthInches" DECIMAL(8,3),
ADD COLUMN     "sheetsPerBox" DECIMAL(8,4) NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "defaultOverTolerance" DECIMAL(6,2) NOT NULL DEFAULT 10.0,
ADD COLUMN     "defaultUnderTolerance" DECIMAL(6,2) NOT NULL DEFAULT 10.0;

-- AlterTable
ALTER TABLE "ProductionJob" ADD COLUMN     "finishedGoodsProduced" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobReadiness" "JobReadiness" NOT NULL DEFAULT 'READY',
ADD COLUMN     "quantityGoodOutput" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantityWaste" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rawMaterialConsumed" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "sheetsConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "toolingConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "variantId" INTEGER;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "overTolerance" DECIMAL(6,2),
ADD COLUMN     "underTolerance" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "SalesOrderItem" ADD COLUMN     "qtyTolerance" DECIMAL(6,2),
ADD COLUMN     "toleranceOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variantId" INTEGER;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" INTEGER,
ADD COLUMN     "confirmedQty" DECIMAL(14,4),
ADD COLUMN     "shipmentStage" "ShipmentStage" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "systemSuggestedQty" DECIMAL(14,4),
ADD COLUMN     "varianceQty" DECIMAL(14,4),
ADD COLUMN     "varianceReason" "VarianceReason",
ADD COLUMN     "warehouseEnteredQty" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "ShipmentItem" ADD COLUMN     "confirmedQty" DECIMAL(14,4),
ADD COLUMN     "systemSuggestedQty" DECIMAL(14,4),
ADD COLUMN     "varianceNotes" TEXT,
ADD COLUMN     "variantId" INTEGER,
ADD COLUMN     "warehouseEnteredQty" DECIMAL(14,4);

-- CreateTable
CREATE TABLE "MaterialVariant" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "variantCode" TEXT NOT NULL,
    "description" TEXT,
    "rollWidth" DECIMAL(8,3),
    "sheetLength" DECIMAL(8,3),
    "sheetWidth" DECIMAL(8,3),
    "unitOfMeasure" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "variantDescription" TEXT,
    "width" DECIMAL(8,3),
    "length" DECIMAL(8,3),
    "thickness" DECIMAL(8,3),
    "bundleQty" INTEGER,
    "caseQty" INTEGER,
    "listPrice" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpec" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "specKey" TEXT NOT NULL,
    "specValue" TEXT NOT NULL,
    "specUnit" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedGoodsInventory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "locationId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(12,4),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinishedGoodsInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER,
    "productId" INTEGER,
    "variantId" INTEGER,
    "fromLocationId" INTEGER NOT NULL,
    "toLocationId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "transferredById" INTEGER NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionConsumption" (
    "id" SERIAL NOT NULL,
    "productionJobId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "locationId" INTEGER NOT NULL,
    "quantityIssued" DECIMAL(14,4) NOT NULL,
    "quantityActuallyUsed" DECIMAL(14,4) NOT NULL,
    "quantityReturned" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "wasteQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3) NOT NULL,
    "consumedById" INTEGER NOT NULL,

    CONSTRAINT "ProductionConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialVariant_variantCode_key" ON "MaterialVariant"("variantCode");

-- CreateIndex
CREATE INDEX "MaterialVariant_materialId_idx" ON "MaterialVariant"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductSpec_productId_idx" ON "ProductSpec"("productId");

-- CreateIndex
CREATE INDEX "FinishedGoodsInventory_productId_idx" ON "FinishedGoodsInventory"("productId");

-- CreateIndex
CREATE INDEX "FinishedGoodsInventory_locationId_idx" ON "FinishedGoodsInventory"("locationId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_materialId_idx" ON "InventoryTransfer"("materialId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_productId_idx" ON "InventoryTransfer"("productId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_fromLocationId_idx" ON "InventoryTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_toLocationId_idx" ON "InventoryTransfer"("toLocationId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_productionJobId_idx" ON "ProductionConsumption"("productionJobId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_materialId_idx" ON "ProductionConsumption"("materialId");

-- AddForeignKey
ALTER TABLE "MaterialVariant" ADD CONSTRAINT "MaterialVariant_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_requiredDieId_fkey" FOREIGN KEY ("requiredDieId") REFERENCES "Tooling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_materialVariantId_fkey" FOREIGN KEY ("materialVariantId") REFERENCES "MaterialVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoodsInventory" ADD CONSTRAINT "FinishedGoodsInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoodsInventory" ADD CONSTRAINT "FinishedGoodsInventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoodsInventory" ADD CONSTRAINT "FinishedGoodsInventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MaterialVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MaterialVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_consumedById_fkey" FOREIGN KEY ("consumedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
