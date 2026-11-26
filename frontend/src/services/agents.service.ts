import apiClient from '@/lib/api-client';

export interface AgentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role?: 'AGENT' | 'ADMIN' | 'MANAGER';
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
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
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
    fieldAgentVisits: number;
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
  sortBy?: 'createdAt' | 'lastName' | 'firstName';
  sortOrder?: 'asc' | 'desc';
}

export interface AgentListResponse {
  data: AgentListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

export interface ResetAgentPasswordDto {
  password: string;
}

// Le back (UpdateAgentDto) n'accepte ni le rôle, ni l'email, ni le mot de passe,
// ni isActive (utiliser setStatus pour ce dernier).
export type UpdateAgentDto = Partial<
  Omit<CreateAgentDto, 'password' | 'email' | 'role'>
>;

export interface DeleteAgentResult {
  message: string;
  transferredTo: {
    id: string;
    name: string;
  };
  moved: Record<string, number>;
}

export const agentsService = {
  async getOptions(): Promise<AgentOption[]> {
    const { data } = await apiClient.get('/agents/options');
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  /** @deprecated utiliser getOptions pour les selects, getList pour la liste admin */
  async getAll(): Promise<AgentOption[]> {
    return agentsService.getOptions();
  },

  async getList(filters?: AgentFilters): Promise<AgentListResponse> {
    const { data } = await apiClient.get('/agents', { params: filters });
    return data as AgentListResponse;
  },

  async getById(id: string): Promise<AgentDetail> {
    const { data } = await apiClient.get(`/agents/${id}`);
    return data;
  },

  async create(payload: CreateAgentDto): Promise<AgentListItem> {
    const { data } = await apiClient.post('/agents', payload);
    return data as AgentListItem;
  },

  async update(id: string, payload: UpdateAgentDto): Promise<AgentListItem> {
    const { data } = await apiClient.patch(`/agents/${id}`, payload);
    return data as AgentListItem;
  },

  /** Activer / désactiver un compte (PATCH /agents/:id/status). */
  async setStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ id: string; email: string; isActive: boolean }> {
    const { data } = await apiClient.patch(`/agents/${id}/status`, {
      isActive,
    });
    return data;
  },

  /**
   * Réinitialisation du mot de passe d'un agent.
   * Route réservée aux rôles ADMIN et MANAGER, comptes AGENT uniquement.
   */
  async resetPassword(
    id: string,
    payload: ResetAgentPasswordDto,
  ): Promise<{ message: string }> {
    const { data } = await apiClient.patch(`/agents/${id}/password`, payload);
    return data;
  },

  /**
   * Suppression complète : le portefeuille est transféré à transferTo
   * (par défaut : l'utilisateur connecté).
   */
  async delete(id: string, transferTo?: string): Promise<DeleteAgentResult> {
    const { data } = await apiClient.delete(`/agents/${id}`, {
      params: transferTo ? { transferTo } : undefined,
    });
    return data as DeleteAgentResult;
  },

  async portfolio(id: string): Promise<Record<string, number>> {
    const { data } = await apiClient.get(`/agents/${id}/portfolio`);
    return data;
  },
};