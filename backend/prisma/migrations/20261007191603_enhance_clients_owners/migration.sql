-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "budgetMax" DECIMAL(12,2),
ADD COLUMN     "budgetMin" DECIMAL(12,2),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "minSurface" DOUBLE PRECISION,
ADD COLUMN     "preferredPropertyTypes" TEXT[],
ADD COLUMN     "preferredZones" TEXT[],
ADD COLUMN     "transactionType" "TransactionType",
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "owners" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'FR',
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- CreateIndex
CREATE INDEX "clients_agentId_idx" ON "clients"("agentId");

-- CreateIndex
CREATE INDEX "clients_isActive_idx" ON "clients"("isActive");

-- CreateIndex
CREATE INDEX "owners_isActive_idx" ON "owners"("isActive");
