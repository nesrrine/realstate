
import apiClient from '@/lib/api-client';

export type TransactionType = 'SALE' | 'RENTAL';

export type TransactionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

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

  property?: {
    id: string;
    title: string;
    city: string;
  };

  client?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  owner?: {
    id: string;
    firstName: string;
    lastName: string;
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

/**
 * DTO DE CRÉATION
 */
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
  buyerCommissionRate?: number;
  sellerCommissionRate?: number;
  fieldAgentShareRate?: number;
  officeAgentShareRate?: number;

  createCommission?: boolean;
  notes?: string;
}

/**
 * DTO DE MODIFICATION
 * Correspond au UpdateTransactionDto du backend.
 */
export interface UpdateTransactionDto {
  amount?: number;
  date?: string;
  status?: TransactionStatus;
  notes?: string;
  fieldAgentId?: string;
  officeAgentId?: string;
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

/**
 * SERVICE TRANSACTIONS
 */
export const transactionsService = {
  /**
   * RÉCUPÉRER TOUTES LES TRANSACTIONS
   */
  async getAll(
    filters?: TransactionFilters,
  ): Promise<PaginatedTransactions> {
    const { data } = await apiClient.get('/transactions', {
      params: filters,
    });

    return data;
  },

  /**
   * RÉCUPÉRER UNE TRANSACTION PAR ID
   */
  async getById(id: string): Promise<Transaction> {
    const { data } = await apiClient.get(`/transactions/${id}`);

    return data;
  },

  /**
   * CRÉER UNE TRANSACTION
   */
  async create(
    payload: CreateTransactionDto,
  ): Promise<Transaction> {
    const { data } = await apiClient.post(
      '/transactions',
      payload,
    );

    return data;
  },

  /**
   * MODIFIER UNE TRANSACTION
   */
  async update(
    id: string,
    payload: UpdateTransactionDto,
  ): Promise<Transaction> {
    const { data } = await apiClient.put(
      `/transactions/${id}`,
      payload,
    );

    return data;
  },

  /**
   * SUPPRIMER UNE TRANSACTION
   */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },
};
