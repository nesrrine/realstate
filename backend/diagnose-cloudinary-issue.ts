/**
 * Script de diagnostic approfondi Cloudinary
 * Usage: npx tsx diagnose-cloudinary-issue.ts [propertyId]
 */

import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

config();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const prisma = new PrismaClient();

async function diagnoseProperty(propertyId?: string) {
  console.log('\n🔍 Diagnostic Cloudinary - Téléchargement de documents\n');
  
  try {
    // Si pas d'ID fourni, prendre la première propriété avec documents
    let targetPropertyId = propertyId;
    
    if (!targetPropertyId) {
      console.log('📋 Recherche d\'une propriété avec documents...');
      const property = await prisma.property.findFirst({
        where: {
          documents: {
            some: {},
          },
        },
        include: {
          documents: true,
        },
      });
      
      if (!property) {
        console.error('❌ Aucune propriété avec documents trouvée');
        process.exit(1);
      }
      
      targetPropertyId = property.id;
      console.log(`✅ Propriété trouvée: ${property.title} (${targetPropertyId})`);
      console.log(`   ${property.documents.length} documents`);
    }

    // Récupérer les documents
    const documents = await prisma.propertyDocument.findMany({
      where: { propertyId: targetPropertyId },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n📄 ${documents.length} document(s) à tester:\n`);

    for (const doc of documents) {
      console.log(`\n━━━ Document: ${doc.title} ━━━`);
      console.log(`ID: ${doc.id}`);
      console.log(`Nom original: ${doc.originalName}`);
      console.log(`Storage key: ${doc.storageKey}`);
      console.log(`Taille en DB: ${doc.size ? `${(doc.size / 1024).toFixed(2)} KB` : 'non définie'}`);
      console.log(`MIME type: ${doc.mimeType || 'non défini'}`);

      // Test 1: Vérifier si le fichier existe sur Cloudinary
      console.log('\n🔍 Test 1: Vérifier l\'existence sur Cloudinary...');
      try {
        const resource = await cloudinary.api.resource(doc.storageKey, {
          resource_type: 'raw',
          type: 'private',
        });
        console.log(`✅ Fichier trouvé sur Cloudinary`);
        console.log(`   - Taille réelle: ${(resource.bytes / 1024).toFixed(2)} KB`);
        console.log(`   - Format: ${resource.format || 'inconnu'}`);
        console.log(`   - URL sécurisée: ${resource.secure_url.substring(0, 80)}...`);
        
        // Test 2: Essayer de télécharger via l'URL sécurisée
        console.log('\n🔍 Test 2: Télécharger via secure_url...');
        try {
          const response = await fetch(resource.secure_url);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            console.log(`✅ Téléchargement réussi: ${buffer.length} bytes`);
            
            // Vérifier la correspondance des tailles
            if (buffer.length === resource.bytes) {
              console.log(`✅ Taille correspondante`);
            } else {
              console.log(`⚠️  Différence de taille: DB=${doc.size}, Cloudinary=${resource.bytes}, Downloaded=${buffer.length}`);
            }
          } else {
            console.log(`❌ Échec du téléchargement: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(`   Erreur: ${errorText.substring(0, 200)}`);
          }
        } catch (downloadError: any) {
          console.log(`❌ Erreur de téléchargement: ${downloadError.message}`);
        }

        // Test 3: Essayer avec l'URL signée
        console.log('\n🔍 Test 3: Télécharger via URL signée...');
        try {
          const signedUrl = cloudinary.utils.private_download_url(doc.storageKey, '', {
            resource_type: 'raw',
            type: 'private',
            expires_at: Math.floor(Date.now() / 1000) + 300,
          });
          console.log(`   URL signée générée: ${signedUrl.substring(0, 80)}...`);
          
          const signedResponse = await fetch(signedUrl);
          if (signedResponse.ok) {
            const buffer = Buffer.from(await signedResponse.arrayBuffer());
            console.log(`✅ Téléchargement via URL signée réussi: ${buffer.length} bytes`);
          } else {
            console.log(`❌ Échec URL signée: ${signedResponse.status} ${signedResponse.statusText}`);
          }
        } catch (signedError: any) {
          console.log(`❌ Erreur URL signée: ${signedError.message}`);
        }

      } catch (apiError: any) {
        console.log(`❌ Fichier introuvable sur Cloudinary`);
        console.log(`   Erreur: ${apiError.message}`);
        if (apiError.http_code) {
          console.log(`   Code HTTP: ${apiError.http_code}`);
        }
        
        // Suggérer des solutions
        console.log(`\n💡 Solutions possibles:`);
        console.log(`   1. Le fichier a été supprimé de Cloudinary`);
        console.log(`   2. Le storage_key en DB est incorrect`);
        console.log(`   3. Les credentials Cloudinary sont invalides`);
        console.log(`\n   Pour nettoyer ce document de la DB:`);
        console.log(`   DELETE FROM "PropertyDocument" WHERE id='${doc.id}';`);
      }
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSUMÉ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total de documents testés: ${documents.length}`);
    console.log(`Propriété ID: ${targetPropertyId}`);
    console.log(`\nPour tester le téléchargement ZIP complet:`);
    console.log(`curl -X GET "http://localhost:3001/api/properties/${targetPropertyId}/documents/download-zip" \\`);
    console.log(`  -H "Authorization: Bearer YOUR_TOKEN" \\`);
    console.log(`  --output test-download.zip`);

  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Récupérer l'ID de propriété depuis les arguments
const propertyId = process.argv[2];

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npx tsx diagnose-cloudinary-issue.ts [propertyId]

Options:
  propertyId  ID de la propriété à tester (optionnel)
              Si non fourni, utilise la première propriété avec documents
  
  --help, -h  Affiche cette aide

Exemples:
  npx tsx diagnose-cloudinary-issue.ts
  npx tsx diagnose-cloudinary-issue.ts cm123abc456
  `);
  process.exit(0);
}

diagnoseProperty(propertyId);
