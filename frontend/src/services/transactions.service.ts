import apiClient from '@/lib/api-client';

export type TransactionType = 'SALE' | 'RENTAL';
export type TransactionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Transaction {
  id: string;
  propertyId: string;
  clientId: string;
  ownerId: string;
  fieldAgentId: string;
  officeAgentId: string;
  type: TransactionType;
  amount: number | string;
  date?: string | null;
  status: TransactionStatus;
  notes?: string | null;
  property?: { id: string; title: string; city: string };
  client?: { id: string; firstName: string; lastName: string };
  owner?: { id: string; firstName: string; lastName: string };
  fieldAgent?: { id: string; user: { firstName: string; lastName: string } };
  officeAgent?: { id: string; user: { firstName: string; lastName: string } };
  commission?: import('./commissions.service').Commission | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  search?: string;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  fieldAgentId?: string;
  officeAgentId?: string;
  propertyId?: string;
  clientId?: string;
}

export interface CreateTransactionDto {
  propertyId: string;
  clientId: string;
  ownerId: string;
  fieldAgentId: string;
  officeAgentId: string;
  transactionType: TransactionType;
  amount: number;
  date?: string;
  status?: TransactionStatus;
  commissionRate?: number;
  createCommission?: boolean;
  notes?: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export const transactionsService = {
  async getAll(filters?: TransactionFilters): Promise<PaginatedTransactions> {
    const { data } = await apiClient.get('/transactions', { params: filters });
    return data;
  },

  async getById(id: string): Promise<Transaction> {
    const { data } = await apiClient.get(`/transactions/${id}`);
    return data;
  },

  async create(payload: CreateTransactionDto): Promise<Transaction> {
    const { data } = await apiClient.post('/transactions', payload);
    return data;
  },

  async update(id: string, payload: Partial<CreateTransactionDto>): Promise<Transaction> {
    const { data } = await apiClient.put(`/transactions/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },
};
