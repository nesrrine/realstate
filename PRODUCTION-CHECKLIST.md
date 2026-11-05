# ✅ Checklist de Production

## Avant le déploiement

### 1. Tester Cloudinary localement

```bash
cd backend
npx tsx test-cloudinary.ts
```

✅ Tous les tests doivent passer, en particulier:
- Connexion API OK
- Documents privés accessibles
- URL signée fonctionnelle

### 2. Build locaux réussis

```bash
# Frontend
cd frontend
npm run build
# Doit réussir sans erreurs

# Backend  
cd backend
npm run build
# Doit réussir sans erreurs
```

### 3. Variables d'environnement

#### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ caractères aléatoires>
PORT=3001
FRONTEND_URL=http://localhost:3000

# Cloudinary (VÉRIFIER ces valeurs!)
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=dzd00atxb
CLOUDINARY_API_KEY=286453715641228
CLOUDINARY_API_SECRET=o2kiiBf5I13VlSFLYtPiiVrm_DQ
CLOUDINARY_FOLDER=real-estate
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Après le déploiement sur Render

### 1. Vérifier les variables d'environnement

Sur Render Dashboard → Backend Service → Environment:

- [ ] `DATABASE_URL` - Connection string PostgreSQL
- [ ] `JWT_SECRET` - Secret sécurisé (32+ caractères)
- [ ] `JWT_EXPIRES_IN` - `7d`
- [ ] `PORT` - `3001`
- [ ] `FRONTEND_URL` - URL Vercel complète
- [ ] `COMMISSION_RATE` - `0.02`
- [ ] `AGENT_SHARE_RATE` - `0.5`
- [ ] `STORAGE_DRIVER` - `cloudinary`
- [ ] `CLOUDINARY_CLOUD_NAME` - `dzd00atxb`
- [ ] `CLOUDINARY_API_KEY` - `286453715641228`
- [ ] `CLOUDINARY_API_SECRET` - `o2kiiBf5I13VlSFLYtPiiVrm_DQ`
- [ ] `CLOUDINARY_FOLDER` - `real-estate`
- [ ] `NODE_ENV` - `production`

### 2. Vérifier le déploiement backend

```bash
# Health check
curl https://votre-backend.onrender.com/api/health

# Devrait retourner:
# {"status":"ok","database":"connected","timestamp":"..."}
```

```bash
# API Swagger
# Ouvrir dans le navigateur:
https://votre-backend.onrender.com/api/docs
```

### 3. Exécuter les migrations

Dans le Shell Render (Backend Service → Shell):

```bash
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

### 4. Tester l'authentification

```bash
# Login
curl -X POST https://votre-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@agency.com",
    "password": "Admin1234!"
  }'

# Devrait retourner un accessToken
```

### 5. Tester le téléchargement de documents

1. Se connecter au CRM: `https://votre-app.vercel.app/crm`
2. Aller sur une propriété avec documents
3. Cliquer sur "Télécharger" un document
4. Ouvrir la console (F12) pour voir les logs
5. Vérifier qu'aucune erreur 500 n'apparaît

**Si erreur 500:**
- Ouvrir les logs Render
- Chercher `[CloudinaryStorageService]` ou `[PropertiesService]`
- Voir TROUBLESHOOTING-CLOUDINARY.md

## Après le déploiement sur Vercel

### 1. Vérifier les variables d'environnement

Sur Vercel Dashboard → Project → Settings → Environment Variables:

- [ ] `NEXT_PUBLIC_API_URL` - `https://votre-backend.onrender.com/api`

### 2. Vérifier le build

- [ ] Build réussi sans erreurs
- [ ] Warnings ESLint sont acceptables (pas d'erreurs)

### 3. Tester le site

```bash
# Page d'accueil
curl https://votre-app.vercel.app

# Devrait retourner du HTML
```

### 4. Tester l'intégration frontend-backend

1. Ouvrir `https://votre-app.vercel.app`
2. Aller sur "Nos Biens"
3. Les propriétés doivent s'afficher
4. Ouvrir F12 → Network
5. Vérifier que les requêtes API fonctionnent

**Si erreur CORS:**
- Vérifier `FRONTEND_URL` dans Render
- Redéployer le backend après modification

## Tests de fumée (Smoke Tests)

### Test 1: Authentification
- [ ] Login admin fonctionne
- [ ] Redirection vers `/crm` après login
- [ ] Menu CRM visible

### Test 2: Liste des propriétés
- [ ] `/crm/properties` affiche la liste
- [ ] Filtres fonctionnent
- [ ] Pagination fonctionne

### Test 3: Détails propriété
- [ ] Cliquer sur une propriété
- [ ] Images s'affichent (Cloudinary)
- [ ] Documents listés

### Test 4: Upload document
- [ ] Ajouter un nouveau document PDF
- [ ] Upload réussit
- [ ] Document apparaît dans la liste

### Test 5: Téléchargement document
- [ ] Cliquer sur "Télécharger"
- [ ] Fichier se télécharge correctement
- [ ] Nom de fichier correct
- [ ] Contenu intact (ouvrir le PDF)

### Test 6: Téléchargement ZIP
- [ ] Cliquer sur "Télécharger tous (ZIP)"
- [ ] ZIP se télécharge
- [ ] Décompresser le ZIP
- [ ] Tous les documents présents et intacts

## Monitoring en production

### Logs à surveiller

**Render (Backend):**
```bash
# Erreurs Cloudinary
grep "CloudinaryStorageService" logs

# Erreurs de base de données
grep "PrismaService" logs

# Erreurs générales
grep "ERROR" logs
```

**Vercel (Frontend):**
- Dashboard → Project → Logs
- Chercher les erreurs 500, 404
- Vérifier les requêtes API qui échouent

### Métriques importantes

- [ ] Temps de réponse API < 2s
- [ ] Taux d'erreur < 1%
- [ ] Disponibilité > 99%

## Rollback en cas de problème

### Backend (Render)
1. Dashboard → Service → Manual Deploy
2. Sélectionner un commit précédent
3. Deploy

### Frontend (Vercel)
1. Dashboard → Project → Deployments
2. Trouver le déploiement précédent
3. Cliquer sur "..." → Promote to Production

## Contact en cas de problème

### Cloudinary
- Dashboard: https://console.cloudinary.com
- Support: https://support.cloudinary.com

### Render  
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs

### Vercel
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs

## Maintenance régulière

### Hebdomadaire
- [ ] Vérifier les logs d'erreurs
- [ ] Tester les fonctionnalités critiques
- [ ] Vérifier l'espace disque base de données

### Mensuel
- [ ] Mettre à jour les dépendances (`npm update`)
- [ ] Vérifier les alertes de sécurité GitHub
- [ ] Sauvegarder la base de données

### Trimestriel
- [ ] Rotate JWT_SECRET
- [ ] Audit de sécurité
- [ ] Performance tuning
