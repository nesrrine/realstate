/*
  Migration: Add ContactStatus enum, Client.status field, LeadStatus.A_CONTACT, make Lead.propertyId nullable
*/
-- Add ContactStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactStatus') THEN
    CREATE TYPE "ContactStatus" AS ENUM ('PROSPECT', 'CLIENT');
  END IF;
END $$;

-- Add A_CONTACT to LeadStatus enum (PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE)
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'A_CONTACT';

-- Add status column to clients table
ALTER TABLE "clients" ADD COLUMN "status" "ContactStatus" NOT NULL DEFAULT 'PROSPECT';

-- Make leads.propertyId nullable (allow leads without a property)
ALTER TABLE "leads" ALTER COLUMN "propertyId" DROP NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients" ("status");
CREATE INDEX IF NOT EXISTS "clients_clientType_idx" ON "clients" ("clientType");
CREATE INDEX IF NOT EXISTS "leads_propertyId_idx" ON "leads" ("propertyId");
