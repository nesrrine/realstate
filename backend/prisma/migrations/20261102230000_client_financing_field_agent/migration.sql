-- Clients : mode de paiement, besoin exact, agent terrain (import base portail 2026)
-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "fieldAgentId" TEXT,
ADD COLUMN     "financing" TEXT,
ADD COLUMN     "needDescription" TEXT;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_fieldAgentId_fkey" FOREIGN KEY ("fieldAgentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

