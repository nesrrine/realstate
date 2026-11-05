# 🏠 Plateforme Immobilière

Application full-stack de gestion immobilière avec site public et CRM interne.

## 🚀 Technologies

### Frontend
- **Next.js 15** (App Router, React Server Components)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** (React Query)
- **Framer Motion** (animations)

### Backend
- **NestJS** (Node.js framework)
- **PostgreSQL** (Prisma ORM)
- **JWT** (authentification)
- **Swagger** (documentation API)
- **Cloudinary** (stockage images)

---

## 📦 Installation locale

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/real-estate-platform.git
cd real-estate-platform
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurez DATABASE_URL et autres variables dans .env
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Le backend démarre sur **http://localhost:3001/api**

### 3. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Configurez NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev
```

Le frontend démarre sur **http://localhost:3000**

---

## 🌐 Déploiement

Consultez [DEPLOYMENT.md](./DEPLOYMENT.md) pour les instructions détaillées.

**Résumé** :
- **Frontend** → Vercel
- **Backend** → Render
- **Base de données** → Neon PostgreSQL
- **Stockage images** → Cloudinary

---

## 📚 Documentation

- **API** : http://localhost:3001/api/docs (Swagger)
- **Health** : http://localhost:3001/api/health

### Identifiants de test
| Email                | Mot de passe  | Rôle    |
| -------------------- | ------------- | ------- |
| admin@agency.com     | Admin1234!    | ADMIN   |
| manager@agency.com   | Manager1234!  | MANAGER |
| agent@agency.com     | Agent1234!    | AGENT   |

---

## 🏗️ Structure du projet

```
real-estate-platform/
├── backend/                 # API NestJS
│   ├── prisma/             # Schema et migrations
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── auth/           # Authentification JWT
│   │   ├── properties/     # Gestion des biens
│   │   ├── clients/        # Gestion des clients
│   │   ├── visits/         # Visites
│   │   ├── transactions/   # Ventes/locations
│   │   ├── commissions/    # Calcul commissions
│   │   ├── agents/         # Gestion agents
│   │   ├── studio/         # Studio d'affiches
│   │   └── public/         # API publique
│   └── package.json
│
├── frontend/               # Application Next.js
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   │   ├── (public)/  # Site public
│   │   │   └── crm/       # CRM interne
│   │   ├── components/    # Composants React
│   │   ├── services/      # API clients
│   │   ├── lib/           # Utilitaires
│   │   └── hooks/         # Hooks React
│   ├── public/            # Assets statiques
│   └── package.json
│
├── .gitignore
├── README.md
├── DEPLOYMENT.md
└── render.yaml            # Config Render
```

---

## 🔑 Fonctionnalités

### Site Public
- ✅ Catalogue de biens (vente/location)
- ✅ Recherche et filtres avancés
- ✅ Pages détaillées des biens
- ✅ Formulaires de contact
- ✅ Page agence et équipe
- ✅ Responsive design

### CRM Interne
- ✅ Gestion des biens immobiliers
- ✅ Gestion des clients (acheteurs/vendeurs)
- ✅ Planification des visites
- ✅ Bon de visite imprimable (FR/AR)
- ✅ Suivi des transactions
- ✅ Calcul automatique des commissions
- ✅ Studio d'affiches immobilières
- ✅ Exports Excel
- ✅ Dashboard analytics
- ✅ Gestion multi-agents

### Sécurité
- ✅ Authentification JWT
- ✅ Gestion des rôles (ADMIN, MANAGER, AGENT)
- ✅ Validation des données (class-validator)
- ✅ Protection CORS
- ✅ Rate limiting
- ✅ Hashing des mots de passe (bcrypt)

---

## 🧪 Tests

```bash
# Backend
cd backend
npm run test
npm run test:e2e

# Frontend
cd frontend
npm run test
npm run test:e2e
```

---

## 📝 Scripts utiles

### Backend
```bash
npm run start:dev      # Mode développement
npm run start:prod     # Mode production
npm run build          # Build
npx prisma studio      # Interface DB
npx prisma migrate dev # Nouvelle migration
npx prisma db seed     # Seed la DB
```

### Frontend
```bash
npm run dev            # Mode développement
npm run build          # Build production
npm run start          # Serveur production
npm run lint           # Lint
```

---

## 🤝 Contribution

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Projet privé - Tous droits réservés

---

## 👨‍💻 Auteur

Votre Nom - [votre@email.com](mailto:votre@email.com)

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/)
- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel](https://vercel.com/)
- [Render](https://render.com/)
