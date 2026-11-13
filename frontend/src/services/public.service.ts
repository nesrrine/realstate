
import axios from 'axios';
import type { LandZoning, TitleType } from './properties.service';
import type { ChatListing, ChatTurn, SearchFilters } from './ai.service';

// Client API public (sans authentification)
const publicApi = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:3001/api',
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
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  officeAgent: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
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

export type ContactType =
  | 'achat'
  | 'location'
  | 'vente'
  | 'estimation'
  | 'autre';

export interface ContactPayload {
  name: string;
  phone: string;
  email?: string;
  type: ContactType;
  message: string;
  propertyId?: string;
  website?: string;
}

export const publicService = {
  async getAgency(): Promise<PublicAgency> {
    const { data } = await publicApi.get('/public/agency');
    return data;
  },

  async sendContact(
    payload: ContactPayload
  ): Promise<{ ok: boolean }> {
    const { data } = await publicApi.post(
      '/public/contact',
      payload
    );
    return data;
  },

  async aiSearch(query: string): Promise<SearchFilters> {
    const { data } = await publicApi.post(
      '/public/ai/search',
      { query },
      { timeout: 60_000 }
    );
    return data.filters;
  },

  async aiChat(
    messages: ChatTurn[]
  ): Promise<{
    reply: string;
    properties: ChatListing[];
    leadCreated: boolean;
  }> {
    const { data } = await publicApi.post(
      '/public/ai/chat',
      { messages },
      { timeout: 90_000 }
    );
    return data;
  },

  async getProperties(
    filters: PropertyFilters = {}
  ): Promise<PropertiesResponse> {
    const params = new URLSearchParams();

    // Pagination
    params.set(
      'page',
      String(Math.max(1, Math.floor(Number(filters.page) || 1)))
    );

    params.set(
      'limit',
      String(
        Math.min(
          100,
          Math.max(1, Math.floor(Number(filters.limit) || 12))
        )
      )
    );

    // Filtres de recherche
    Object.entries(filters).forEach(([key, value]) => {
      if (
        key === 'page' ||
        key === 'limit' ||
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return;
      }

      params.set(key, String(value));
    });

    // Site public : uniquement les biens publiés
    params.set('isPublished', 'true');

    const response = await publicApi.get<PropertiesResponse>(
      '/public/properties',
      {
        params,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );

    const result = response.data;

    if (!result || !Array.isArray(result.data) || !result.meta) {
      throw new Error('Réponse API des biens invalide');
    }

    return result;
  },

  async getPropertyById(id: string): Promise<Property> {
    const { data } = await publicApi.get(
      `/public/properties/${encodeURIComponent(id)}`
    );
    return data;
  },
};
