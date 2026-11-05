# Configuration Base de Données Locale

## Prérequis
- Docker Desktop installé et en cours d'exécution

## Étapes

### 1. Démarrer PostgreSQL avec Docker

```powershell
# À la racine du projet
docker-compose up -d
```

Cela va:
- Télécharger l'image PostgreSQL
- Créer un conteneur avec la base de données
- Exposer le port 5432

### 2. Basculer vers la configuration locale

```powershell
cd backend
.\switch-db.ps1 local
```

### 3. Exécuter les migrations

```powershell
npx prisma migrate deploy
npx prisma generate
```

### 4. Charger les données de test

```powershell
npx tsx prisma/seed.ts
```

### 5. Redémarrer le backend

```powershell
npm run start:dev
```

## Revenir à Neon

```powershell
cd backend
.\switch-db.ps1 neon
# Puis redémarrer le backend
```

## Commandes utiles

```powershell
# Voir les logs PostgreSQL
docker logs real-estate-postgres

# Arrêter PostgreSQL
docker-compose down

# Supprimer les données (réinitialiser)
docker-compose down -v
```

## Connexion à la base

- **Host**: localhost
- **Port**: 5432
- **Database**: real_estate_db
- **User**: postgres
- **Password**: postgres

Vous pouvez utiliser un client comme:
- pgAdmin
- DBeaver
- TablePlus
- VS Code extension PostgreSQL
