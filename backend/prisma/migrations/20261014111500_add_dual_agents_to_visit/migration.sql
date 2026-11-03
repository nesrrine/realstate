-- Add new columns
ALTER TABLE "visits" ADD COLUMN "fieldAgentId" TEXT;
ALTER TABLE "visits" ADD COLUMN "officeAgentId" TEXT;

-- Migrate existing agentId to fieldAgentId
UPDATE "visits" SET "fieldAgentId" = "agentId";

-- Make fieldAgentId required
ALTER TABLE "visits" ALTER COLUMN "fieldAgentId" SET NOT NULL;

-- Drop old agentId column
ALTER TABLE "visits" DROP COLUMN "agentId";

-- Add foreign keys
ALTER TABLE "visits" ADD CONSTRAINT "visits_fieldAgentId_fkey" FOREIGN KEY ("fieldAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT;
ALTER TABLE "visits" ADD CONSTRAINT "visits_officeAgentId_fkey" FOREIGN KEY ("officeAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT;

-- Create indexes
CREATE INDEX "visits_fieldAgentId_idx" ON "visits"("fieldAgentId");
CREATE INDEX "visits_officeAgentId_idx" ON "visits"("officeAgentId");