import apiClient from '@/lib/api-client';

export type CommissionPaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Commission {
  id: string;
  transactionId: string;
  commissionRate: number | string;
  agencyAmount: number | string;
  fieldAgentAmount: number | string;
  officeAgentAmount: number | string;
  fieldAgentShareRate: number | string;
  officeAgentShareRate: number | string;
  amount: number | string;
  paymentStatus: CommissionPaymentStatus;
  paidAt?: string | null;
  notes?: string | null;
  transaction?: {
    id: string;
    amount: number | string;
    type: string;
    property?: { id: string; title: string; city: string };
    client?: { id: string; firstName: string; lastName: string };
    fieldAgent?: { id: string; user: { firstName: string; lastName: string } };
    officeAgent?: { id: string; user: { firstName: string; lastName: string } };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommissionFilters {
  page?: number;
  limit?: number;
  fieldAgentId?: string;
  officeAgentId?: string;
  transactionId?: string;
  paymentStatus?: CommissionPaymentStatus;
}

export interface CommissionConfig {
  commissionRate: number;
  fieldAgentShareRate: number;
  officeAgentShareRate: number;
}

export interface CommissionPreview {
  commissionRate: number;
  fieldAgentShareRate: number;
  officeAgentShareRate: number;
  amount: number;
  agencyAmount: number;
  fieldAgentAmount: number;
  officeAgentAmount: number;
}

export interface PaginatedCommissions {
  data: Commission[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const commissionsService = {
  async getAll(filters?: CommissionFilters): Promise<PaginatedCommissions> {
    const { data } = await apiClient.get('/commissions', { params: filters });
    return data;
  },

  async getById(id: string): Promise<Commission> {
    const { data } = await apiClient.get(`/commissions/${id}`);
    return data;
  },

  async getConfig(): Promise<CommissionConfig> {
    const { data } = await apiClient.get('/commissions/config');
    return data;
  },

  async updateConfig(payload: Partial<CommissionConfig>): Promise<CommissionConfig> {
    const { data } = await apiClient.put('/commissions/config', payload);
    return data;
  },

  async preview(
    amount: number,
    commissionRate?: number,
    fieldAgentShareRate?: number,
    officeAgentShareRate?: number,
  ): Promise<CommissionPreview> {
    const { data } = await apiClient.get('/commissions/calculate-preview', {
      params: { amount, commissionRate, fieldAgentShareRate, officeAgentShareRate },
    });
    return data;
  },

  async getStats(params?: { fieldAgentId?: string; officeAgentId?: string; startDate?: string; endDate?: string }) {
    const { data } = await apiClient.get('/commissions/stats', { params });
    return data;
  },

  async update(
    id: string,
    payload: {
      commissionRate?: number;
      fieldAgentShareRate?: number;
      officeAgentShareRate?: number;
      paymentStatus?: CommissionPaymentStatus;
      paidAt?: string;
      notes?: string;
    },
  ): Promise<Commission> {
    const { data } = await apiClient.put(`/commissions/${id}`, payload);
    return data;
  },
};