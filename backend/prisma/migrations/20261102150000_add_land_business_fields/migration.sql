-- Caractéristiques terrain (façade, profondeur, COS, CUF…) et fonds de commerce (recette/jour…)
-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "businessActivity" TEXT,
ADD COLUMN     "businessDailyRevenue" DECIMAL(12,2),
ADD COLUMN     "businessEmployees" INTEGER,
ADD COLUMN     "businessRent" DECIMAL(10,2),
ADD COLUMN     "landCorner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landCos" DOUBLE PRECISION,
ADD COLUMN     "landCuf" DOUBLE PRECISION,
ADD COLUMN     "landDepth" DOUBLE PRECISION,
ADD COLUMN     "landFrontage" DOUBLE PRECISION,
ADD COLUMN     "landServiced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landZoning" TEXT;

