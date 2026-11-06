import apiClient from '@/lib/api-client';

// ── Enums (identiques à schema.prisma) ──────────────────────────────
export type PropertyType =
  | 'APARTMENT'
  | 'VILLA'
  | 'HOUSE'
  | 'LAND'
  | 'COMMERCIAL'
  | 'OFFICE'
  | 'BUSINESS'
  | 'OTHER';

export type PropertyStatus =
  | 'DRAFT'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'SOLD'
  | 'RENTED'
  | 'ARCHIVED';

export type TransactionType = 'SALE' | 'RENTAL';

export type TitleType = 'INDIVIDUAL' | 'COLLECTIVE' | 'IN_PROGRESS' | 'NONE';

export type LandZoning =
  | 'RESIDENTIAL'
  | 'AGRICULTURAL'
  | 'INDUSTRIAL'
  | 'TOURISTIC'
  | 'MIXED';

// ── Modèles ─────────────────────────────────────────────────────────
export interface PropertyImage {
  id: string;
  url: string;
  altText?: string | null;
  isCover: boolean;
  order: number;
}

export interface PropertyDocument {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  originalName?: string | null;
  category?: string | null;
  createdAt: string;
}

export interface Property {
  id: string;
  reference: string;
  titleDeedNumber?: string | null;
  title: string;
  description?: string | null;
  type: PropertyType;
  transactionType: TransactionType;
  status: PropertyStatus;
  address: string;
  city: string;
  district?: string | null;
  zipCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
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
  price: number | string; // Prisma Decimal est sérialisé en string
  notes?: string | null;
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
  agent?: {
    id: string;
    user: { firstName: string; lastName: string; email: string; phone?: string | null };
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
  images: PropertyImage[];
  documents?: PropertyDocument[];
  _count?: {
    /** Visites du bien (hors annulées et absences) */
    visitProperties: number;
  };
}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: PropertyType;
  transactionType?: TransactionType;
  status?: PropertyStatus;
  city?: string;
  district?: string;
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  agentId?: string;
  isPublished?: boolean;
  sortBy?: 'price' | 'surface' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface PropertyPayload {
  title: string;
  description?: string;
  type: PropertyType;
  transactionType: TransactionType;
  status?: PropertyStatus;
  address: string;
  city: string;
  district?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  surface: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  parking?: boolean;
  furnished?: boolean;
  elevator?: boolean;
  balcony?: boolean;
  garden?: boolean;
  cellar?: boolean;
  titleType?: TitleType;
  commercialMonthlyRevenue?: number;
  commercialLeased?: boolean;
  commercialFrontage?: number;
  commercialCeilingHeight?: number;
  commercialMezzanine?: boolean;
  landFrontage?: number;
  landDepth?: number;
  landCos?: number;
  landCuf?: number;
  landZoning?: LandZoning;
  landServiced?: boolean;
  landCorner?: boolean;
  businessActivity?: string;
  businessDailyRevenue?: number;
  businessRent?: number;
  businessEmployees?: number;
  price: number;
  charges?: number;
  deposit?: number;
  notes?: string;
  titleDeedNumber?: string;
  isPublished?: boolean;
  ownerId: string;
  agentId?: string;
}
export type PropertyUpdatePayload = {
  [K in keyof PropertyPayload]?: PropertyPayload[K] | null;
};
// ── Utilitaire ──────────────────────────────────────────────────────
// Supprime les champs vides pour ne pas envoyer "" ou NaN au backend.
// Les booléens (false) sont conservés.
const clean = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) =>
        v !== '' &&
        v !== undefined &&
        v !== null &&
        !(typeof v === 'number' && Number.isNaN(v)),
    ),
  ) as Partial<T>;
const cleanKeepNull = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== '' && v !== undefined && !(typeof v === 'number' && Number.isNaN(v)),
    ),
  ) as Partial<T>;
// ── Service ─────────────────────────────────────────────────────────
export const propertiesService = {
  async getAll(filters?: PropertyFilters): Promise<PaginatedResponse<Property>> {
    const { data } = await apiClient.get('/properties', {
      params: clean(filters ?? {}),
    });
    return data;
  },

  async getById(id: string): Promise<Property> {
    const { data } = await apiClient.get(`/properties/${id}`);
    return data;
  },

  async create(payload: PropertyPayload): Promise<Property> {
    const { data } = await apiClient.post('/properties', clean(payload));
    return data;
  },

   async update(id: string, payload: PropertyUpdatePayload): Promise<Property> {
    const { data } = await apiClient.put(`/properties/${id}`, cleanKeepNull(payload));
    return data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/properties/${id}`);
    return data;
  },

  publish(id: string): Promise<Property> {
    return propertiesService.update(id, { isPublished: true });
  },

  unpublish(id: string): Promise<Property> {
    return propertiesService.update(id, { isPublished: false });
  },

  // ── Images ────────────────────────────────────────────────────────
  async getImages(propertyId: string): Promise<PropertyImage[]> {
    const { data } = await apiClient.get(`/properties/${propertyId}/images`);
    return data;
  },

  // Le backend accepte 10 fichiers max par requête → envoi par lots
  async uploadImages(propertyId: string, files: File[]): Promise<PropertyImage[]> {
    const result: PropertyImage[] = [];
    for (let i = 0; i < files.length; i += 10) {
      const formData = new FormData();
      files.slice(i, i + 10).forEach((f) => formData.append('files', f));
      const { data } = await apiClient.post(
        `/properties/${propertyId}/images/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      result.push(...data);
    }
    return result;
  },

  async deleteImage(propertyId: string, imageId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/properties/${propertyId}/images/${imageId}`);
    return data;
  },

  // renvoie la liste complète des images
  async setCoverImage(propertyId: string, imageId: string): Promise<PropertyImage[]> {
    const { data } = await apiClient.patch(`/properties/${propertyId}/images/${imageId}/cover`);
    return data;
  },

  // le 1er ID devient la photo principale ; il faut envoyer TOUS les IDs
  async reorderImages(propertyId: string, imageIds: string[]): Promise<PropertyImage[]> {
    const { data } = await apiClient.patch(`/properties/${propertyId}/images/reorder`, { imageIds });
    return data;
  },

  // ── Télécharger toutes les images en ZIP ──────────────────────────
  async downloadImagesZip(propertyId: string): Promise<Blob> {
    const { data } = await apiClient.get(`/properties/${propertyId}/images/download-zip`, {
      responseType: 'blob',
    });
    return data;
  },

  // ── Documents ──────────────────────────────────────────────────────
  async uploadDocument(
    propertyId: string,
    file: File,
    title: string,
    description?: string,
    category?: string,
  ): Promise<PropertyDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (category) formData.append('category', category);

    const { data } = await apiClient.post(
      `/properties/${propertyId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async deleteDocument(propertyId: string, documentId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(
      `/properties/${propertyId}/documents/${documentId}`,
    );
    return data;
  },

  // ── Télécharger un document unique ───────────────────────────────
  async downloadDocument(propertyId: string, documentId: string): Promise<Blob> {
    const { data } = await apiClient.get(
      `/properties/${propertyId}/documents/${documentId}/download`,
      { responseType: 'blob' },
    );
    return data;
  },

  // ── Télécharger tous les documents en ZIP ──────────────────────────
  async downloadDocumentsZip(propertyId: string): Promise<Blob> {
    const { data } = await apiClient.get(`/properties/${propertyId}/documents/download-zip`, {
      responseType: 'blob',
    });
    return data;
  },
};


