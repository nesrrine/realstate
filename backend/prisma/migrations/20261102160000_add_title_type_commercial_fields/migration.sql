-- Type de titre (tous les biens) et caractéristiques du local commercial (revenu mensuel…)
-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "commercialCeilingHeight" DOUBLE PRECISION,
ADD COLUMN     "commercialFrontage" DOUBLE PRECISION,
ADD COLUMN     "commercialLeased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commercialMezzanine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commercialMonthlyRevenue" DECIMAL(12,2),
ADD COLUMN     "titleType" TEXT;

