-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('TO_CONTACT', 'CONTACTED', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'MESSAGE', 'VISIT', 'NOTE', 'EMAIL');

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_fieldAgentId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_officeAgentId_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'TO_CONTACT',
ADD COLUMN     "lastInteractionAt" TIMESTAMP(3),
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "client_interactions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" "InteractionType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_interactions_clientId_idx" ON "client_interactions"("clientId");

-- CreateIndex
CREATE INDEX "client_interactions_occurredAt_idx" ON "client_interactions"("occurredAt");

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fieldAgentId_fkey" FOREIGN KEY ("fieldAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_officeAgentId_fkey" FOREIGN KEY ("officeAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
