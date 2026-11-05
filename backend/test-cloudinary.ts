/**
 * Script de test Cloudinary
 * Usage: npx tsx test-cloudinary.ts
 */

import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Charger les variables d'environnement
config();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

console.log('\n🔍 Test de connexion Cloudinary\n');
console.log('Configuration:');
console.log(`  Cloud Name: ${CLOUD_NAME}`);
console.log(`  API Key: ${API_KEY}`);
console.log(`  API Secret: ${API_SECRET ? '***' + API_SECRET.slice(-4) : 'undefined'}`);

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('\n❌ Configuration incomplète!');
  console.error('Vérifiez que ces variables sont dans .env:');
  console.error('  - CLOUDINARY_CLOUD_NAME');
  console.error('  - CLOUDINARY_API_KEY');
  console.error('  - CLOUDINARY_API_SECRET');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

async function testCloudinary() {
  try {
    console.log('\n📡 Test 1: Ping API...');
    await cloudinary.api.ping();
    console.log('✅ Connexion OK\n');

    console.log('📂 Test 2: Lister les images...');
    const images = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      max_results: 5,
      prefix: 'real-estate/properties',
    });
    console.log(`✅ ${images.resources.length} images trouvées`);
    if (images.resources.length > 0) {
      console.log('   Exemple:', images.resources[0].public_id);
    }

    console.log('\n📄 Test 3: Lister les documents privés...');
    const docs = await cloudinary.api.resources({
      type: 'private',
      resource_type: 'raw',
      max_results: 10,
      prefix: 'real-estate/documents',
    });
    console.log(`✅ ${docs.resources.length} documents privés trouvés`);
    
    if (docs.resources.length > 0) {
      console.log('\nDocuments:');
      docs.resources.forEach((doc: any, idx: number) => {
        console.log(`  ${idx + 1}. ${doc.public_id}`);
        console.log(`     - Format: ${doc.format}`);
        console.log(`     - Taille: ${(doc.bytes / 1024).toFixed(2)} KB`);
        console.log(`     - Créé: ${doc.created_at}`);
      });

      // Test de téléchargement d'un document
      console.log('\n📥 Test 4: Télécharger un document privé...');
      const testDoc = docs.resources[0];
      
      try {
        // Méthode 1: Via API
        const resource = await cloudinary.api.resource(testDoc.public_id, {
          resource_type: 'raw',
          type: 'private',
        });
        console.log('✅ Méthode API: Document accessible');
        console.log(`   URL: ${resource.secure_url.substring(0, 80)}...`);

        // Télécharger le contenu
        const response = await fetch(resource.secure_url);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          console.log(`✅ Téléchargement réussi: ${buffer.length} bytes`);
        } else {
          console.log(`⚠️  Téléchargement échoué: ${response.status} ${response.statusText}`);
        }
      } catch (err: any) {
        console.error('❌ Erreur lors du téléchargement:', err.message);
      }

      // Méthode 2: URL signée
      console.log('\n🔐 Test 5: Générer URL signée...');
      const signedUrl = cloudinary.utils.private_download_url(testDoc.public_id, '', {
        resource_type: 'raw',
        type: 'private',
        expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      });
      console.log('✅ URL signée générée');
      console.log(`   ${signedUrl.substring(0, 80)}...`);
      
      // Tester l'URL signée
      try {
        const signedResponse = await fetch(signedUrl);
        if (signedResponse.ok) {
          const buffer = Buffer.from(await signedResponse.arrayBuffer());
          console.log(`✅ URL signée fonctionnelle: ${buffer.length} bytes`);
        } else {
          console.log(`⚠️  URL signée échouée: ${signedResponse.status} ${signedResponse.statusText}`);
        }
      } catch (err: any) {
        console.error('❌ Erreur URL signée:', err.message);
      }
    } else {
      console.log('⚠️  Aucun document trouvé pour tester le téléchargement');
    }

    console.log('\n✅ Tous les tests réussis!\n');
  } catch (error: any) {
    console.error('\n❌ Erreur:', error.message);
    if (error.error?.message) {
      console.error('   Détails:', error.error.message);
    }
    if (error.http_code) {
      console.error('   Code HTTP:', error.http_code);
    }
    process.exit(1);
  }
}

testCloudinary();
