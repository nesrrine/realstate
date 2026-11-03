# 📊 Module Dashboard

## 🎯 Vue d'ensemble

Le module **Dashboard** fournit des endpoints optimisés pour afficher les statistiques et KPIs de la plateforme immobilière. Toutes les requêtes PostgreSQL sont optimisées avec des requêtes parallèles et des raw queries pour les performances.

---

## 🚀 Endpoints disponibles

### 1. GET `/api/dashboard/summary`
**Vue d'ensemble complète du dashboard**

**Retourne :**
- 📦 Nombre de biens disponibles
- 👥 Nombre de clients actifs
- 🆕 Nouveaux leads (7 derniers jours)
- 📅 Visites du jour
- 🔜 Visites à venir (7 prochains jours)
- 💰 Ventes et locations
- 💵 Chiffre d'affaires total
- 🏆 Commissions totales
- ⭐ Top 5 agents (par transactions)

**Exemple de réponse :**
```json
{
  "properties": {
    "available": 125
  },
  "clients": {
    "total": 340
  },
  "leads": {
    "new": 23
  },
  "visits": {
    "today": 5,
    "upcoming": 18
  },
  "transactions": {
    "sales": 45,
    "rentals": 32,
    "total": 77
  },
  "revenue": {
    "total": 18500000
  },
  "commissions": {
    "total": 370000
  },
  "topAgents": [
    {
      "agentId": "clx012jkl",
      "name": "Ahmed Ben Ali",
      "transactions": 15
    }
  ]
}
```

---

### 2. GET `/api/dashboard/sales`
**Statistiques de ventes et locations**

**Retourne :**
- 📈 Ventes par mois (12 derniers mois)
- 📊 Locations par mois
- 🏠 Transactions par type de bien
- 💰 Distribution des prix

**Exemple de réponse :**
```json
{
  "salesByMonth": [
    {
      "month": "2026-10",
      "sales": 8,
      "rentals": 5,
      "revenue": 2450000
    },
    {
      "month": "2026-09",
      "sales": 12,
      "rentals": 7,
      "revenue": 3100000
    }
  ],
  "byPropertyType": [
    {
      "type": "APARTMENT",
      "count": 45,
      "totalAmount": 11250000
    },
    {
      "type": "VILLA",
      "count": 18,
      "totalAmount": 9000000
    }
  ],
  "priceDistribution": [
    {
      "range": "< 100K",
      "count": 15
    },
    {
      "range": "100K-250K",
      "count": 35
    },
    {
      "range": "250K-500K",
      "count": 20
    },
    {
      "range": "500K-1M",
      "count": 5
    },
    {
      "range": "> 1M",
      "count": 2
    }
  ]
}
```

---

### 3. GET `/api/dashboard/leads`
**Statistiques des leads**

**Retourne :**
- 📊 Leads par source
- 🎯 Leads par statut
- 📈 Taux de conversion
- 📅 Évolution par mois (6 derniers mois)

**Exemple de réponse :**
```json
{
  "bySource": [
    { "source": "WEBSITE", "count": 45 },
    { "source": "FACEBOOK", "count": 32 },
    { "source": "WHATSAPP", "count": 28 },
    { "source": "PHONE", "count": 15 },
    { "source": "REFERRAL", "count": 12 }
  ],
  "byStatus": [
    { "status": "NEW", "count": 23 },
    { "status": "CONTACTED", "count": 18 },
    { "status": "QUALIFIED", "count": 15 },
    { "status": "NEGOTIATION", "count": 8 },
    { "status": "WON", "count": 25 },
    { "status": "LOST", "count": 12 }
  ],
  "conversion": {
    "total": 101,
    "won": 25,
    "lost": 76,
    "rate": 24.75
  },
  "byMonth": [
    {
      "month": "2026-10",
      "count": 23,
      "won": 5,
      "lost": 3
    },
    {
      "month": "2026-09",
      "count": 28,
      "won": 7,
      "lost": 4
    }
  ]
}
```

---

### 4. GET `/api/dashboard/agents`
**Performance des agents (ADMIN/MANAGER uniquement)**

**Retourne :**
- 👤 Performance détaillée par agent
- 💰 Transactions et revenus
- 🏆 Commissions gagnées
- 👥 Clients actifs
- 📋 Leads actifs
- 📅 Visites réalisées

