/*
  Warnings:

  - Made the column `officeAgentId` on table `visits` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_fieldAgentId_fkey";

-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_officeAgentId_fkey";

-- Fill NULL officeAgentId with first available agent (or duplicate fieldAgentId)
UPDATE "visits" SET "officeAgentId" = COALESCE("officeAgentId", "fieldAgentId");

-- AlterTable
ALTER TABLE "visits" ALTER COLUMN "officeAgentId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_fieldAgentId_fkey" FOREIGN KEY ("fieldAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_officeAgentId_fkey" FOREIGN KEY ("officeAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
