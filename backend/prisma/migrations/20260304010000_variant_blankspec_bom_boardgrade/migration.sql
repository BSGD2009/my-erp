-- CreateTable: BoardGrade
CREATE TABLE "BoardGrade" (
    "id" SERIAL NOT NULL,
    "gradeCode" TEXT NOT NULL,
    "gradeName" TEXT NOT NULL,
    "wallType" TEXT NOT NULL,
    "nominalCaliper" DECIMAL(6,3) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardGrade_gradeCode_key" ON "BoardGrade"("gradeCode");

-- Add new columns to ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "boardGradeId" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN "flute" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN "caliper" DECIMAL(6,3);

-- CreateIndex on ProductVariant.boardGradeId
CREATE INDEX "ProductVariant_boardGradeId_idx" ON "ProductVariant"("boardGradeId");

-- AddForeignKey ProductVariant → BoardGrade
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_boardGradeId_fkey" FOREIGN KEY ("boardGradeId") REFERENCES "BoardGrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add blankSpec and bomLines relations to ProductVariant (via BlankSpec.variantId and BOMLine.variantId)

-- BlankSpec: rename masterSpecId → variantId
ALTER TABLE "BlankSpec" DROP CONSTRAINT IF EXISTS "BlankSpec_masterSpecId_fkey";
DROP INDEX IF EXISTS "BlankSpec_masterSpecId_key";
ALTER TABLE "BlankSpec" RENAME COLUMN "masterSpecId" TO "variantId";
CREATE UNIQUE INDEX "BlankSpec_variantId_key" ON "BlankSpec"("variantId");
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BOMLine: rename masterSpecId → variantId
ALTER TABLE "BOMLine" DROP CONSTRAINT IF EXISTS "BOMLine_masterSpecId_fkey";
DROP INDEX IF EXISTS "BOMLine_masterSpecId_materialId_key";
ALTER TABLE "BOMLine" RENAME COLUMN "masterSpecId" TO "variantId";
ALTER TABLE "BOMLine" ADD CONSTRAINT "BOMLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "BOMLine_variantId_materialId_key" ON "BOMLine"("variantId", "materialId");

-- CustomerItem: make variantId required
-- First update any NULLs (there shouldn't be any after seed, but safety)
-- Then alter column to NOT NULL
ALTER TABLE "CustomerItem" ALTER COLUMN "variantId" SET NOT NULL;

-- CreateIndex on CustomerItem.variantId
CREATE INDEX "CustomerItem_variantId_idx" ON "CustomerItem"("variantId");
