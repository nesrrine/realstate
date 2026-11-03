# Mise en ligne gratuite — Vercel + Render + Neon + Cloudinary

| Rôle | Service gratuit | Ce qui y va |
|---|---|---|
| Site vitrine + CRM (Next.js) | **Vercel** | dossier `frontend/` |
| API (NestJS) | **Render** | dossier `backend/` |
| Base de données (PostgreSQL) | **Neon** | 14 Mo aujourd'hui (limite 0,5 Go) |
| Photos et documents | **Cloudinary** | 0,8 Go aujourd'hui (limite 25 Go) |

Limite à connaître : l'API Render gratuite **s'endort après 15 min sans visite** et met ~50 s à se
réveiller. L'étape 7 l'empêche de dormir.

Créez les comptes vous-même (aucun ne demande de carte bancaire). Ne partagez jamais
les mots de passe et clés : collez-les seulement dans les fichiers ou écrans indiqués.

---

## 1. Cloudinary (photos et documents)

1. Créez un compte sur <https://cloudinary.com> (offre Free).
2. Dashboard → **API Keys** : notez *Cloud name*, *API Key*, *API Secret*.
3. Ajoutez-les dans `backend/.env` (ce fichier n'est jamais envoyé sur GitHub) :
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
4. Envoyez les 4 026 fichiers existants (aperçu d'abord, puis pour de vrai) :
   ```bash
   cd backend
   node scripts/transfert-cloudinary.js
   node scripts/transfert-cloudinary.js --executer
   ```
   Durée : quelques dizaines de minutes. Interrompu ? Relancez : ce qui est déjà envoyé est ignoré.
   Les fichiers restent aussi sur le PC (sauvegarde).

## 2. Neon (base de données)

1. Créez un compte sur <https://neon.tech>, puis un projet (région **Europe / Frankfurt**).
2. **Connect** → décochez *Connection pooling* → copiez la chaîne `postgresql://...` (sans `-pooler`).
3. Copiez la base locale vers Neon (à faire **après** l'étape 1) :
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts\copie-base-neon.ps1
   ```
   Le script demande la chaîne Neon (elle n'est ni affichée ni enregistrée).

## 3. GitHub (un seul dépôt privé)

1. Supprimez `frontend/.git` (il ne contient que le commit de création de Next.js), pour que
   `frontend/` et `backend/` soient dans le même dépôt.
2. À la racine du projet : `git init`, premier commit, puis créez un dépôt **privé** sur GitHub et poussez.
   Vérifiez avant le commit que `git status` ne montre ni `.env`, ni `backend/uploads/`, ni `sortie/`.

## 4. Render (API)

1. <https://render.com> → connectez GitHub → **New → Blueprint** → choisissez le dépôt.
   Render lit `render.yaml` et prépare le service `immo-api`.
2. Remplissez les valeurs demandées :
   - `DATABASE_URL` : la chaîne Neon de l'étape 2 (directe, avec `?sslmode=require`)
   - `FRONTEND_URL` : laissez `https://exemple.vercel.app` pour l'instant (corrigé à l'étape 6)
   - `CLOUDINARY_*` : les 3 valeurs de l'étape 1
   (`JWT_SECRET` et `FILES_SECRET` sont générés par Render automatiquement.)
3. Attendez « Live », notez l'adresse : `https://immo-api-xxxx.onrender.com`.
   Test : `https://immo-api-xxxx.onrender.com/api/health` doit répondre.

## 5. Vercel (site + CRM)

1. <https://vercel.com> → connectez GitHub → **Add New → Project** → le dépôt.
2. **Root Directory** : `frontend`.
3. **Environment Variables** :
   - `NEXT_PUBLIC_API_URL` = `https://immo-api-xxxx.onrender.com/api`
   - `BACKEND_URL` = `https://immo-api-xxxx.onrender.com`
4. **Deploy**, puis notez l'adresse du site : `https://votre-projet.vercel.app`.

## 6. Relier le site à l'API

Render → `immo-api` → **Environment** → `FRONTEND_URL` = l'adresse Vercel exacte
(sans `/` à la fin) → **Save** (Render redémarre).

## 7. Empêcher l'API de s'endormir

<https://cron-job.org> (gratuit) → nouvelle tâche : appeler
`https://immo-api-xxxx.onrender.com/api/health` **toutes les 10 minutes**.

## 8. Avant d'annoncer le site

- Connectez-vous au CRM en ligne et **changez les mots de passe** des comptes de démonstration
  (manager, admin, agent) dans *Profil*. Le CRM affiche une alerte tant que ce n'est pas fait.
- *Paramètres* → renseignez l'adresse, le lien Google Maps et le téléphone de l'agence
  (utilisés par la page Contact, le bouton Appeler et les confirmations de visite).
- Testez : une fiche bien (photos), un document dans le CRM, le formulaire de contact.

## Nom de domaine (optionnel)

Vercel → *Settings → Domains* pour brancher votre domaine (ex. `leportailimmobilier.tn`, payant chez un
registraire). Pensez ensuite à mettre la nouvelle adresse dans `FRONTEND_URL` sur Render.

## Sauvegardes

- Base : Neon garde un historique de 24 h (restauration à un instant donné) sur l'offre gratuite.
  Pour une copie complète, `pg_dump` de la chaîne Neon une fois par semaine.
- Fichiers : sur Cloudinary, et la copie d'origine reste dans `backend/uploads` sur le PC.
