import apiClient from '@/lib/api-client';

export type CashEntryType = 'VISIT_FEE' | 'EXPENSE';
export type ExpenseCategory =
  | 'TRANSPORT'
  | 'FUEL'
  | 'PHONE'
  | 'OFFICE'
  | 'ADVERTISING'
  | 'MEAL'
  | 'OTHER';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRANSPORT: 'Transport',
  FUEL: 'Carburant',
  PHONE: 'Téléphone',
  OFFICE: 'Fournitures / bureau',
  ADVERTISING: 'Publicité',
  MEAL: 'Repas',
  OTHER: 'Autre',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  TRANSFER: 'Virement',
  CHECK: 'Chèque',
};

export interface CashEntry {
  id: string;
  type: CashEntryType;
  date: string;
  amount: number | string;
  label: string;
  category?: ExpenseCategory | null;
  paymentMethod?: PaymentMethod | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string };
  visit?: {
    id: string;
    scheduledAt: string;
    client?: { id: string; firstName: string; lastName: string } | null;
    properties: { property: { title: string } }[];
  } | null;
}

export interface CashTotals {
  visitFees: number;
  expenses: number;
  balance: number;
}

export interface CashDay {
  date: string;
  entries: CashEntry[];
  totals: CashTotals;
}

export interface CashSummary {
  from: string;
  to: string;
  days: (CashTotals & { date: string; count: number })[];
  totals: CashTotals;
}

export interface CashVisitOption {
  id: string;
  scheduledAt: string;
  status: string;
  client: { firstName: string; lastName: string };
  properties: { property: { title: string } }[];
  feePaid: boolean;
  feeAmount: number;
}

/** Frais de visite standard (DT), identique au backend. */
export const DEFAULT_VISIT_FEE = 20;

export interface CreateCashEntryDto {
  type: CashEntryType;
  date: string;
  amount: number;
  label: string;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  visitId?: string;
}

export const cashService = {
  async getAccess(): Promise<boolean> {
    const { data } = await apiClient.get('/cash/access');
    return !!data?.allowed;
  },

  async setAgentAccess(agentId: string, enabled: boolean) {
    const { data } = await apiClient.put(`/cash/access/${agentId}`, { enabled });
    return data as { id: string; canManageCash: boolean };
  },

  async getDay(date: string): Promise<CashDay> {
    const { data } = await apiClient.get('/cash/day', { params: { date } });
    return data;
  },

  async getSummary(from: string, to: string): Promise<CashSummary> {
    const { data } = await apiClient.get('/cash/summary', { params: { from, to } });
    return data;
  },

  async getVisitsOfDay(date: string): Promise<CashVisitOption[]> {
    const { data } = await apiClient.get('/cash/visits', { params: { date } });
    return data;
  },

  async setVisitFee(
    visitId: string,
    payload: { paid: boolean; date: string; amount?: number; paymentMethod?: PaymentMethod },
  ) {
    const { data } = await apiClient.put(`/cash/visits/${visitId}/fee`, payload);
    return data as { visitId: string; feePaid: boolean; feeAmount: number };
  },

  async create(payload: CreateCashEntryDto): Promise<CashEntry> {
    const { data } = await apiClient.post('/cash', payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete(`/cash/${id}`);
    return data;
  },
};
