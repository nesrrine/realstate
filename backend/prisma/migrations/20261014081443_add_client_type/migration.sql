/*
  Warnings:

  - The `source` column on the `leads` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PROSPECT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'PHONE', 'WALK_IN', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('STATUS_CHANGED', 'NOTE_ADDED', 'AGENT_ASSIGNED', 'CLIENT_LINKED', 'PROPERTY_LINKED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'OFFER_MADE', 'CREATED');

-- DropIndex
DROP INDEX "idx_properties_reference";

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "lostDate" TIMESTAMP(3),
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "nextFollowUp" TIMESTAMP(3),
ADD COLUMN     "wonDate" TIMESTAMP(3),
DROP COLUMN "source",
ADD COLUMN     "source" "LeadSource" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" "LeadActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_activities_leadId_idx" ON "lead_activities"("leadId");

-- CreateIndex
CREATE INDEX "lead_activities_createdAt_idx" ON "lead_activities"("createdAt");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "leads"("source");

-- CreateIndex
CREATE INDEX "properties_transactionType_idx" ON "properties"("transactionType");

-- CreateIndex
CREATE INDEX "properties_isPublished_idx" ON "properties"("isPublished");

-- CreateIndex
CREATE INDEX "properties_createdAt_idx" ON "properties"("createdAt");

-- CreateIndex
CREATE INDEX "properties_updatedAt_idx" ON "properties"("updatedAt");

-- CreateIndex
CREATE INDEX "properties_city_status_idx" ON "properties"("city", "status");

-- CreateIndex
CREATE INDEX "properties_status_isPublished_idx" ON "properties"("status", "isPublished");

-- CreateIndex
CREATE INDEX "properties_price_idx" ON "properties"("price");

-- CreateIndex
CREATE INDEX "properties_surface_idx" ON "properties"("surface");

-- CreateIndex
CREATE INDEX "transactions_clientId_idx" ON "transactions"("clientId");

-- CreateIndex
CREATE INDEX "transactions_ownerId_idx" ON "transactions"("ownerId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_updatedAt_idx" ON "transactions"("updatedAt");

-- CreateIndex
CREATE INDEX "visits_clientId_idx" ON "visits"("clientId");

-- CreateIndex
CREATE INDEX "visits_propertyId_idx" ON "visits"("propertyId");

-- CreateIndex
CREATE INDEX "visits_createdAt_idx" ON "visits"("createdAt");

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
