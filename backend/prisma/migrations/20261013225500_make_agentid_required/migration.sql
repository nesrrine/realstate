-- Make agentId required in Client table
-- First, set any existing null agentId to the id of a manager agent (if any exists)
DO $$
DECLARE
  manager_agent_id TEXT;
BEGIN
  SELECT "a"."id" INTO manager_agent_id
  FROM "agents" "a"
  JOIN "users" "u" ON "a"."userId" = "u"."id"
  WHERE "u"."role" = 'MANAGER'
  LIMIT 1;

  IF manager_agent_id IS NOT NULL THEN
    UPDATE "clients"
    SET "agentId" = manager_agent_id
    WHERE "agentId" IS NULL;
  END IF;
END $$;

-- Now, make the agentId column NOT NULL
ALTER TABLE "clients" ALTER COLUMN "agentId" SET NOT NULL;