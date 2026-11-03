# Real Estate Platform

Plateforme immobilière composée d'un site vitrine public et d'un CRM interne sécurisé.

## Stack technique

| Couche       | Technologies                              |
|------------- |------------------------------------------ |
| Frontend     | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend      | NestJS 10, TypeScript, REST API, Prisma   |
| Base de données | PostgreSQL 16                          |
| Infrastructure | Docker, Docker Compose                 |

---

## Prérequis

- [Node.js](https://nodejs.org/) >= 20
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pour PostgreSQL)
- npm >= 9

---

## Installation et lancement

### 1. Cloner le repo et copier l'environnement

```bash
git clone <repo-url>
cd real-estate-platform
cp .env.example .env
```

### 2. Démarrer PostgreSQL via Docker

```bash
docker compose up postgres -d
```

Vérifier que PostgreSQL est healthy :

```bash
docker compose ps
```

### 3. Lancer le Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

Le backend démarre sur **http://localhost:3001**

Vérifier le health check :

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "message": "Real Estate API is running" }
```

### 4. Lancer le Frontend (Next.js)

Dans un nouveau terminal :

```bash
cd frontend
npm install
npm run dev
```

Le frontend démarre sur **http://localhost:3000**

---

## Tout lancer avec Docker Compose

```bash
docker compose up --build
```

Services disponibles :
- **Frontend** : http://localhost:3000
- **Backend** :  http://localhost:3001/api
- **Health** :   http://localhost:3001/api/health
- **PostgreSQL** : localhost:5432

---

## Variables d'environnement

Copier `.env.example` vers `.env` et adapter :

| Variable           | Description                      | Défaut                    |
|--------------------|----------------------------------|---------------------------|
| `DATABASE_URL`     | URL de connexion PostgreSQL      | postgresql://postgres:postgres@localhost:5432/real_estate_db |
| `POSTGRES_USER`    | Utilisateur PostgreSQL           | postgres                  |
| `POSTGRES_PASSWORD`| Mot de passe PostgreSQL          | postgres                  |
| `POSTGRES_DB`      | Nom de la base de données        | real_estate_db            |
| `BACKEND_PORT`     | Port du backend                  | 3001                      |
| `NEXT_PUBLIC_API_URL` | URL de l'API pour le frontend | http://localhost:3001     |

---

## Structure du projet

```
real-estate-platform/
├── frontend/               # Next.js 15 — App Router
│   ├── app/                # Pages et layouts
│   ├── components/         # Composants réutilisables
│   │   └── ui/             # Composants shadcn/ui
│   ├── lib/                # Utilitaires (cn, etc.)
│   └── hooks/              # React hooks custom
├── backend/                # NestJS 10 — REST API
│   ├── src/
│   │   ├── main.ts         # Point d'entrée
│   │   ├── app.module.ts   # Module racine
│   │   ├── app.controller.ts
│   │   └── app.service.ts
│   └── prisma/
│       └── schema.prisma   # Schéma Prisma
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Endpoints API

| Méthode | Route         | Description          |
|---------|---------------|----------------------|
| GET     | /api/health   | Health check         |

---

## Prochaines étapes

- [ ] Auth (JWT)
- [ ] Module Clients
- [ ] Module Properties
- [ ] Module Leads
- [ ] Site vitrine complet
- [ ] CRM interne
