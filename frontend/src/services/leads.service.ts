import apiClient from '@/lib/api-client';
import type { PaginatedResponse } from '@/services/properties.service';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'A_CONTACT' | 'QUALIFIED' | 'VISIT_SCHEDULED' | 'NEGOTIATION' | 'WON' | 'LOST';

export type LeadSource = 'WEBSITE' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'PHONE' | 'WALK_IN' | 'REFERRAL' | 'OTHER';

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  A_CONTACT: 'A contacté',
  QUALIFIED: 'Qualifié',
  VISIT_SCHEDULED: 'Visite programmée',
  NEGOTIATION: 'Négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
};

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: 'Site web',
  WHATSAPP: 'WhatsApp',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  PHONE: 'Téléphone',
  WALK_IN: 'Sur place',
  REFERRAL: 'Parrainage',
  OTHER: 'Autre',
};

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'bg-blue-500',
  CONTACTED: 'bg-indigo-500',
  A_CONTACT: 'bg-emerald-500',
  QUALIFIED: 'bg-purple-500',
  VISIT_SCHEDULED: 'bg-amber-500',
  NEGOTIATION: 'bg-orange-500',
  WON: 'bg-green-500',
  LOST: 'bg-red-500',
};

export interface Lead {
  id: string;
  clientId: string;
  agentId: string;
  status: LeadStatus;
  source: LeadSource;
  notes?: string | null;
  budget?: number | null;
  lostReason?: string | null;
  wonDate?: string | null;
  lostDate?: string | null;
  nextFollowUp?: string | null;
  createdAt: string;
  updatedAt: string;
  activities?: Array<{
    id: string;
    type: string;
    notes?: string;
    createdAt: string;
  }>;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  properties?: Array<{
    id: string;
    property: {
      id: string;
      title: string;
      city: string;
      price: number;
      status: string;
    };
  }>;
  agent?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  source?: LeadSource;
  agentId?: string;
  clientId?: string;
  propertyId?: string;
}

export interface CreateLeadDto {
  clientId: string;
  propertyId?: string;
  propertyIds?: string[];
  agentId?: string;
  status?: LeadStatus;
  source?: LeadSource;
  notes?: string;
  budget?: number;
}

export interface UpdateLeadDto {
  status?: LeadStatus;
  source?: LeadSource;
  notes?: string;
  budget?: number;
}

export const leadsService = {
  async getAll(filters?: LeadFilters): Promise<PaginatedResponse<Lead>> {
    const { data } = await apiClient.get('/leads', { params: filters });
    return data;
  },

  async getById(id: string): Promise<Lead> {
    const { data } = await apiClient.get(`/leads/${id}`);
    return data;
  },

  async create(payload: CreateLeadDto): Promise<Lead> {
    const { data } = await apiClient.post('/leads', payload);
    return data;
  },

  async update(id: string, payload: UpdateLeadDto): Promise<Lead> {
    const { data } = await apiClient.put(`/leads/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/leads/${id}`);
    return data;
  },

  get statusLabels() {
    return LEAD_STATUS_LABELS;
  },
  get sourceLabels() {
    return LEAD_SOURCE_LABELS;
  },
  get statusColors() {
    return LEAD_STATUS_COLORS;
  },
};
