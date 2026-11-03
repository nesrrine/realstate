import axios from 'axios';
import type { LandZoning, TitleType } from './properties.service';
import type { ChatListing, ChatTurn, SearchFilters } from './ai.service';

// Client API public (sans authentification) pour le site vitrine
const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface PropertyImage {
  id: string;
  url: string;
  altText?: string | null;
  isCover: boolean;
  order: number;
}

export interface Property {
  id: string;
  reference: string;
  title: string;
  description?: string | null;
  type: string;
  transactionType: 'SALE' | 'RENTAL';
  status: string;
  address: string;
  city: string;
  district?: string | null;
  zipCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  surface: number;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  parking: boolean;
  furnished: boolean;
  elevator: boolean;
  balcony: boolean;
  garden: boolean;
  cellar: boolean;
  titleType?: TitleType | null;
  commercialMonthlyRevenue?: number | string | null;
  commercialLeased?: boolean;
  commercialFrontage?: number | null;
  commercialCeilingHeight?: number | null;
  commercialMezzanine?: boolean;
  landFrontage?: number | null;
  landDepth?: number | null;
  landCos?: number | null;
  landCuf?: number | null;
  landZoning?: LandZoning | null;
  landServiced?: boolean;
  landCorner?: boolean;
  businessActivity?: string | null;
  businessDailyRevenue?: number | string | null;
  businessRent?: number | string | null;
  businessEmployees?: number | null;
  price: number | string;
  pricePerSqm?: number | string | null;
  charges?: number | string | null;
  deposit?: number | string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  fieldAgent: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
  };
  officeAgent: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
  images: PropertyImage[];
  _count?: {
    visits: number;
  };
}

export interface PropertiesResponse {
  data: Property[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  transactionType?: 'SALE' | 'RENTAL';
  status?: string;
  city?: string;
  district?: string;
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  sortBy?: 'price' | 'surface' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PublicAgency {
  name: string;
  address: string;
  mapsUrl: string;
  phone: string;
}

export type ContactType = 'achat' | 'location' | 'vente' | 'estimation' | 'autre';

export interface ContactPayload {
  name: string;
  phone: string;
  email?: string;
  type: ContactType;
  message: string;
  propertyId?: string;
  /** Champ piège anti-robot : doit rester vide */
  website?: string;
}

export const publicService = {
  /** Coordonnées de l'agence (Paramètres du CRM) */
  async getAgency(): Promise<PublicAgency> {
    const { data } = await publicApi.get('/public/agency');
    return data;
  },

  /** Formulaire de contact → lead dans le CRM, l'agent est notifié */
  async sendContact(payload: ContactPayload): Promise<{ ok: boolean }> {
    const { data } = await publicApi.post('/public/contact', payload);
    return data;
  },

  /** Recherche en langage naturel → filtres de la page « Nos biens ». */
  async aiSearch(query: string): Promise<SearchFilters> {
    const { data } = await publicApi.post('/public/ai/search', { query }, { timeout: 60_000 });
    return data.filters;
  },

  /** Assistant du site : réponse + annonces mises en avant. */
  async aiChat(messages: ChatTurn[]): Promise<{ reply: string; properties: ChatListing[]; leadCreated: boolean }> {
    const { data } = await publicApi.post('/public/ai/chat', { messages }, { timeout: 90_000 });
    return data;
  },

  async getProperties(filters?: PropertyFilters): Promise<PropertiesResponse> {
    const params: Record<string, unknown> = {};
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params[k] = v;
        }
      });
    }
    // For public site: only published properties
    params.isPublished = true;
    const { data } = await publicApi.get('/public/properties', { params });
    return data;
  },

  async getPropertyById(id: string): Promise<Property> {
    const { data } = await publicApi.get(`/public/properties/${id}`);
    return data;
  },
};