-- Classes énergie (DPE) et GES retirées de l'application
-- AlterTable
ALTER TABLE "properties" DROP COLUMN "energyClass",
DROP COLUMN "gesClass";
