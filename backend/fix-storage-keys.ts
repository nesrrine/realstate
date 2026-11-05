/**
 * Script pour corriger les storage_key dans la base de données
 * Ajoute le préfixe "real-estate/" manquant
 * 
 * Usage: npx tsx fix-storage-keys.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function fixStorageKeys() {
  console.log('\n🔧 Correction des storage_key dans la base de données\n');
  
  if (isDryRun) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera effectuée\n');
  }

  try {
    // Récupérer tous les documents
    const documents = await prisma.propertyDocument.findMany({
      select: {
        id: true,
        title: true,
        originalName: true,
        storageKey: true,
        propertyId: true,
      },
    });

    console.log(`📄 ${documents.length} document(s) trouvé(s)\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const doc of documents) {
      const oldKey = doc.storageKey;
      
      // Vérifier si le key commence déjà par "real-estate/"
      if (oldKey.startsWith('real-estate/')) {
        console.log(`✅ ${doc.title || doc.originalName}`);
        console.log(`   Storage key déjà correct: ${oldKey}\n`);
        alreadyCorrectCount++;
        continue;
      }

      // Si le key commence par "documents/", ajouter "real-estate/"
      let newKey: string;
      if (oldKey.startsWith('documents/')) {
        newKey = `real-estate/${oldKey}`;
      } else {
        // Si ça ne commence même pas par "documents/", ajouter les deux
        newKey = `real-estate/documents/${oldKey}`;
      }

      console.log(`🔄 ${doc.title || doc.originalName}`);
      console.log(`   Ancien: ${oldKey}`);
      console.log(`   Nouveau: ${newKey}`);

      if (!isDryRun) {
        await prisma.propertyDocument.update({
          where: { id: doc.id },
          data: { storageKey: newKey },
        });
        console.log(`   ✅ Mis à jour\n`);
      } else {
        console.log(`   ⏭️  Pas de modification (dry-run)\n`);
      }

      fixedCount++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSUMÉ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total de documents: ${documents.length}`);
    console.log(`Déjà corrects: ${alreadyCorrectCount}`);
    console.log(`À corriger: ${fixedCount}`);

    if (isDryRun && fixedCount > 0) {
      console.log(`\n💡 Pour appliquer les modifications, exécutez:`);
      console.log(`   npx tsx fix-storage-keys.ts`);
    } else if (!isDryRun && fixedCount > 0) {
      console.log(`\n✅ ${fixedCount} storage_key(s) corrigé(s) avec succès!`);
      console.log(`\n🧪 Vous pouvez maintenant tester le téléchargement:`);
      console.log(`   1. Redémarrer le backend: npm run start:dev`);
      console.log(`   2. Tester avec: npx tsx diagnose-cloudinary-issue.ts`);
    }

  } catch (error: any) {
    console.error('\n❌ Erreur:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npx tsx fix-storage-keys.ts [--dry-run]

Options:
  --dry-run   Affiche les modifications sans les appliquer
  --help, -h  Affiche cette aide

Description:
  Ce script corrige les storage_key des documents dans la base de données
  en ajoutant le préfixe "real-estate/" manquant.

Exemples:
  # Voir ce qui serait modifié (sans modification)
  npx tsx fix-storage-keys.ts --dry-run

  # Appliquer les corrections
  npx tsx fix-storage-keys.ts
  `);
  process.exit(0);
}

fixStorageKeys();
