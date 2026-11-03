-- Les propriétaires sont gérés uniquement via la table "owners" (formulaire de bien).
-- Les clients encore typés OWNER reçoivent une fiche propriétaire (si aucune n'existe
-- déjà avec le même téléphone ou email), puis passent en SELLER.
INSERT INTO "owners" ("id", "firstName", "lastName", "email", "phone", "whatsapp", "address", "city", "zipCode", "notes", "updatedAt")
SELECT
  'c' || substr(md5(random()::text || c."id"), 1, 24),
  c."firstName", c."lastName", c."email", c."phone", c."whatsapp",
  c."address", c."city", c."zipCode", c."notes", NOW()
FROM "clients" c
WHERE c."clientType" = 'OWNER'
  AND NOT EXISTS (
    SELECT 1 FROM "owners" o
    WHERE o."phone" = c."phone" OR (c."email" IS NOT NULL AND o."email" = c."email")
  );

UPDATE "clients" SET "clientType" = 'SELLER' WHERE "clientType" = 'OWNER';

-- AlterEnum
BEGIN;
CREATE TYPE "ClientType_new" AS ENUM ('BUYER', 'SELLER', 'RENTER');
ALTER TABLE "clients" ALTER COLUMN "clientType" TYPE "ClientType_new" USING ("clientType"::text::"ClientType_new");
ALTER TYPE "ClientType" RENAME TO "ClientType_old";
ALTER TYPE "ClientType_new" RENAME TO "ClientType";
DROP TYPE "ClientType_old";
COMMIT;
