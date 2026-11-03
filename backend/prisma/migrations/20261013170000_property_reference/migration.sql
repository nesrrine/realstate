-- Référence unique par bien (ex. REF-2026-00001)
ALTER TABLE "properties" ADD COLUMN "reference" TEXT;

UPDATE "properties" p
SET "reference" = sub.ref
FROM (
  SELECT
    id,
    'REF-' || TO_CHAR("createdAt", 'YYYY') || '-' ||
    LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY TO_CHAR("createdAt", 'YYYY')
        ORDER BY "createdAt", id
      )::text,
      5,
      '0'
    ) AS ref
  FROM "properties"
) sub
WHERE p.id = sub.id AND p."reference" IS NULL;

ALTER TABLE "properties" ALTER COLUMN "reference" SET NOT NULL;

CREATE UNIQUE INDEX "properties_reference_key" ON "properties"("reference");
CREATE INDEX IF NOT EXISTS idx_properties_reference ON "properties"("reference");
