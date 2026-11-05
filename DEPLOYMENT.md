# 🚀 Guide de Déploiement

Ce guide vous aide à déployer l'application sur **Vercel** (frontend) et **Render** (backend).

---

## 📋 Prérequis

- [ ] Compte GitHub
- [ ] Compte Vercel (gratuit)
- [ ] Compte Render (gratuit)
- [ ] Base de données PostgreSQL (Neon, Supabase, ou Render)
- [ ] Compte Cloudinary (gratuit)

---

## 🗄️ Étape 1 : Configuration de la base de données

### Option A : Neon (Recommandé - Gratuit)
1. Créez un compte sur [neon.tech](https://neon.tech)
2. Créez un nouveau projet
3. Copiez la `DATABASE_URL` (format : `postgresql://user:password@host/dbname?sslmode=require`)

### Option B : Render PostgreSQL
1. Dans Render, créez une nouvelle **PostgreSQL Database**
2. Copiez l'URL interne de connexion

---

## 🖼️ Étape 2 : Configuration Cloudinary

1. Créez un compte sur [cloudinary.com](https://cloudinary.com)
2. Dans le dashboard, récupérez :
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

---

## 🔧 Étape 3 : Déployer le Backend sur Render

### 3.1 Créer le service
1. Connectez-vous à [render.com](https://render.com)
2. Cliquez sur **New +** → **Web Service**
3. Connectez votre repository GitHub
4. Sélectionnez la branche (ex: `main`)

### 3.2 Configuration du service
- **Name** : `real-estate-backend` (ou votre nom)
- **Region** : Choisissez la plus proche (ex: Oregon, Frankfurt)
- **Branch** : `main`
- **Root Directory** : `backend`
- **Runtime** : `Node`
- **Build Command** :
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start Command** :
  ```bash
  npm run start:prod
  ```

### 3.3 Variables d'environnement
Ajoutez ces variables dans **Environment** :

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=<votre_url_postgresql>
JWT_SECRET=<generez_un_secret_securise_32_caracteres>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://votre-domaine.vercel.app
COMMISSION_RATE=0.02
AGENT_SHARE_RATE=0.5
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=<votre_cloud_name>
CLOUDINARY_API_KEY=<votre_api_key>
CLOUDINARY_API_SECRET=<votre_api_secret>
```

### 3.4 Déployer
1. Cliquez sur **Create Web Service**
2. Attendez le déploiement (5-10 minutes)
3. Notez l'URL : `https://real-estate-backend.onrender.com`

### 3.5 Migration de la base de données
Une fois déployé, ouvrez le **Shell** dans Render et exécutez :
```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

---

## 🌐 Étape 4 : Déployer le Frontend sur Vercel

### 4.1 Configuration
1. Connectez-vous à [vercel.com](https://vercel.com)
2. Cliquez sur **Add New...** → **Project**
3. Importez votre repository GitHub
4. Sélectionnez la branche `main`

### 4.2 Configuration du projet
- **Framework Preset** : Next.js
- **Root Directory** : `frontend`
- **Build Command** : `npm run build` (détecté automatiquement)
- **Output Directory** : `.next` (détecté automatiquement)
- **Install Command** : `npm install`

### 4.3 Variables d'environnement
Dans **Environment Variables**, ajoutez :

```env
NEXT_PUBLIC_API_URL=https://real-estate-backend.onrender.com/api
```

### 4.4 Déployer
1. Cliquez sur **Deploy**
2. Attendez le build (3-5 minutes)
3. Votre site est en ligne ! 🎉

---

## 🔄 Étape 5 : Mise à jour de CORS

Une fois le frontend déployé, mettez à jour la variable d'environnement du backend :

Dans Render :
```env
FRONTEND_URL=https://votre-domaine.vercel.app
```

Puis **Redéployer** le backend.

---

## ✅ Étape 6 : Vérification

### Backend
- ✅ API : `https://votre-backend.onrender.com/api/health`
- ✅ Swagger : `https://votre-backend.onrender.com/api/docs`

### Frontend
- ✅ Site public : `https://votre-domaine.vercel.app`
- ✅ CRM : `https://votre-domaine.vercel.app/crm`

### Identifiants de test (seed)
| Email                | Mot de passe  | Rôle    |
| -------------------- | ------------- | ------- |
| admin@agency.com     | Admin1234!    | ADMIN   |
| manager@agency.com   | Manager1234!  | MANAGER |
| agent@agency.com     | Agent1234!    | AGENT   |

---

## 🔐 Sécurité (IMPORTANT !)

### Générer un JWT_SECRET sécurisé
```bash
# Option 1 : Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2 : OpenSSL
openssl rand -hex 32

# Option 3 : En ligne (utilisez un générateur de mot de passe)
# Minimum 32 caractères, avec majuscules, minuscules, chiffres et symboles
```

### Sécuriser les variables d'environnement
- ❌ Ne JAMAIS committer `.env` dans Git
- ✅ Utiliser les secrets managés par Vercel/Render
- ✅ Rotate les secrets régulièrement (tous les 3-6 mois)

---

## 🐛 Dépannage

### Backend ne démarre pas
1. Vérifiez les logs dans Render
2. Vérifiez que `DATABASE_URL` est correcte
3. Vérifiez que Prisma a bien généré le client : `npx prisma generate`

### Frontend ne se connecte pas au backend
1. Vérifiez `NEXT_PUBLIC_API_URL` dans Vercel
2. Vérifiez que CORS est configuré avec le bon `FRONTEND_URL`
3. Testez l'API directement : `https://backend.onrender.com/api/health`

### Migration échoue
1. Connectez-vous au Shell Render
2. Exécutez manuellement :
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Build Vercel échoue
1. Vérifiez les logs de build
2. Assurez-vous que `NEXT_PUBLIC_API_URL` est définie
3. Testez le build localement : `cd frontend && npm run build`

---

## 📱 Domaine personnalisé (Optionnel)

### Vercel
1. Dans votre projet → **Settings** → **Domains**
2. Ajoutez votre domaine
3. Configurez les DNS selon les instructions

### Render
1. Dans votre service → **Settings** → **Custom Domain**
2. Ajoutez votre domaine
3. Configurez les DNS (CNAME vers Render)

---

## 🔄 Mises à jour automatiques

Les deux plateformes déploient automatiquement à chaque push sur `main` :
- **Vercel** : Déploiement instantané
- **Render** : Déploiement en 5-10 minutes

Pour désactiver les auto-déploiements :
- **Vercel** : Settings → Git → Disable
- **Render** : Settings → Auto-Deploy → Disable

---

## 💰 Coûts

### Gratuit
- **Vercel** : 100 GB bande passante/mois
- **Render** : 750 heures/mois (backend dort après 15 min d'inactivité)
- **Neon** : 0.5 GB de stockage, 3 projets

### Payant (si besoin)
- **Vercel Pro** : 20$/mois (domaines illimités, analytics)
- **Render Starter** : 7$/mois (backend toujours actif)
- **Neon Pro** : 19$/mois (plus de stockage, meilleure performance)

---

## 📞 Support

- Vercel : [vercel.com/docs](https://vercel.com/docs)
- Render : [render.com/docs](https://render.com/docs)
- Next.js : [nextjs.org/docs](https://nextjs.org/docs)
- NestJS : [docs.nestjs.com](https://docs.nestjs.com)
