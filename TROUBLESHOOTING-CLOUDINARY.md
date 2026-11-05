# Troubleshooting - Cloudinary Document Downloads

## Problème: "Erreur lors du téléchargement du document" (500 error)

### Causes possibles

1. **Credentials Cloudinary invalides ou expirés**
2. **Fichier supprimé de Cloudinary mais référence en base**
3. **Problème de permissions sur les fichiers privés**
4. **Rate limiting de Cloudinary**

### Solutions

#### 1. Vérifier les credentials Cloudinary sur Render

```bash
# Sur le dashboard Render -> Backend Service -> Environment
CLOUDINARY_CLOUD_NAME=dzd00atxb
CLOUDINARY_API_KEY=286453715641228
CLOUDINARY_API_SECRET=o2kiiBf5I13VlSFLYtPiiVrm_DQ
```

#### 2. Tester les credentials localement

```bash
cd backend
node -e "
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dzd00atxb',
  api_key: '286453715641228',
  api_secret: 'o2kiiBf5I13VlSFLYtPiiVrm_DQ',
  secure: true
});

cloudinary.api.resources({
  type: 'private',
  resource_type: 'raw',
  max_results: 5
}).then(result => {
  console.log('✓ Cloudinary connection OK');
  console.log('Private documents found:', result.resources.length);
  console.log(result.resources);
}).catch(err => {
  console.error('✗ Cloudinary error:', err);
});
"
```

#### 3. Vérifier les logs Render

1. Aller sur le dashboard Render
2. Ouvrir les logs du backend
3. Chercher les messages d'erreur détaillés:
   - `[CloudinaryStorageService]`
   - `[PropertiesService]`
   - `[PropertiesController]`

#### 4. Corriger les documents manquants

Si des documents sont référencés en base mais n'existent plus sur Cloudinary:

```sql
-- Lister les documents qui pourraient être problématiques
SELECT id, title, "storageKey", "originalName", "propertyId"
FROM "PropertyDocument"
ORDER BY "createdAt" DESC
LIMIT 20;
```

#### 5. Alternative: Utiliser les URLs publiques temporaires

Si le problème persiste avec les fichiers privés, modifier la configuration pour utiliser des URLs signées:

**backend/src/storage/cloudinary-storage.service.ts:**

```typescript
// Dans la méthode upload(), changer:
resource_type: "raw",
type: "authenticated",  // Au lieu de "private"
```

Puis re-upload les documents.

## Vérification du fonctionnement

### Test manuel avec curl

```bash
# 1. Se connecter pour obtenir un token
TOKEN=$(curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agency.com","password":"Admin1234!"}' \
  | jq -r '.accessToken')

# 2. Télécharger un document
curl -X GET "https://your-backend.onrender.com/api/properties/PROPERTY_ID/documents/DOC_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  --output test-document.pdf

# 3. Vérifier le fichier
file test-document.pdf
```

### Test avec le frontend en production

1. Ouvrir la console du navigateur (F12)
2. Aller sur une page de propriété avec documents
3. Cliquer sur "Télécharger"
4. Observer les erreurs dans la console:
   - Erreur réseau? → Vérifier CORS
   - 401? → Problème d'authentification
   - 403? → Problème de permissions
   - 404? → Document introuvable
   - 500? → Erreur serveur (voir logs Render)

## Amélioration: Ajouter un endpoint de santé pour Cloudinary

**backend/src/health/health.controller.ts:**

```typescript
@Get('cloudinary')
async checkCloudinary() {
  try {
    await this.cloudinary.api.ping();
    return { status: 'ok', service: 'cloudinary' };
  } catch (error) {
    return { status: 'error', service: 'cloudinary', error: error.message };
  }
}
```

Tester: `https://your-backend.onrender.com/api/health/cloudinary`

## Plan de migration vers un autre storage (optionnel)

Si Cloudinary pose trop de problèmes pour les documents:

1. **AWS S3** - Plus fiable pour les fichiers privés
2. **Supabase Storage** - Simple et gratuit jusqu'à 1GB
3. **Vercel Blob** - Intégration native avec Vercel

### Configuration pour Supabase Storage

```env
STORAGE_DRIVER=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-key
SUPABASE_BUCKET=property-documents
```

Implémentation: créer `backend/src/storage/supabase-storage.service.ts`
