import apiClient from '@/lib/api-client';
import type { Property } from './properties.service';

export const STUDIO_TEMPLATES = ['BLUE_PREMIUM', 'BLUE_MODERN', 'LUXURY', 'MINIMAL', 'FLASH_SALE'] as const;
export const STUDIO_FORMATS = ['PORTRAIT', 'STORY', 'SQUARE'] as const;
export const STUDIO_STATUSES = ['DRAFT', 'EXPORTED', 'SHARED'] as const;
export const STUDIO_PLATFORMS = ['WHATSAPP', 'FACEBOOK', 'COPY', 'ZIP', 'DOWNLOAD'] as const;

export type StudioTemplate = (typeof STUDIO_TEMPLATES)[number];
export type StudioFormat = (typeof STUDIO_FORMATS)[number];
export type StudioStatus = (typeof STUDIO_STATUSES)[number];
export type StudioPlatform = (typeof STUDIO_PLATFORMS)[number];

export interface StudioCreation {
  id: string;
  propertyId: string;
  title: string;
  template: StudioTemplate;
  format: StudioFormat;
  imageUrls: string[];
  descriptionFr?: string | null;
  descriptionTn?: string | null;
  descriptionIg?: string | null;
  status: StudioStatus;
  platform?: StudioPlatform | null;
  shareUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  property: Property;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
}

export interface StudioListResponse {
  data: StudioCreation[];
  total: number;
}

export interface StudioStats {
  total: number;
  exported: number;
  shared: number;
}

export const studioService = {
  async create(payload: Partial<StudioCreation> & { propertyId: string; template: StudioTemplate; format: StudioFormat }): Promise<StudioCreation> {
    const { data } = await apiClient.post('/studio', payload);
    return data;
  },

  async list(filters?: { template?: string; propertyId?: string; status?: string }): Promise<StudioListResponse> {
    const { data } = await apiClient.get('/studio', { params: filters });
    return data;
  },

  async stats(): Promise<StudioStats> {
    const { data } = await apiClient.get('/studio/stats');
    return data;
  },

  async detail(id: string): Promise<StudioCreation> {
    const { data } = await apiClient.get(`/studio/${id}`);
    return data;
  },

  async update(id: string, payload: Partial<StudioCreation>): Promise<StudioCreation> {
    const { data } = await apiClient.put(`/studio/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/studio/${id}`);
    return data;
  },
};

export const TEMPLATE_LABELS: Record<StudioTemplate, string> = {
  BLUE_PREMIUM: 'Blue Premium',
  BLUE_MODERN: 'Blue Modern',
  LUXURY: 'Luxury',
  MINIMAL: 'Minimal',
  FLASH_SALE: 'Flash Sale',
};

export const FORMAT_LABELS: Record<StudioFormat, string> = {
  PORTRAIT: 'Portrait 1080×1350',
  STORY: 'Story 1080×1920',
  SQUARE: 'Carré 1080×1080',
};

export const FORMAT_DIMENSIONS: Record<StudioFormat, { w: number; h: number }> = {
  PORTRAIT: { w: 1080, h: 1350 },
  STORY: { w: 1080, h: 1920 },
  SQUARE: { w: 1080, h: 1080 },
};