**Exemple de réponse :**
```json
{
  "agents": [
    {
      "agentId": "clx012jkl",
      "name": "Ahmed Ben Ali",
      "transactions": 15,
      "revenue": 3750000,
      "commissions": 75000,
      "activeClients": 28,
      "activeLeads": 12,
      "visits": {
        "total": 45,
        "completed": 38
      }
    },
    {
      "agentId": "clx345mno",
      "name": "Fatima Trabelsi",
      "transactions": 12,
      "revenue": 3000000,
      "commissions": 60000,
      "activeClients": 24,
      "activeLeads": 10,
      "visits": {
        "total": 38,
        "completed": 32
      }
    }
  ]
}
```

---

## 🔍 Filtres disponibles

Tous les endpoints acceptent ces query parameters :

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `startDate` | ISO Date | Date de début | `2026-01-01` |
| `endDate` | ISO Date | Date de fin | `2026-12-31` |
| `agentId` | String | Filtrer par agent | `clx012jkl` |

**Exemples :**
```http
# Période spécifique
GET /api/dashboard/summary?startDate=2026-01-01&endDate=2026-03-31

# Agent spécifique
GET /api/dashboard/sales?agentId=clx012jkl

# Combinaison
GET /api/dashboard/leads?startDate=2026-01-01&agentId=clx012jkl
```

---

## 🔐 Permissions

| Endpoint | ADMIN | MANAGER | AGENT |
|----------|:-----:|:-------:|:-----:|
| `/summary` | ✅ Tout | ✅ Tout | ✅ Ses données |
| `/sales` | ✅ Tout | ✅ Tout | ✅ Ses données |
| `/leads` | ✅ Tout | ✅ Tout | ✅ Ses données |
| `/agents` | ✅ | ✅ | ❌ |

**Notes :**
- Les **AGENTS** voient uniquement leurs propres statistiques
- Les **ADMIN/MANAGER** peuvent voir toutes les données
- Le paramètre `agentId` est ignoré pour les agents (ils voient toujours leurs données)

---

## ⚡ Optimisations PostgreSQL

### 1. **Requêtes parallèles**
Toutes les métriques du summary sont récupérées en parallèle avec `Promise.all()` :
```typescript
const [
  availableProperties,
  totalClients,
  newLeads,
  todayVisits,
  upcomingVisits,
  // ...
] = await Promise.all([
  // 10 requêtes en parallèle
]);
```

### 2. **Raw SQL pour agrégations complexes**
Les statistiques avancées utilisent `$queryRaw` pour des performances optimales :
```typescript
await this.prisma.$queryRaw`
  SELECT 
    TO_CHAR(t."createdAt", 'YYYY-MM') as month,
    COUNT(CASE WHEN t.type = 'SALE' THEN 1 END) as sales,
    COUNT(CASE WHEN t.type = 'RENTAL' THEN 1 END) as rentals,
    SUM(t.amount) as revenue
  FROM transactions t
  WHERE t."createdAt" >= NOW() - INTERVAL '12 months'
  GROUP BY TO_CHAR(t."createdAt", 'YYYY-MM')
  ORDER BY month DESC
`;
```

### 3. **Indexes recommandés**
Pour de meilleures performances, assurez-vous que ces indexes existent :
```sql
-- Transactions
CREATE INDEX idx_transactions_created_at ON transactions("createdAt");
CREATE INDEX idx_transactions_agent_id ON transactions("agentId");
CREATE INDEX idx_transactions_type ON transactions(type);

-- Leads
CREATE INDEX idx_leads_created_at ON leads("createdAt");
CREATE INDEX idx_leads_agent_id ON leads("agentId");
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);

-- Visits
CREATE INDEX idx_visits_scheduled_at ON visits("scheduledAt");
CREATE INDEX idx_visits_agent_id ON visits("agentId");
CREATE INDEX idx_visits_status ON visits(status);

-- Properties
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_agent_id ON properties("agentId");
```

### 4. **Mise en cache recommandée**
Pour les dashboards à forte charge, considérez :
- Cache Redis avec TTL de 5-10 minutes
- Calcul des stats en background (cron job)
- Invalidation du cache lors de modifications

---

## 📊 Cas d'usage frontend

### Dashboard principal (Page d'accueil)
```typescript
// Récupérer toutes les données du dashboard
const summary = await fetch('/api/dashboard/summary');

// Afficher :
// - Cartes KPI (biens, clients, leads, visites)
// - Graphique transactions (ventes vs locations)
// - Liste top agents
```

