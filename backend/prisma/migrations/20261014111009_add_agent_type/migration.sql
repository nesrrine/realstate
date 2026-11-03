-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('FIELD', 'OFFICE');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "agentType" "AgentType" NOT NULL DEFAULT 'FIELD';
