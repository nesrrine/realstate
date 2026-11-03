-- Frais de visite et dépenses journalières + autorisation agent (canManageCash)
-- CreateEnum
CREATE TYPE "CashEntryType" AS ENUM ('VISIT_FEE', 'EXPENSE');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "canManageCash" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cash_entries" (
    "id" TEXT NOT NULL,
    "type" "CashEntryType" NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "paymentMethod" TEXT,
    "visitId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_entries_date_idx" ON "cash_entries"("date");

-- CreateIndex
CREATE INDEX "cash_entries_type_idx" ON "cash_entries"("type");

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

