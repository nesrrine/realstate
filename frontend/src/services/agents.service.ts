import apiClient from '@/lib/api-client';

export interface AgentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
}

export type AgentType = 'FIELD' | 'OFFICE';

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  FIELD: 'Agent terrain',
  OFFICE: 'Agent bureau',
};

export interface AgentOption {
  id: string;
  user: { firstName: string; lastName: string; email: string };
}

export interface AgentListItem extends AgentOption {
  licenseNumber?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  agentType?: AgentType;
  canManageCash?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user: AgentUser;
  _count?: {
    clients: number;
    properties: number;
    /** Visites accompagnées sur place */
    fieldAgentVisits: number;
    /** Visites planifiées depuis l'agence */
    officeAgentVisits: number;
  };
}

export interface AgentDetail extends AgentListItem {
  clients?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
    createdAt: string;
  }>;
  properties?: Array<{
    id: string;
    title: string;
    city: string;
    status: string;
    price: number;
    isPublished: boolean;
  }>;
}

export interface AgentFilters {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  agentType?: AgentType;
}

export interface CreateAgentDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  licenseNumber?: string;
  bio?: string;
  role?: 'AGENT' | 'ADMIN';
  agentType?: AgentType;
}

export type UpdateAgentDto = Partial<
  Omit<CreateAgentDto, 'password' | 'email'> & { isActive?: boolean }
>;

export const agentsService = {
  async getOptions(): Promise<AgentOption[]> {
    const { data } = await apiClient.get('/agents/options');
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  /** @deprecated use getOptions for selects; getAll for admin list */
  async getAll(): Promise<AgentOption[]> {
    return this.getOptions();
  },

  async getList(filters?: AgentFilters) {
    const { data } = await apiClient.get('/agents', { params: filters });
    return data as { data: AgentListItem[]; meta: { total: number; page: number; limit: number; totalPages: number } };
  },

  async getById(id: string): Promise<AgentDetail> {
    const { data } = await apiClient.get(`/agents/${id}`);
    return data;
  },

  async create(payload: CreateAgentDto) {
    const { data } = await apiClient.post('/agents', payload);
    return data as AgentListItem;
  },

  async update(id: string, payload: UpdateAgentDto) {
    const { data } = await apiClient.patch(`/agents/${id}`, payload);
    return data as AgentListItem;
  },

  /** Suppression complète : le portefeuille est transféré à transferTo (par défaut : l'utilisateur connecté). */
  async delete(id: string, transferTo?: string) {
    const { data } = await apiClient.delete(`/agents/${id}`, {
      params: transferTo ? { transferTo } : undefined,
    });
    return data as {
      message: string;
      transferredTo: { id: string; name: string };
      moved: Record<string, number>;
    };
  },

  async portfolio(id: string): Promise<Record<string, number>> {
    const { data } = await apiClient.get(`/agents/${id}/portfolio`);
    return data;
  },
};