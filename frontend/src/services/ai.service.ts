import apiClient from '@/lib/api-client';
import type { LandZoning, PropertyType, TitleType, TransactionType } from '@/services/properties.service';
import type { FollowUpStatus } from '@/services/clients.service';

export type AiLanguage = 'fr' | 'ar' | 'tn';

export const AI_LANGUAGE_LABELS: Record<AiLanguage, string> = {
  fr: 'Français',
  ar: 'Arabe',
  tn: 'Derja',
};

export interface PropertyDraft {
  title: string;
  type: PropertyType | null;
  transactionType: TransactionType | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  city: string | null;
  district: string | null;
  address: string | null;
  parking: boolean | null;
  furnished: boolean | null;
  elevator: boolean | null;
  balcony: boolean | null;
  garden: boolean | null;
  cellar: boolean | null;
  titleType: TitleType | null;
  charges: number | null;
  landFrontage: number | null;
  landDepth: number | null;
  landZoning?: LandZoning | null;
  businessActivity: string | null;
  businessDailyRevenue: number | null;
  commercialMonthlyRevenue: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  missing: string[];
}

export interface MatchedProperty {
  id: string;
  score: number;
  reason: string;
  property: {
    id: string;
    title: string;
    type: PropertyType;
    transactionType: TransactionType;
    price: number | string;
    surface: number;
    bedrooms?: number | null;
    city: string;
    district?: string | null;
    coverUrl: string | null;
  };
}

export interface MatchedClient {
  id: string;
  score: number;
  reason: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    budgetMax?: number | string | null;
    followUpStatus?: FollowUpStatus;
  };
}

export interface VisitReport {
  report: string;
  interest: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  followUpStatus: FollowUpStatus;
  nextFollowUpInDays: number | null;
  nextFollowUpAt: string | null;
  nextStep: string;
  clientId: string;
}

export interface PriceEstimate {
  low: number;
  high: number;
  recommended: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  currentPrice: number;
  comparablesCount: number;
  medianPricePerSqm: number | null;
}

export interface SearchFilters {
  type: PropertyType | null;
  transactionType: TransactionType | null;
  city: string | null;
  district: string | null;
  priceMin: number | null;
  priceMax: number | null;
  surfaceMin: number | null;
  surfaceMax: number | null;
  search: string | null;
}

export interface ChatListing {
  id: string;
  title: string;
  type: PropertyType;
  transactionType: TransactionType;
  price: number;
  surface: number;
  bedrooms?: number | null;
  city: string;
  district?: string | null;
  coverUrl: string | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Les appels IA peuvent prendre plusieurs secondes
const AI_TIMEOUT = 90_000;

export const aiService = {
  async propertyDescription(property: Record<string, unknown>, language: AiLanguage) {
    const { data } = await apiClient.post('/ai/property-description', { property, language }, { timeout: AI_TIMEOUT });
    return data as { description: string };
  },

  async propertyFromText(text: string) {
    const { data } = await apiClient.post('/ai/property-from-text', { text }, { timeout: AI_TIMEOUT });
    return data as PropertyDraft;
  },

  async matchForClient(clientId: string) {
    const { data } = await apiClient.get(`/ai/match/client/${clientId}`, { timeout: AI_TIMEOUT });
    return data as { matches: MatchedProperty[] };
  },

  async matchForProperty(propertyId: string) {
    const { data } = await apiClient.get(`/ai/match/property/${propertyId}`, { timeout: AI_TIMEOUT });
    return data as { matches: MatchedClient[] };
  },

  async visitMessage(visitId: string, language: AiLanguage) {
    const { data } = await apiClient.post(`/ai/visits/${visitId}/message`, { language }, { timeout: AI_TIMEOUT });
    return data as { message: string; whatsappNumber: string | null };
  },

  async visitReport(visitId: string, notes: string) {
    const { data } = await apiClient.post(`/ai/visits/${visitId}/report`, { notes }, { timeout: AI_TIMEOUT });
    return data as VisitReport;
  },

  async priceEstimate(propertyId: string) {
    const { data } = await apiClient.get(`/ai/price-estimate/${propertyId}`, { timeout: AI_TIMEOUT });
    return data as PriceEstimate;
  },
};

/** Lien WhatsApp pré-rempli (wa.me). */
export const whatsappLink = (number: string | null, text: string) => {
  // wa.me exige le format international : numéro tunisien à 8 chiffres → 216XXXXXXXX
  let digits = (number ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (digits.length === 8) digits = `216${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};
