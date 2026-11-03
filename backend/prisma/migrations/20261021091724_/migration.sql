-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('IN_PERSON', 'REMOTE');

-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "visitType" "VisitType" NOT NULL DEFAULT 'IN_PERSON';
