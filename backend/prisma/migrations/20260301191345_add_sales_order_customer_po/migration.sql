-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "customerPODate" TIMESTAMP(3),
ADD COLUMN     "customerPODocument" TEXT,
ADD COLUMN     "customerPONumber" TEXT;
