-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CSR');

-- CreateEnum
CREATE TYPE "PartyRoleType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'PROSPECT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('MAIN', 'BUYER', 'SALES_REP', 'PURCHASING', 'AP', 'RECEIVING', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('OWN_PLANT', 'OWN_WAREHOUSE', 'OFFICE', 'CUSTOMER', 'SUPPLIER', 'OTHER');

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
CREATE TYPE "FulfillmentPath" AS ENUM ('MANUFACTURE', 'FULFILL_FROM_STOCK', 'PURCHASE_RESELL', 'DROP_SHIP', 'CONVERT', 'SERVICE');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING', 'COMMITTED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'SHIPPED', 'INVOICED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETE', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobReadiness" AS ENUM ('WAITING_SHEETS', 'WAITING_TOOLING', 'WAITING_BOTH', 'READY', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('DRAFT', 'WAREHOUSE_ENTERED', 'CONFIRMED', 'SHIPPED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "VarianceReason" AS ENUM ('RECOUNT', 'DAMAGE', 'CUSTOMER_REQUEST', 'TOLERANCE_APPLIED', 'HOLD_FOR_NEXT_SHIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "QbSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCED', 'ERROR');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEIPT', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER', 'ISSUED_TO_JOB', 'RETURNED_FROM_JOB', 'CONVERTED_TO_FG', 'WASTE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('DIE', 'PLATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ToolCondition" AS ENUM ('NEW', 'GOOD', 'WORN', 'RETIRED');

-- CreateTable
CREATE TABLE "PaymentTerm" (
    "id" SERIAL NOT NULL,
    "termCode" TEXT NOT NULL,
    "termName" TEXT NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountDays" INTEGER NOT NULL DEFAULT 0,
    "netDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialType" (
    "id" SERIAL NOT NULL,
    "typeKey" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceType" (
    "id" SERIAL NOT NULL,
    "typeKey" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ResourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModule" (
    "id" SERIAL NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleSpecField" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "selectOptions" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModuleSpecField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" SERIAL NOT NULL,
    "partyCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyRole" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "roleType" "PartyRoleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyContact" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "name" TEXT,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactType" "ContactType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "invoiceDistribution" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyContact_pkey" PRIMARY KEY ("id")
);

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
    "locationType" "LocationType" NOT NULL DEFAULT 'OWN_PLANT',
    "partyId" INTEGER,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'US',
    "phone" TEXT,
    "email" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "deliveryInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partyId" INTEGER,
    "accountNumber" TEXT,
    "taxId" TEXT,
    "resaleCertificateNumber" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'US',
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingZip" TEXT,
    "billingCountry" TEXT DEFAULT 'US',
    "paymentTermId" INTEGER,
    "creditLimit" DECIMAL(12,2),
    "creditHold" BOOLEAN NOT NULL DEFAULT false,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxExemptId" TEXT,
    "defaultSalesRepId" INTEGER,
    "notes" TEXT,
    "defaultOverTolerance" DECIMAL(6,2) NOT NULL DEFAULT 10.0,
    "defaultUnderTolerance" DECIMAL(6,2) NOT NULL DEFAULT 10.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partyId" INTEGER,
    "accountNumber" TEXT,
    "taxId" TEXT,
    "is1099Eligible" BOOLEAN NOT NULL DEFAULT false,
    "name1099" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'US',
    "paymentTermId" INTEGER,
    "creditLimit" DECIMAL(12,2),
    "w9OnFile" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "resourceTypeId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "yearOfManufacture" INTEGER,
    "maxSheetWidth" DECIMAL(8,3),
    "maxSheetLength" DECIMAL(8,3),
    "minSheetWidth" DECIMAL(8,3),
    "minSheetLength" DECIMAL(8,3),
    "maxSpeed" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(12,2),
    "warrantyExpiry" TIMESTAMP(3),
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDue" TIMESTAMP(3),
    "assetTagId" TEXT,
    "partsSupplierId" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" SERIAL NOT NULL,
    "operationKey" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceCapability" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "operationId" INTEGER NOT NULL,
    "maxSpeed" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "ResourceCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationRequirement" (
    "id" SERIAL NOT NULL,
    "operationId" INTEGER NOT NULL,
    "resourceTypeId" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "OperationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "materialTypeId" INTEGER,
    "unitOfMeasure" TEXT NOT NULL,
    "defaultCost" DECIMAL(12,4),
    "reorderPoint" DECIMAL(12,4),
    "reorderQty" DECIMAL(12,4),
    "leadTimeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

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
    "moduleId" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterSpec" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" INTEGER,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "listPrice" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerItem" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customerId" INTEGER NOT NULL,
    "masterSpecId" INTEGER,
    "variantId" INTEGER,
    "listPrice" DECIMAL(12,4),
    "fulfillmentPath" "FulfillmentPath" NOT NULL DEFAULT 'MANUFACTURE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoxSpec" (
    "id" SERIAL NOT NULL,
    "masterSpecId" INTEGER,
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
    "masterSpecId" INTEGER,
    "quoteItemId" INTEGER,
    "materialId" INTEGER NOT NULL,
    "outsPerSheet" INTEGER NOT NULL DEFAULT 1,
    "sheetsPerBox" DECIMAL(8,4) NOT NULL DEFAULT 1.0,
    "sheetLengthInches" DECIMAL(8,3),
    "sheetWidthInches" DECIMAL(8,3),
    "layoutNotes" TEXT,
    "rollWidthRequired" DECIMAL(8,3),
    "requiredDieId" INTEGER,
    "requiredPlateIds" TEXT,
    "materialVariantId" INTEGER,
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
    "masterSpecId" INTEGER NOT NULL,
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
    "customerItemId" INTEGER,
    "masterSpecId" INTEGER,
    "condition" "ToolCondition" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tooling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "masterSpecId" INTEGER NOT NULL,
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
CREATE TABLE "VariantSpec" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "specFieldId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpec" (
    "id" SERIAL NOT NULL,
    "masterSpecId" INTEGER NOT NULL,
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
    "masterSpecId" INTEGER NOT NULL,
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
    "masterSpecId" INTEGER,
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
    "customerItemId" INTEGER,
    "variantId" INTEGER,
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
    "customerPONumber" TEXT,
    "customerPODate" TIMESTAMP(3),
    "customerPODocument" TEXT,
    "overTolerance" DECIMAL(6,2),
    "underTolerance" DECIMAL(6,2),
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
    "customerItemId" INTEGER,
    "variantId" INTEGER,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "qtyShipped" INTEGER NOT NULL DEFAULT 0,
    "toleranceOverride" BOOLEAN NOT NULL DEFAULT false,
    "qtyTolerance" DECIMAL(6,2),

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCommitment" (
    "id" SERIAL NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "masterSpecId" INTEGER,
    "variantId" INTEGER,
    "locationId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "InventoryCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" SERIAL NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "jobReadiness" "JobReadiness" NOT NULL DEFAULT 'READY',
    "sheetsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "toolingConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "quantityOrdered" INTEGER NOT NULL,
    "quantityComplete" INTEGER NOT NULL DEFAULT 0,
    "quantityGoodOutput" INTEGER NOT NULL DEFAULT 0,
    "quantityWaste" INTEGER NOT NULL DEFAULT 0,
    "wasteQty" INTEGER NOT NULL DEFAULT 0,
    "rawMaterialConsumed" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "finishedGoodsProduced" INTEGER NOT NULL DEFAULT 0,
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

-- CreateTable
CREATE TABLE "Shipment" (
    "id" SERIAL NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "shipmentStage" "ShipmentStage" NOT NULL DEFAULT 'DRAFT',
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "bolNumber" TEXT,
    "totalWeight" DECIMAL(10,2),
    "palletCount" INTEGER,
    "systemSuggestedQty" DECIMAL(14,4),
    "warehouseEnteredQty" DECIMAL(14,4),
    "confirmedQty" DECIMAL(14,4),
    "confirmedById" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "varianceQty" DECIMAL(14,4),
    "varianceReason" "VarianceReason",
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
    "variantId" INTEGER,
    "quantity" INTEGER NOT NULL,
    "systemSuggestedQty" DECIMAL(14,4),
    "warehouseEnteredQty" DECIMAL(14,4),
    "confirmedQty" DECIMAL(14,4),
    "varianceNotes" TEXT,

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
CREATE UNIQUE INDEX "PaymentTerm_termCode_key" ON "PaymentTerm"("termCode");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialType_typeKey_key" ON "MaterialType"("typeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_typeKey_key" ON "ResourceType"("typeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModule_moduleKey_key" ON "ProductModule"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSpecField_moduleId_fieldKey_key" ON "ModuleSpecField"("moduleId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "Party_partyCode_key" ON "Party"("partyCode");

-- CreateIndex
CREATE INDEX "PartyRole_partyId_idx" ON "PartyRole"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyRole_partyId_roleType_key" ON "PartyRole"("partyId", "roleType");

-- CreateIndex
CREATE INDEX "PartyContact_partyId_idx" ON "PartyContact"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_partyId_idx" ON "Location"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_partyId_idx" ON "Customer"("partyId");

-- CreateIndex
CREATE INDEX "Customer_defaultSalesRepId_idx" ON "Customer"("defaultSalesRepId");

-- CreateIndex
CREATE INDEX "Customer_paymentTermId_idx" ON "Customer"("paymentTermId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_partyId_idx" ON "Supplier"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_name_key" ON "Resource"("name");

-- CreateIndex
CREATE INDEX "Resource_resourceTypeId_idx" ON "Resource"("resourceTypeId");

-- CreateIndex
CREATE INDEX "Resource_locationId_idx" ON "Resource"("locationId");

-- CreateIndex
CREATE INDEX "Resource_partsSupplierId_idx" ON "Resource"("partsSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_operationKey_key" ON "Operation"("operationKey");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceCapability_resourceId_operationId_key" ON "ResourceCapability"("resourceId", "operationId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationRequirement_operationId_resourceTypeId_key" ON "OperationRequirement"("operationId", "resourceTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_materialTypeId_idx" ON "Material"("materialTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialVariant_variantCode_key" ON "MaterialVariant"("variantCode");

-- CreateIndex
CREATE INDEX "MaterialVariant_materialId_idx" ON "MaterialVariant"("materialId");

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
CREATE INDEX "ProductCategory_moduleId_idx" ON "ProductCategory"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterSpec_sku_key" ON "MasterSpec"("sku");

-- CreateIndex
CREATE INDEX "MasterSpec_categoryId_idx" ON "MasterSpec"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerItem_code_key" ON "CustomerItem"("code");

-- CreateIndex
CREATE INDEX "CustomerItem_customerId_idx" ON "CustomerItem"("customerId");

-- CreateIndex
CREATE INDEX "CustomerItem_masterSpecId_idx" ON "CustomerItem"("masterSpecId");

-- CreateIndex
CREATE UNIQUE INDEX "BoxSpec_masterSpecId_key" ON "BoxSpec"("masterSpecId");

-- CreateIndex
CREATE UNIQUE INDEX "BoxSpec_quoteItemId_key" ON "BoxSpec"("quoteItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BlankSpec_masterSpecId_key" ON "BlankSpec"("masterSpecId");

-- CreateIndex
CREATE UNIQUE INDEX "BlankSpec_quoteItemId_key" ON "BlankSpec"("quoteItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BOMLine_masterSpecId_materialId_key" ON "BOMLine"("masterSpecId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "Tooling_toolNumber_key" ON "Tooling"("toolNumber");

-- CreateIndex
CREATE INDEX "Tooling_customerId_idx" ON "Tooling"("customerId");

-- CreateIndex
CREATE INDEX "Tooling_customerItemId_idx" ON "Tooling"("customerItemId");

-- CreateIndex
CREATE INDEX "Tooling_masterSpecId_idx" ON "Tooling"("masterSpecId");

-- CreateIndex
CREATE INDEX "Tooling_type_idx" ON "Tooling"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_masterSpecId_idx" ON "ProductVariant"("masterSpecId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantSpec_variantId_specFieldId_key" ON "VariantSpec"("variantId", "specFieldId");

-- CreateIndex
CREATE INDEX "ProductSpec_masterSpecId_idx" ON "ProductSpec"("masterSpecId");

-- CreateIndex
CREATE INDEX "FinishedGoodsInventory_masterSpecId_idx" ON "FinishedGoodsInventory"("masterSpecId");

-- CreateIndex
CREATE INDEX "FinishedGoodsInventory_locationId_idx" ON "FinishedGoodsInventory"("locationId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_materialId_idx" ON "InventoryTransfer"("materialId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_masterSpecId_idx" ON "InventoryTransfer"("masterSpecId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_fromLocationId_idx" ON "InventoryTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_toLocationId_idx" ON "InventoryTransfer"("toLocationId");

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
CREATE INDEX "InventoryCommitment_orderItemId_idx" ON "InventoryCommitment"("orderItemId");

-- CreateIndex
CREATE INDEX "InventoryCommitment_masterSpecId_idx" ON "InventoryCommitment"("masterSpecId");

-- CreateIndex
CREATE INDEX "InventoryCommitment_locationId_idx" ON "InventoryCommitment"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_jobNumber_key" ON "ProductionJob"("jobNumber");

-- CreateIndex
CREATE INDEX "ProductionJob_status_idx" ON "ProductionJob"("status");

-- CreateIndex
CREATE INDEX "ProductionJob_resourceId_idx" ON "ProductionJob"("resourceId");

-- CreateIndex
CREATE INDEX "ProductionJob_scheduledDate_idx" ON "ProductionJob"("scheduledDate");

-- CreateIndex
CREATE INDEX "ProductionConsumption_productionJobId_idx" ON "ProductionConsumption"("productionJobId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_materialId_idx" ON "ProductionConsumption"("materialId");

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
ALTER TABLE "ModuleSpecField" ADD CONSTRAINT "ModuleSpecField_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyRole" ADD CONSTRAINT "PartyRole_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyContact" ADD CONSTRAINT "PartyContact_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_defaultSalesRepId_fkey" FOREIGN KEY ("defaultSalesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_partsSupplierId_fkey" FOREIGN KEY ("partsSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceCapability" ADD CONSTRAINT "ResourceCapability_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceCapability" ADD CONSTRAINT "ResourceCapability_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRequirement" ADD CONSTRAINT "OperationRequirement_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRequirement" ADD CONSTRAINT "OperationRequirement_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "MaterialType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialVariant" ADD CONSTRAINT "MaterialVariant_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterSpec" ADD CONSTRAINT "MasterSpec_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerItem" ADD CONSTRAINT "CustomerItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerItem" ADD CONSTRAINT "CustomerItem_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerItem" ADD CONSTRAINT "CustomerItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxSpec" ADD CONSTRAINT "BoxSpec_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxSpec" ADD CONSTRAINT "BoxSpec_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_requiredDieId_fkey" FOREIGN KEY ("requiredDieId") REFERENCES "Tooling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlankSpec" ADD CONSTRAINT "BlankSpec_materialVariantId_fkey" FOREIGN KEY ("materialVariantId") REFERENCES "MaterialVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMLine" ADD CONSTRAINT "BOMLine_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMLine" ADD CONSTRAINT "BOMLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooling" ADD CONSTRAINT "Tooling_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooling" ADD CONSTRAINT "Tooling_customerItemId_fkey" FOREIGN KEY ("customerItemId") REFERENCES "CustomerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooling" ADD CONSTRAINT "Tooling_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooling" ADD CONSTRAINT "Tooling_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantSpec" ADD CONSTRAINT "VariantSpec_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantSpec" ADD CONSTRAINT "VariantSpec_specFieldId_fkey" FOREIGN KEY ("specFieldId") REFERENCES "ModuleSpecField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoodsInventory" ADD CONSTRAINT "FinishedGoodsInventory_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoodsInventory" ADD CONSTRAINT "FinishedGoodsInventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoodsInventory" ADD CONSTRAINT "FinishedGoodsInventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MaterialVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_customerItemId_fkey" FOREIGN KEY ("customerItemId") REFERENCES "CustomerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_customerItemId_fkey" FOREIGN KEY ("customerItemId") REFERENCES "CustomerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCommitment" ADD CONSTRAINT "InventoryCommitment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCommitment" ADD CONSTRAINT "InventoryCommitment_masterSpecId_fkey" FOREIGN KEY ("masterSpecId") REFERENCES "MasterSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCommitment" ADD CONSTRAINT "InventoryCommitment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCommitment" ADD CONSTRAINT "InventoryCommitment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
