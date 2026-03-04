-- CreateEnum
CREATE TYPE "UpchargeType" AS ENUM ('E_FLUTE', 'BE_FLUTE', 'WHITE_TOP_31', 'WHITE_TOP_42', 'WHITE_TOP_69', 'KRAFT_MCH', 'M33', 'M36', 'NARROW_WIDTH', 'SHORT_CUT_25', 'SHORT_CUT_29', 'TELE_TWIN_SCORING', 'FLAT_SCORES', 'REVERSE_SCORES', 'WRA_SW', 'WRA_DW', 'STOP_CHARGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('PER_MSF', 'FLAT_SETUP');

-- DropForeignKey
ALTER TABLE "CustomerItem" DROP CONSTRAINT "CustomerItem_variantId_fkey";

-- CreateTable
CREATE TABLE "BoardPrice" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "deliveryLocationId" INTEGER,
    "boardGradeId" INTEGER NOT NULL,
    "flute" TEXT,
    "tier1MaxMsf" DECIMAL(10,2) NOT NULL,
    "tier1Price" DECIMAL(12,4) NOT NULL,
    "tier2MaxMsf" DECIMAL(10,2) NOT NULL,
    "tier2Price" DECIMAL(12,4) NOT NULL,
    "tier3MaxMsf" DECIMAL(10,2) NOT NULL,
    "tier3Price" DECIMAL(12,4) NOT NULL,
    "tier4Price" DECIMAL(12,4) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardUpcharge" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "upchargeType" "UpchargeType" NOT NULL,
    "chargeType" "ChargeType" NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "condition" TEXT,
    "minMsf" DECIMAL(10,2),
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardUpcharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardPrice_supplierId_idx" ON "BoardPrice"("supplierId");

-- CreateIndex
CREATE INDEX "BoardPrice_boardGradeId_idx" ON "BoardPrice"("boardGradeId");

-- CreateIndex
CREATE INDEX "BoardPrice_deliveryLocationId_idx" ON "BoardPrice"("deliveryLocationId");

-- CreateIndex
CREATE INDEX "BoardUpcharge_supplierId_idx" ON "BoardUpcharge"("supplierId");

-- CreateIndex
CREATE INDEX "BoardUpcharge_upchargeType_idx" ON "BoardUpcharge"("upchargeType");

-- AddForeignKey
ALTER TABLE "BoardPrice" ADD CONSTRAINT "BoardPrice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPrice" ADD CONSTRAINT "BoardPrice_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPrice" ADD CONSTRAINT "BoardPrice_boardGradeId_fkey" FOREIGN KEY ("boardGradeId") REFERENCES "BoardGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardUpcharge" ADD CONSTRAINT "BoardUpcharge_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerItem" ADD CONSTRAINT "CustomerItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
