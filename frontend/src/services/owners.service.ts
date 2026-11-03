import apiClient from '@/lib/api-client';
import type { PropertyStatus, PropertyType, TransactionType } from '@/services/properties.service';
import type { TransactionStatus } from '@/services/transactions.service';

export interface OwnerOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

export interface Owner extends OwnerOption {
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  country?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { properties: number };
}

export interface OwnerDetail extends Owner {
  properties: {
    id: string;
    title: string;
    city: string;
    type: PropertyType;
    status: PropertyStatus;
    price: number | string;
    surface: number;
    isPublished: boolean;
  }[];
  transactions: {
    id: string;
    type: TransactionType;
    amount: number | string;
    date?: string | null;
    status: TransactionStatus;
    property?: { title: string; city: string } | null;
  }[];
}

export interface OwnerFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface OwnerList {
  data: Owner[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateOwnerDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

export type UpdateOwnerDto = Partial<CreateOwnerDto> & { isActive?: boolean };

export const ownersService = {
  async getOptions(): Promise<OwnerOption[]> {
    const { data } = await apiClient.get('/owners', { params: { limit: 100 } });
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  async getList(filters: OwnerFilters = {}): Promise<OwnerList> {
    const { data } = await apiClient.get('/owners', { params: filters });
    return data;
  },

  async getById(id: string): Promise<OwnerDetail> {
    const { data } = await apiClient.get(`/owners/${id}`);
    return data;
  },

  async create(payload: CreateOwnerDto): Promise<OwnerOption> {
    const { data } = await apiClient.post('/owners', payload);
    return data;
  },

  async update(id: string, payload: UpdateOwnerDto): Promise<Owner> {
    const { data } = await apiClient.put(`/owners/${id}`, payload);
    return data;
  },

  async deactivate(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/owners/${id}`);
    return data;
  },
};
