-- Pre-Session 5: Schema v9
-- New enums, customer intelligence, print plate status, blanket contracts,
-- quote expansion, BlankSpecLocationOverride

-- ── New enum types ──────────────────────────────────────────────────────────

CREATE TYPE "PrintPlateStatus" AS ENUM ('NO_PRINT_NEEDED', 'PLATE_EXISTS', 'PLATE_NEEDED', 'PLATE_ON_ORDER');
CREATE TYPE "AcquisitionStatus" AS ENUM ('PROSPECT', 'QUOTED', 'NEGOTIATING', 'WON', 'ONBOARDING', 'ACTIVE', 'LOST', 'DORMANT');
CREATE TYPE "LeadSource" AS ENUM ('INBOUND_CALL', 'OUTBOUND_SALES', 'REFERRAL', 'TRADE_SHOW', 'BROKER', 'DISTRIBUTOR', 'OTHER');
CREATE TYPE "CompetitorRelationship" AS ENUM ('OUR_DISTRIBUTOR', 'COMPETITOR', 'UNKNOWN');
CREATE TYPE "AccountPotentialRating" AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE "CustomerStatedPriceSource" AS ENUM ('COMPETITOR', 'DISTRIBUTOR', 'UNKNOWN');
CREATE TYPE "BlanketContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RENEGOTIATING');

-- ── QuoteStatus expansion ───────────────────────────────────────────────────

ALTER TYPE "QuoteStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "QuoteStatus" ADD VALUE 'CONVERTED';

-- ── Customer intelligence fields ────────────────────────────────────────────

ALTER TABLE "Customer" ADD COLUMN "acquisitionStatus" "AcquisitionStatus";
ALTER TABLE "Customer" ADD COLUMN "leadSource" "LeadSource";
ALTER TABLE "Customer" ADD COLUMN "competitorName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "competitorRelationship" "CompetitorRelationship";
ALTER TABLE "Customer" ADD COLUMN "estimatedAnnualSpend" DECIMAL(12,2);
ALTER TABLE "Customer" ADD COLUMN "accountPotentialRating" "AccountPotentialRating";
ALTER TABLE "Customer" ADD COLUMN "otherProductsNeeded" TEXT;
ALTER TABLE "Customer" ADD COLUMN "currentSupplierNotes" TEXT;
ALTER TABLE "Customer" ADD COLUMN "blanketPoEligible" BOOLEAN NOT NULL DEFAULT false;

-- ── CustomerItem additions ──────────────────────────────────────────────────

ALTER TABLE "CustomerItem" ADD COLUMN "partNumber" TEXT;
ALTER TABLE "CustomerItem" ADD COLUMN "printPlateStatus" "PrintPlateStatus" NOT NULL DEFAULT 'NO_PRINT_NEEDED';
ALTER TABLE "CustomerItem" ADD COLUMN "printPlateExpectedDate" TIMESTAMP(3);
ALTER TABLE "CustomerItem" ADD COLUMN "printPlateRequired" BOOLEAN NOT NULL DEFAULT false;

-- ── Quote expansion ─────────────────────────────────────────────────────────

ALTER TABLE "Quote" ADD COLUMN "partyId" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "salesRepId" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "customerStatedPrice" DECIMAL(12,4);
ALTER TABLE "Quote" ADD COLUMN "customerStatedPriceSource" "CustomerStatedPriceSource";
ALTER TABLE "Quote" ADD COLUMN "internalNotes" TEXT;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── QuoteItem expansion ─────────────────────────────────────────────────────

-- Change quantity from Int to Decimal
ALTER TABLE "QuoteItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,4) USING "quantity"::DECIMAL(14,4);

ALTER TABLE "QuoteItem" ADD COLUMN "masterSpecId" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN "boardGradeId" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN "flute" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN "quantityUnit" TEXT DEFAULT 'EACH';
ALTER TABLE "QuoteItem" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Cost fields
ALTER TABLE "QuoteItem" ADD COLUMN "materialCostPerM" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "bomCostPerM" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "totalCostPerM" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "selectedSupplierId" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN "materialCostSnapshotDate" TIMESTAMP(3);

-- Pricing fields
ALTER TABLE "QuoteItem" ADD COLUMN "unitPricePerM" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "extendedPrice" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "marginPercent" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "customerTargetPrice" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "priceGap" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "priceGapPercent" DECIMAL(12,4);

-- Alt quantities
ALTER TABLE "QuoteItem" ADD COLUMN "altQty1" DECIMAL(14,4);
ALTER TABLE "QuoteItem" ADD COLUMN "altPrice1" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "altQty2" DECIMAL(14,4);
ALTER TABLE "QuoteItem" ADD COLUMN "altPrice2" DECIMAL(12,4);
ALTER TABLE "QuoteItem" ADD COLUMN "altQty3" DECIMAL(14,4);
ALTER TABLE "QuoteItem" ADD COLUMN "altPrice3" DECIMAL(12,4);

ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_boardGradeId_fkey" FOREIGN KEY ("boardGradeId") REFERENCES "BoardGrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_selectedSupplierId_fkey" FOREIGN KEY ("selectedSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── BlankSpecLocationOverride ───────────────────────────────────────────────

CREATE TABLE "BlankSpecLocationOverride" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "sheetLengthOverride" DECIMAL(8,3),
    "sheetWidthOverride" DECIMAL(8,3),
    "trimNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlankSpecLocationOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlankSpecLocationOverride_variantId_locationId_key" ON "BlankSpecLocationOverride"("variantId", "locationId");

ALTER TABLE "BlankSpecLocationOverride" ADD CONSTRAINT "BlankSpecLocationOverride_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlankSpecLocationOverride" ADD CONSTRAINT "BlankSpecLocationOverride_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── BlanketContract ─────────────────────────────────────────────────────────

CREATE TABLE "BlanketContract" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "status" "BlanketContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalCommittedValue" DECIMAL(12,2),
    "notes" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlanketContract_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlanketContract_contractNumber_key" ON "BlanketContract"("contractNumber");
CREATE INDEX "BlanketContract_customerId_idx" ON "BlanketContract"("customerId");
CREATE INDEX "BlanketContract_status_idx" ON "BlanketContract"("status");

ALTER TABLE "BlanketContract" ADD CONSTRAINT "BlanketContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlanketContract" ADD CONSTRAINT "BlanketContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── BlanketContractLine ─────────────────────────────────────────────────────

CREATE TABLE "BlanketContractLine" (
    "id" SERIAL NOT NULL,
    "blanketContractId" INTEGER NOT NULL,
    "customerItemId" INTEGER,
    "variantId" INTEGER,
    "committedQty" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "priceLockedAt" TIMESTAMP(3) NOT NULL,
    "priceLockedById" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "BlanketContractLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BlanketContractLine_blanketContractId_idx" ON "BlanketContractLine"("blanketContractId");

ALTER TABLE "BlanketContractLine" ADD CONSTRAINT "BlanketContractLine_blanketContractId_fkey" FOREIGN KEY ("blanketContractId") REFERENCES "BlanketContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlanketContractLine" ADD CONSTRAINT "BlanketContractLine_customerItemId_fkey" FOREIGN KEY ("customerItemId") REFERENCES "CustomerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlanketContractLine" ADD CONSTRAINT "BlanketContractLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlanketContractLine" ADD CONSTRAINT "BlanketContractLine_priceLockedById_fkey" FOREIGN KEY ("priceLockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
