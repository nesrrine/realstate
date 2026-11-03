-- Add new columns to transactions
ALTER TABLE "transactions" ADD COLUMN "fieldAgentId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "officeAgentId" TEXT;

-- Migrate existing agentId to fieldAgentId
UPDATE "transactions" SET "fieldAgentId" = "agentId", "officeAgentId" = "agentId";

-- Make fields required
ALTER TABLE "transactions" ALTER COLUMN "fieldAgentId" SET NOT NULL;
ALTER TABLE "transactions" ALTER COLUMN "officeAgentId" SET NOT NULL;

-- Drop old agentId column
ALTER TABLE "transactions" DROP COLUMN "agentId";

-- Add foreign keys for transactions
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fieldAgentId_fkey" FOREIGN KEY ("fieldAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_officeAgentId_fkey" FOREIGN KEY ("officeAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT;

-- Add new columns to commissions
ALTER TABLE "commissions" ADD COLUMN "fieldAgentAmount" DECIMAL(10, 2);
ALTER TABLE "commissions" ADD COLUMN "officeAgentAmount" DECIMAL(10, 2);
ALTER TABLE "commissions" ADD COLUMN "fieldAgentShareRate" DECIMAL(5, 4);
ALTER TABLE "commissions" ADD COLUMN "officeAgentShareRate" DECIMAL(5, 4);

-- Migrate existing agent data to field agent (copy to both for now)
UPDATE "commissions" SET "fieldAgentAmount" = "agentAmount", "officeAgentAmount" = "agentAmount";
UPDATE "commissions" SET "fieldAgentShareRate" = "agentShareRate", "officeAgentShareRate" = "agentShareRate";

-- Make new columns required
ALTER TABLE "commissions" ALTER COLUMN "fieldAgentAmount" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "officeAgentAmount" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "fieldAgentShareRate" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "officeAgentShareRate" SET NOT NULL;

-- Drop old columns
ALTER TABLE "commissions" DROP COLUMN "agentAmount";
ALTER TABLE "commissions" DROP COLUMN "agentShareRate";

-- Create indexes
CREATE INDEX "transactions_fieldAgentId_idx" ON "transactions"("fieldAgentId");
CREATE INDEX "transactions_officeAgentId_idx" ON "transactions"("officeAgentId");