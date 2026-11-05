-- Script pour vérifier les tables de la base de données
-- À exécuter dans console Neon

-- Lister toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Vérifier spécifiquement la table property_documents
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'property_documents'
ORDER BY ordinal_position;
