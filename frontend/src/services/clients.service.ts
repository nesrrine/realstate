import apiClient from '@/lib/api-client';

import type { PaginatedResponse } from '@/services/properties.service';

export type ClientType = 'BUYER' | 'SELLER' | 'RENTER';

/** Mode de paiement du client : comptant, crédit ou les deux. */
export type Financing = 'CASH' | 'CREDIT' | 'MIXED';
export const FINANCING_LABELS: Record<Financing, string> = {
  CASH: 'Comptant (cash)',
  CREDIT: 'Crédit bancaire',
  MIXED: 'Comptant + crédit',
};
export type FollowUpStatus = 'TO_CONTACT' | 'CONTACTED' | 'NEGOTIATION' | 'WON' | 'LOST';
export type InteractionType = 'CALL' | 'MESSAGE' | 'VISIT' | 'NOTE' | 'EMAIL';

export interface ClientAgent {
  id: string;
  user: { firstName: string; lastName: string; email?: string };
}

export interface ClientInteraction {
  id: string;
  clientId: string;
  agentId?: string;
  type: InteractionType;
  title: string;
  body?: string | null;
  occurredAt: string;
  createdAt: string;
  agent?: ClientAgent;
}

export interface Client {
  id: number | string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  cinOrPassport?: string;
  professionalAddress?: string;
  clientType?: ClientType;
  budget?: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredPropertyTypes?: string[];
  preferredCities?: string[];
  preferredZones?: string[];
  minSurface?: number;
  bedrooms?: number;
  transactionType?: string;
  financing?: Financing | null;
  needDescription?: string | null;
  fieldAgentId?: string | null;
  fieldAgent?: ClientAgent | null;
  notes?: string;
  agent?: ClientAgent;
  agentId?: string;
  status?: 'PROSPECT' | 'CLIENT';
  followUpStatus?: FollowUpStatus;
  lastInteractionAt?: string | null;
  nextFollowUpAt?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFilters {
  search?: string;
  clientType?: ClientType;
  agentId?: string;
  status?: 'PROSPECT' | 'CLIENT';
  followUpStatus?: FollowUpStatus;
  nextFollowUpAt?: string;
  transactionType?: string;
  isActive?: boolean;
  city?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DuplicateClient extends Client {
  agent: ClientAgent;
}

export interface DuplicateDetectionResult {
  hasDuplicate: boolean;
  duplicates: DuplicateClient[];
  message: string;
}
export interface CreateClientDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  cinOrPassport?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  professionalAddress?: string;
  clientType?: ClientType;
  budget?: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredPropertyTypes?: string[];
  preferredCities?: string[];
  notes?: string;
  agentId?: string;
  financing?: Financing;
  needDescription?: string;
  fieldAgentId?: string;
  status?: 'PROSPECT' | 'CLIENT';
  followUpStatus?: 'TO_CONTACT' | 'CONTACTED' | 'NEGOTIATION' | 'WON' | 'LOST';
  nextFollowUpAt?: string;
}

// Frontend -> API : renomme les champs pour correspondre au DTO du backend
function toApiPayload(data: Partial<CreateClientDto>) {
  const { budget, budgetMin, budgetMax, preferredCities, clientType, ...rest } = data;
  const payload: Record<string, unknown> = { ...rest };

  if (budget !== undefined && budget !== null && !Number.isNaN(Number(budget))) {
    payload.budgetMax = Number(budget);
  }
  if (budgetMin !== undefined && budgetMin !== null && !Number.isNaN(Number(budgetMin))) {
    payload.budgetMin = Number(budgetMin);
  }
  if (budgetMax !== undefined && budgetMax !== null && !Number.isNaN(Number(budgetMax))) {
    payload.budgetMax = Number(budgetMax);
  }
  if (preferredCities && preferredCities.length > 0) {
    payload.preferredZones = preferredCities;
  }
  if (clientType) {
    payload.clientType = clientType;
  }
  if (!payload.email) delete payload.email; // email vide => IsEmail échouerait

  return payload;
}

// API -> Frontend : remet les noms utilisés par les formulaires et les pages
type ApiClientRow = Client & {
  budgetMin?: number;
  budgetMax?: number;
  preferredZones?: string[];
  clientType?: string;
};

function fromApi(client: ApiClientRow): Client {
  return {
    ...client,
    budget: client.budget ?? client.budgetMax ?? client.budgetMin ?? undefined,
    budgetMin: client.budgetMin,
    budgetMax: client.budgetMax,
    preferredCities: client.preferredCities ?? client.preferredZones ?? [],
    clientType: client.clientType as ClientType | undefined,
  };
}

export const clientsService = {
  async getAll(filters?: ClientFilters): Promise<PaginatedResponse<Client>> {
    const response = await apiClient.get('/clients', { params: filters });
    const data = response.data;

    const fallbackPage = filters?.page ?? 1;
    const fallbackLimit = filters?.limit ?? 20;

    let items: Client[];
    let total: number;
    let page: number;
    let limit: number;
    let totalPages: number;

    if (Array.isArray(data)) {
      items = data.map(fromApi);
      total = items.length;
      page = fallbackPage;
      limit = fallbackLimit;
      totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    } else if (Array.isArray(data?.data)) {
      items = data.data.map(fromApi);
      total = data.meta?.total ?? items.length;
      page = data.meta?.page ?? fallbackPage;
      limit = data.meta?.limit ?? fallbackLimit;
      totalPages = data.meta?.totalPages ?? Math.ceil(total / limit);
    } else {
      throw new Error('Format de réponse inattendu du backend');
    }

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: data?.meta?.hasNext ?? page * limit < total,
        hasPrev: data?.meta?.hasPrev ?? page > 1,
      },
    };
  },

  async getById(id: number | string) {
    const response = await apiClient.get(`/clients/${id}`);
    return fromApi(response.data);
  },

  async create(data: Partial<CreateClientDto>) {
    const response = await apiClient.post('/clients', toApiPayload(data));
    return fromApi(response.data);
  },

  async update(id: number | string, data: Partial<CreateClientDto>) {
    const response = await apiClient.put(`/clients/${id}`, toApiPayload(data));
    return fromApi(response.data);
  },

  async delete(id: number | string) {
    const response = await apiClient.delete(`/clients/${id}`);
    return response.data;
  },

  /** Annule une suppression (le client réapparaît dans les listes) */
  async restore(id: number | string) {
    const response = await apiClient.put(`/clients/${id}`, { isActive: true });
    return fromApi(response.data);
  },

  async convert(id: number | string) {
    const response = await apiClient.patch(`/clients/${id}/convert`);
    return fromApi(response.data);
  },

  async detectDuplicates(data: Partial<CreateClientDto>): Promise<DuplicateDetectionResult> {
    const { data: result } = await apiClient.post('/clients/detect-duplicates', data);
    return result;
  },

  async merge(sourceId: number | string, targetId: number | string): Promise<Client> {
    const { data } = await apiClient.post(`/clients/${sourceId}/merge`, { targetId });
    return fromApi(data);
  },

  async createInteraction(clientId: number | string, data: {
    type: InteractionType;
    title: string;
    body?: string;
    occurredAt?: string;
    followUpStatus?: FollowUpStatus;
    nextFollowUpAt?: string;
  }): Promise<ClientInteraction> {
    const { data: result } = await apiClient.post(`/clients/${clientId}/interactions`, data);
    return result;
  },

  async updateFollowUp(clientId: number | string, data: {
    followUpStatus?: FollowUpStatus;
    nextFollowUpAt?: string;
    lastInteractionAt?: string;
  }): Promise<Client> {
    const { data: result } = await apiClient.patch(`/clients/${clientId}/follow-up`, data);
    return fromApi(result);
  },
};