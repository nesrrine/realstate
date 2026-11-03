-- ============================================================================
-- Indexes optimisés pour le Dashboard
-- ============================================================================
-- Exécuter ce fichier pour améliorer les performances des requêtes dashboard

-- Transactions
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions("createdAt");
CREATE INDEX IF NOT EXISTS idx_transactions_agent_id ON transactions("agentId");
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_property_id ON transactions("propertyId");
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions("clientId");

-- Composite index pour dashboard summary
CREATE INDEX IF NOT EXISTS idx_transactions_agent_created 
  ON transactions("agentId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_transactions_status_created 
  ON transactions(status, "createdAt");

CREATE INDEX IF NOT EXISTS idx_transactions_type_status 
  ON transactions(type, status);

-- Leads
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads("createdAt");
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads("agentId");
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Composite indexes pour statistiques
CREATE INDEX IF NOT EXISTS idx_leads_agent_status 
  ON leads("agentId", status);
CREATE INDEX IF NOT EXISTS idx_leads_created_status 
  ON leads("createdAt", status);

-- Visits
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_visits_scheduled_at ON visits("scheduledAt");
CREATE INDEX IF NOT EXISTS idx_visits_agent_id ON visits("agentId");
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits("createdAt");

-- Composite index pour visites du jour
CREATE INDEX IF NOT EXISTS idx_visits_scheduled_status 
  ON visits("scheduledAt", status);

-- Properties
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties("agentId");
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_published ON properties("isPublished");

-- Composite index pour biens disponibles
CREATE INDEX IF NOT EXISTS idx_properties_status_agent 
  ON properties(status, "agentId");

-- Clients
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON clients("agentId");
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients("isActive");
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients("createdAt");

-- Composite index pour clients actifs par agent
CREATE INDEX IF NOT EXISTS idx_clients_agent_active 
  ON clients("agentId", "isActive");

-- Commissions
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_commissions_transaction_id ON commissions("transactionId");
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions("createdAt");
CREATE INDEX IF NOT EXISTS idx_commissions_payment_status ON commissions("paymentStatus");

-- Lead Activities
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities("leadId");
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities("createdAt");
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(type);

-- Agents & Users
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents("userId");
CREATE INDEX IF NOT EXISTS idx_users_active ON users("isActive");
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- Views pour des queries fréquentes (optionnel)
-- ============================================================================

-- Vue : Performance des agents
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
  a.id as agent_id,
  u."firstName",
  u."lastName",
  u.email,
  COUNT(DISTINCT t.id) as total_transactions,
  COUNT(DISTINCT CASE WHEN t.type = 'SALE' THEN t.id END) as total_sales,
  COUNT(DISTINCT CASE WHEN t.type = 'RENTAL' THEN t.id END) as total_rentals,
  COALESCE(SUM(t.amount), 0) as total_revenue,
  COUNT(DISTINCT c.id) as active_clients,
  COUNT(DISTINCT l.id) as active_leads,
  COUNT(DISTINCT v.id) as total_visits
FROM agents a
INNER JOIN users u ON a."userId" = u.id
LEFT JOIN transactions t ON t."agentId" = a.id
LEFT JOIN clients c ON c."agentId" = a.id AND c."isActive" = true
LEFT JOIN leads l ON l."agentId" = a.id AND l.status NOT IN ('WON', 'LOST')
LEFT JOIN visits v ON v."agentId" = a.id
WHERE u."isActive" = true
GROUP BY a.id, u."firstName", u."lastName", u.email;

-- Vue : Statistiques mensuelles
CREATE OR REPLACE VIEW monthly_stats AS
SELECT 
  TO_CHAR(t."createdAt", 'YYYY-MM') as month,
  t.type as transaction_type,
  COUNT(*) as count,
  SUM(t.amount) as total_amount,
  AVG(t.amount) as avg_amount
FROM transactions t
GROUP BY TO_CHAR(t."createdAt", 'YYYY-MM'), t.type
ORDER BY month DESC;

-- Vue : Leads par source et statut
CREATE OR REPLACE VIEW leads_source_status AS
SELECT 
  l.source,
  l.status,
  COUNT(*) as count,
  TO_CHAR(l."createdAt", 'YYYY-MM') as month
FROM leads l
GROUP BY l.source, l.status, TO_CHAR(l."createdAt", 'YYYY-MM')
ORDER BY month DESC, source, status;

-- ============================================================================
-- Statistiques sur les tables (pour l'optimiseur PostgreSQL)
-- ============================================================================

ANALYZE transactions;
ANALYZE leads;
ANALYZE visits;
ANALYZE properties;
ANALYZE clients;
ANALYZE commissions;
ANALYZE agents;
ANALYZE users;

-- ============================================================================
-- Vérifier les indexes créés
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'leads', 'visits', 'properties', 'clients', 'commissions')
ORDER BY tablename, indexname;