### Page Ventes & Analytics
```typescript
// Récupérer les statistiques de ventes
const sales = await fetch('/api/dashboard/sales?startDate=2026-01-01');

// Afficher :
// - Graphique ventes/locations par mois (line chart)
// - Pie chart transactions par type de bien
// - Histogram distribution des prix
```

### Page Leads
```typescript
// Récupérer les stats des leads
const leads = await fetch('/api/dashboard/leads');

// Afficher :
// - Funnel de conversion
// - Pie chart leads par source
// - Bar chart évolution mensuelle
// - KPI taux de conversion
```

### Page Performance des agents
```typescript
// Récupérer la performance (admin/manager only)
const agents = await fetch('/api/dashboard/agents');

// Afficher :
// - Tableau comparatif agents
// - Classement par transactions
// - Graphique commissions par agent
```

---

## 🧪 Tests

### Utiliser REST Client (VS Code)
1. Ouvrir `backend/test-dashboard.http`
2. Remplacer `@token` par votre JWT
3. Exécuter les requêtes

### Utiliser Swagger
```
http://localhost:3001/api/docs
```
Section "Dashboard" avec tous les endpoints documentés

### cURL
```bash
# Summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dashboard/summary

# Sales avec filtres
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/dashboard/sales?startDate=2026-01-01&endDate=2026-12-31"

# Leads
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dashboard/leads

# Agents performance
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dashboard/agents
```

---

## 🎨 Composants frontend suggérés

### KPI Cards
```tsx
<DashboardCard
  title="Biens disponibles"
  value={summary.properties.available}
  icon={<HomeIcon />}
  trend="+5%"
/>
```

### Line Chart (Ventes par mois)
```tsx
<LineChart
  data={sales.salesByMonth}
  xKey="month"
  lines={[
    { key: "sales", name: "Ventes", color: "#3b82f6" },
    { key: "rentals", name: "Locations", color: "#10b981" }
  ]}
/>
```

### Pie Chart (Leads par source)
```tsx
<PieChart
  data={leads.bySource}
  labelKey="source"
  valueKey="count"
/>
```

### Agent Performance Table
```tsx
<DataTable
  columns={["Nom", "Transactions", "Revenue", "Commissions"]}
  data={agents.agents}
  sortable
/>
```

---

## 🔄 Rafraîchissement des données

### Stratégies recommandées

**1. Polling (Simple)**
```typescript
// Rafraîchir toutes les 30 secondes
useEffect(() => {
  const interval = setInterval(() => {
    fetchDashboardData();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**2. SWR / React Query (Recommandé)**
```typescript
import useSWR from 'swr';

const { data, error } = useSWR(
  '/api/dashboard/summary',
  fetcher,
  { refreshInterval: 30000 }
);
```

**3. WebSockets (Temps réel)**
```typescript
// Écouter les événements de mise à jour
socket.on('transaction:created', () => {
  revalidate();
});
```

---

## 📈 Métriques de performance

### Temps de réponse attendus
- `/summary` : **< 500ms**
- `/sales` : **< 800ms**
- `/leads` : **< 400ms**
- `/agents` : **< 1000ms**

### Optimisations si lent
1. Vérifier les indexes PostgreSQL
2. Ajouter du cache Redis
3. Paginer les résultats (agents)
4. Pré-calculer les stats en background

---

## 🚀 Améliorations futures

- [ ] Export PDF des statistiques
- [ ] Comparaison de périodes (vs mois précédent)
- [ ] Prévisions (ML)
- [ ] Alertes automatiques (objectifs non atteints)
- [ ] Dashboard personnalisable (widgets)
- [ ] Filtres avancés (ville, type de bien)
- [ ] Graphiques interactifs (drill-down)

---

## ✅ Checklist déploiement

- [x] Endpoints créés
- [x] Requêtes optimisées
- [x] Permissions implémentées
- [x] Documentation Swagger
- [x] Tests HTTP fournis
- [ ] Indexes PostgreSQL créés
- [ ] Cache Redis configuré (optionnel)
- [ ] Monitoring des performances
- [ ] Logs des requêtes lentes

---

**🎉 Module Dashboard prêt pour le frontend !**

Documentation générée le 12/10/2026
