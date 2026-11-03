-- Pays par défaut : Tunisie (TN) au lieu de France (FR)
-- AlterTable
ALTER TABLE "owners" ALTER COLUMN "country" SET DEFAULT 'TN';

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "country" SET DEFAULT 'TN';


-- Fiches créées avec l'ancienne valeur par défaut
UPDATE "owners" SET "country" = 'TN' WHERE "country" = 'FR';
UPDATE "properties" SET "country" = 'TN' WHERE "country" = 'FR';
