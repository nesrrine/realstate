-- Migration: Make Lead-Property and Visit-Property many-to-many
-- Converts single propertyId columns to junction tables

-- 1. Create junction tables (no constraints yet)
DROP TABLE IF EXISTS "lead_properties" CASCADE;
DROP TABLE IF EXISTS "visit_properties" CASCADE;

CREATE TABLE "lead_properties" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visit_properties" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "visit_properties_pkey" PRIMARY KEY ("id")
);

-- 2. Migrate existing data from leads.propertyId
INSERT INTO "lead_properties" ("id", "leadId", "propertyId", "createdAt")
SELECT gen_random_uuid(), "id", "propertyId", CURRENT_TIMESTAMP
FROM "leads" WHERE "propertyId" IS NOT NULL;

-- 3. Migrate existing data from visits.propertyId
INSERT INTO "visit_properties" ("id", "visitId", "propertyId", "createdAt")
SELECT gen_random_uuid(), "id", "propertyId", CURRENT_TIMESTAMP
FROM "visits" WHERE "propertyId" IS NOT NULL;

-- 4. Unique constraint to prevent duplicates
ALTER TABLE "lead_properties" ADD CONSTRAINT "lead_properties_leadId_propertyId_key" UNIQUE ("leadId", "propertyId");
ALTER TABLE "visit_properties" ADD CONSTRAINT "visit_properties_visitId_propertyId_key" UNIQUE ("visitId", "propertyId");

-- 5. Indexes
CREATE INDEX "lead_properties_leadId_idx" ON "lead_properties"("leadId");
CREATE INDEX "lead_properties_propertyId_idx" ON "lead_properties"("propertyId");
CREATE INDEX "visit_properties_visitId_idx" ON "visit_properties"("visitId");
CREATE INDEX "visit_properties_propertyId_idx" ON "visit_properties"("propertyId");

-- 6. Foreign keys
ALTER TABLE "lead_properties" ADD CONSTRAINT "lead_properties_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_properties" ADD CONSTRAINT "lead_properties_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visit_properties" ADD CONSTRAINT "visit_properties_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visit_properties" ADD CONSTRAINT "visit_properties_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Drop old propertyId columns
ALTER TABLE "leads" DROP COLUMN IF EXISTS "propertyId";
ALTER TABLE "visits" DROP COLUMN IF EXISTS "propertyId";