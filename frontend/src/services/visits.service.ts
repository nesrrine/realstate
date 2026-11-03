import apiClient from '@/lib/api-client';

export type VisitStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface VisitStats {
  total: number;
  today: number;
  upcoming: number;
  overdue: number;
  completed: number;
  thisMonth: number;
}

export interface Visit {
  id: string;
  clientId: string;
  fieldAgentId: string;
  officeAgentId?: string;
  visitType?: 'IN_PERSON' | 'REMOTE';
  scheduledAt: string;
  duration?: number;
  status: VisitStatus;
  feedback?: string;
  properties?: Array<{
    id: string;
    property: {
      id: string;
      title: string;
      address: string;
      city: string;
    };
  }>;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  fieldAgent?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  officeAgent?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
  updatedAt: string;
  /** Rang de la visite chez ce client : 1 = visite, 2+ = revisite */
  visitNumber?: number | null;
  /** Nombre total de visites du client (annulées et absences exclues) */
  clientVisitCount?: number;
}

export interface VisitFilters {
  status?: string;
  propertyId?: string;
  clientId?: string;
  fieldAgentId?: string;
  officeAgentId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateVisitDto {
  propertyId?: string;
  propertyIds?: string[];
  clientId: string;
  fieldAgentId?: string;
  officeAgentId?: string;
  visitType?: 'IN_PERSON' | 'REMOTE';
  scheduledAt: string;
  duration?: number;
  status?: VisitStatus;
  feedback?: string;
}

export const visitsService = {
  async getAll(filters?: VisitFilters) {
    const response = await apiClient.get('/visits', { params: filters });
    return response.data;
  },

  async getStats(): Promise<VisitStats> {
    const response = await apiClient.get('/visits/stats');
    return response.data;
  },

  async clientVisitCount(clientId: string): Promise<{ clientId: string; count: number; nextNumber: number }> {
    const response = await apiClient.get(`/visits/client/${clientId}/count`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get(`/visits/${id}`);
    return response.data;
  },

  async create(data: Partial<CreateVisitDto>) {
    const response = await apiClient.post('/visits', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateVisitDto>) {
    const response = await apiClient.put(`/visits/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await apiClient.delete(`/visits/${id}`);
    return response.data;
  },
};