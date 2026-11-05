-- ============================================================================
-- Script SQL pour corriger les storage_keys dans la base de données
-- À exécuter dans la console Neon: https://console.neon.tech
-- ============================================================================

-- Étape 1: Vérifier combien de documents sont affectés
-- (Copiez et exécutez cette requête d'abord)
SELECT 
    COUNT(*) as "Documents à corriger",
    COUNT(*) FILTER (WHERE "storageKey" LIKE 'real-estate/%') as "Déjà corrects",
    COUNT(*) FILTER (WHERE "storageKey" NOT LIKE 'real-estate/%') as "À modifier"
FROM "property_documents";

-- ============================================================================

-- Étape 2: Prévisualiser les modifications (10 premiers)
-- (Vérifiez que les chemins sont corrects avant de continuer)
SELECT 
    id,
    title,
    "storageKey" as "Ancien storage_key",
    CASE 
        WHEN "storageKey" LIKE 'real-estate/%' THEN "storageKey"
        WHEN "storageKey" LIKE 'documents/%' THEN CONCAT('real-estate/', "storageKey")
        ELSE CONCAT('real-estate/documents/', "storageKey")
    END as "Nouveau storage_key"
FROM "property_documents"
WHERE "storageKey" NOT LIKE 'real-estate/%'
LIMIT 10;

-- ============================================================================

-- Étape 3: SAUVEGARDER LA TABLE (IMPORTANT - Faites ceci AVANT l'UPDATE!)
-- (Cette commande crée une copie de sécurité)
CREATE TABLE "property_documents_backup" AS 
SELECT * FROM "property_documents";

-- Vérifier que la sauvegarde est créée:
SELECT COUNT(*) as "Documents sauvegardés" FROM "property_documents_backup";

-- ============================================================================

-- Étape 4: APPLIQUER LA CORRECTION
-- (Exécutez cette requête après avoir vérifié les étapes précédentes)
UPDATE "property_documents"
SET "storageKey" = CASE 
    WHEN "storageKey" LIKE 'real-estate/%' THEN "storageKey"
    WHEN "storageKey" LIKE 'documents/%' THEN CONCAT('real-estate/', "storageKey")
    ELSE CONCAT('real-estate/documents/', "storageKey")
END
WHERE "storageKey" NOT LIKE 'real-estate/%';

-- ============================================================================

-- Étape 5: Vérifier que tout est corrigé
-- (Tous les storage_keys doivent maintenant commencer par 'real-estate/')
SELECT 
    COUNT(*) as "Total documents",
    COUNT(*) FILTER (WHERE "storageKey" LIKE 'real-estate/%') as "Corrects",
    COUNT(*) FILTER (WHERE "storageKey" NOT LIKE 'real-estate/%') as "Restants à corriger"
FROM "property_documents";

-- Si "Restants à corriger" = 0, c'est réussi! ✅

-- ============================================================================

-- Étape 6 (Optionnel): Voir quelques exemples après correction
SELECT 
    id,
    title,
    "storageKey",
    "originalName"
FROM "property_documents"
WHERE "storageKey" LIKE 'real-estate/documents/%'
LIMIT 5;

-- ============================================================================
-- 🔄 EN CAS DE PROBLÈME - ROLLBACK (restaurer la sauvegarde)
-- ============================================================================

-- Si quelque chose ne va pas, vous pouvez restaurer:
-- DROP TABLE "property_documents";
-- ALTER TABLE "property_documents_backup" RENAME TO "property_documents";

-- ============================================================================
