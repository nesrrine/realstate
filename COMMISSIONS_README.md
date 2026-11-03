# 💰 Modules Transactions & Commissions

## 📋 Vue d'ensemble

Les modules **Transactions** et **Commissions** permettent de gérer les ventes/locations et les commissions associées avec calcul automatique.

---

## 🏗️ Architecture

### Transaction
Une transaction représente une vente ou une location finalisée.

**Champs :**
- `property` - Bien immobilier
- `client` - Client acheteur/locataire
- `owner` - Propriétaire du bien
- `agent` - Agent responsable
- `type` - SALE ou RENTAL
- `amount` - Montant de la transaction
- `agencyFeeRate` - Taux de commission (ex: 0.02 = 2%)
- `agencyFeeAmount` - Montant calculé automatiquement
- `signedAt` - Date de signature
- `notes` - Notes supplémentaires

### Commission
Une commission est générée automatiquement ou manuellement pour chaque transaction.

**Champs :**
- `transaction` - Transaction associée
- `amount` - Montant total de la commission
- `rate` - Taux appliqué
- `isPaid` - Statut de paiement
- `paidAt` - Date de paiement
- `notes` - Notes

---

## ⚙️ Configuration des taux

Les taux par défaut sont configurables via `.env` :

```env
# Taux de commission par défaut (2%)
COMMISSION_RATE=0.02

# Part de l'agent (50% de la commission totale)
AGENT_SHARE_RATE=0.5
```

### Exemple de calcul :

**Transaction = 250,000 DT**  
**Commission rate = 2%**

```
Commission totale = 250,000 × 0.02 = 5,000 DT
Part agence (50%) = 2,500 DT
Part agent (50%)  = 2,500 DT
```

---

## 🔌 API Endpoints

### Transactions

| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| `GET` | `/api/transactions` | Liste des transactions | Tous |
| `GET` | `/api/transactions/:id` | Détail d'une transaction | Tous |
| `POST` | `/api/transactions` | Créer une transaction | ADMIN, MANAGER |
| `PUT` | `/api/transactions/:id` | Modifier une transaction | ADMIN, MANAGER |
| `DELETE` | `/api/transactions/:id` | Supprimer une transaction | ADMIN |

**Query params (GET /transactions) :**
- `page` - Numéro de page (défaut: 1)
- `limit` - Éléments par page (défaut: 20)
- `type` - Filtrer par type (SALE/RENTAL)
- `agentId` - Filtrer par agent
- `propertyId` - Filtrer par propriété
- `clientId` - Filtrer par client

### Commissions

| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| `GET` | `/api/commissions` | Liste des commissions | Tous |
| `GET` | `/api/commissions/:id` | Détail d'une commission | Tous |
| `GET` | `/api/commissions/stats` | Statistiques | Tous |
| `GET` | `/api/commissions/default-rates` | Taux par défaut | Tous |
| `GET` | `/api/commissions/calculate-preview` | Simuler un calcul | Tous |
| `POST` | `/api/commissions` | Créer une commission | ADMIN, MANAGER |
| `PUT` | `/api/commissions/:id` | Modifier une commission | ADMIN, MANAGER |
| `DELETE` | `/api/commissions/:id` | Supprimer une commission | ADMIN |

**Query params (GET /commissions) :**
- `page` - Numéro de page
- `limit` - Éléments par page
- `agentId` - Filtrer par agent
- `transactionId` - Filtrer par transaction
- `isPaid` - Filtrer par statut de paiement (true/false)

---

## 📝 Exemples d'utilisation

### 1. Créer une transaction avec commission automatique

```json
POST /api/transactions
Authorization: Bearer <JWT_TOKEN>

{
  "propertyId": "clx123abc",
  "clientId": "clx456def",
  "ownerId": "clx789ghi",
  "agentId": "clx012jkl",
  "type": "SALE",
  "amount": 250000,
  "agencyFeeRate": 0.02,
  "signedAt": "2026-10-12T10:00:00Z",
  "createCommission": true,
  "notes": "Transaction avec commission automatique"
}
```

**Résultat :**
- Transaction créée avec montant 250,000 DT
- Commission créée automatiquement : 5,000 DT
- Statut du bien mis à jour : `SOLD`

---

### 2. Calculer une commission (preview)

