-- Photos et documents : « http://localhost:3001/uploads/... » → « /uploads/... »
-- L'adresse ne dépend plus du domaine : le site sert /uploads depuis le backend.
UPDATE "property_images"
SET "url" = regexp_replace("url", '^https?://[^/]+(/uploads/)', '\1')
WHERE "url" ~ '^https?://[^/]+/uploads/';

UPDATE "property_documents"
SET "url" = regexp_replace("url", '^https?://[^/]+(/uploads/)', '\1')
WHERE "url" ~ '^https?://[^/]+/uploads/';
