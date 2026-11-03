import apiClient from '@/lib/api-client';

export interface DashboardFilter {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}

export interface LeadBrief {
  id: string;
  status: string;
  source: string;
  budget: number;
  createdAt: string;
  client: { firstName: string; lastName: string };
  properties?: Array<{ property: { title: string; city: string } }>;
}

export interface DashboardSummary {
  availableProperties: number;
  totalClients: number;
  newLeads: number;
  visitsToday: number;
  upcomingVisits: number;
  sales: number;
  rentals: number;
  revenue: number;
  commissions: number;
  commissionBreakdown: { agency: number; fieldAgent: number; officeAgent: number };
  agentPerformance: AgentPerformanceRow[];
  properties: { available: number };
  clients: { total: number };
  leads: { new: number };
  visits: { today: number; upcoming: number };
  transactions: { sales: number; rentals: number; total: number };
  revenueDetail: { total: number };
  commissionsDetail: { total: number };
  recentLeads: LeadBrief[];
}

export interface AgentPerformanceRow {
  agentId: string;
  name: string;
  sales: number;
  rentals: number;
  transactions: number;
  revenue: number;
  commissions: number;
  activeClients: number;
  activeLeads: number;
  visits: { total: number; completed: number };
  properties: { total: number; available: number };
}

export interface DashboardSalesStats {
  salesByMonth: Array<{
    month: string;
    sales: number;
    rentals: number;
    revenue: number;
  }>;
  salesPerMonth: Array<{ month: string; count: number; revenue: number }>;
  rentalsPerMonth: Array<{ month: string; count: number; revenue: number }>;
  propertiesByType: Array<{ type: string; count: number }>;
  transactionsByPropertyType: Array<{ type: string; count: number }>;
  byPropertyType: Array<{ type: string; count: number }>;
  priceDistribution: Array<{ range: string; count: number }>;
}

export interface DashboardLeadsStats {
  leadsBySource: Array<{ source: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  conversion: { total: number; won: number; lost: number; rate: number };
  leadsByMonth: Array<{ month: string; count: number; won: number; lost: number }>;
}

export const dashboardService = {
  async getSummary(filters?: DashboardFilter): Promise<DashboardSummary> {
    const { data } = await apiClient.get('/dashboard/summary', { params: filters });
    return data;
  },

  async getSales(filters?: DashboardFilter): Promise<DashboardSalesStats> {
    const { data } = await apiClient.get('/dashboard/sales', { params: filters });
    return data;
  },

  async getLeads(filters?: DashboardFilter): Promise<DashboardLeadsStats> {
    const { data } = await apiClient.get('/dashboard/leads', { params: filters });
    return data;
  },

  async getAgents(filters?: DashboardFilter): Promise<{ agents: AgentPerformanceRow[] }> {
    const { data } = await apiClient.get('/dashboard/agents', { params: filters });
    return data;
  },
};