```http
GET /api/commissions/calculate-preview?amount=250000&rate=0.02&agentShareRate=0.5
Authorization: Bearer <JWT_TOKEN>
```

**Réponse :**
```json
{
  "totalAmount": 5000,
  "agencyAmount": 2500,
  "agentAmount": 2500,
  "rate": 0.02,
  "agentShareRate": 0.5
}
```

---

### 3. Obtenir les statistiques des commissions

```http
GET /api/commissions/stats?agentId=clx012jkl&startDate=2026-01-01
Authorization: Bearer <JWT_TOKEN>
```

**Réponse :**
```json
{
  "totalCommissions": 15,
  "paidCommissions": 10,
  "unpaidCommissions": 5,
  "totalAmount": 75000,
  "paidAmount": 50000,
  "unpaidAmount": 25000,
  "averageCommission": 5000
}
```

---

### 4. Marquer une commission comme payée

```json
PUT /api/commissions/:id
Authorization: Bearer <JWT_TOKEN>

{
  "isPaid": true,
  "paidAt": "2026-10-12T14:30:00Z",
  "notes": "Paiement effectué par virement"
}
```

---

### 5. Créer une commission manuellement

```json
POST /api/commissions
Authorization: Bearer <JWT_TOKEN>

{
  "transactionId": "clx999xyz",
  "amount": 5000,
  "rate": 0.02,
  "agentShareRate": 0.6,
  "notes": "Commission négociée - part agent augmentée"
}
```

---

### 6. Lister les commissions non payées

```http
GET /api/commissions?isPaid=false&page=1&limit=20
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 Permissions

| Action | ADMIN | MANAGER | AGENT |
|--------|-------|---------|-------|
| Voir transactions | ✅ Toutes | ✅ Toutes | ✅ Les siennes |
| Créer transaction | ✅ | ✅ | ❌ |
| Modifier transaction | ✅ | ✅ | ❌ |
| Supprimer transaction | ✅ | ❌ | ❌ |
| Voir commissions | ✅ Toutes | ✅ Toutes | ✅ Les siennes |
| Créer commission | ✅ | ✅ | ❌ |
| Modifier commission | ✅ | ✅ | ❌ |
| Supprimer commission | ✅ | ❌ | ❌ |

---

## 🎯 Fonctionnalités avancées

### Calcul automatique
Le montant de la commission est calculé automatiquement lors de :
- La création d'une transaction avec `createCommission: true`
- La création manuelle d'une commission
- La mise à jour du taux de commission

### Validation
- Une transaction ne peut avoir qu'une seule commission
- Le statut du bien est automatiquement mis à jour (SOLD/RENTED)
- Les montants sont arrondis à 2 décimales

### Statistiques
L'endpoint `/api/commissions/stats` fournit :
- Nombre total de commissions
- Montants totaux (payé/non payé)
- Commission moyenne
- Filtrage par agent et période

---

## 🧪 Test avec Swagger

Documentation interactive disponible sur :
```
http://localhost:3001/api/docs
```

Sections :
- **Transactions** - Gestion des ventes/locations
- **Commissions** - Gestion des commissions

---

## 📊 Diagramme de flux

```
Transaction créée
    ↓
Calcul automatique du montant commission
    ↓
Commission créée (si demandé)
    ↓
Statut du bien mis à jour
    ↓
Notification envoyée (future feature)
```

---

## 🔧 Personnalisation des taux

Pour modifier les taux par défaut, éditez le fichier `.env` :

```env
# Augmenter le taux de commission à 3%
COMMISSION_RATE=0.03

# Donner 60% à l'agent
AGENT_SHARE_RATE=0.6
```

Redémarrez le serveur pour appliquer les changements.

---

## 📌 Notes importantes

1. **Unicité** : Une transaction ne peut avoir qu'une seule commission
2. **Calcul précis** : Les montants sont arrondis à 2 décimales
3. **Audit** : Les dates de création/modification sont automatiquement gérées
4. **Sécurité** : Les agents ne peuvent que consulter leurs propres commissions
5. **Flexibilité** : Les taux peuvent être personnalisés par transaction

---

## 🚀 Prochaines étapes

- [ ] Notifications automatiques lors du paiement
- [ ] Export PDF des commissions
- [ ] Dashboard de suivi des commissions
- [ ] Rappels automatiques pour commissions non payées
- [ ] Historique des modifications

---

**Documentation générée le 12/10/2026**
