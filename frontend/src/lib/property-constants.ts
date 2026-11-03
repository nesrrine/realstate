import type { LandZoning, PropertyStatus, PropertyType, TitleType, TransactionType } from '@/services/properties.service';
import type { TransactionStatus } from '@/services/transactions.service';
import type { ClientType } from '@/services/clients.service';

export const PROPERTY_TYPES = [
  'APARTMENT', 'VILLA', 'HOUSE', 'LAND', 'COMMERCIAL', 'OFFICE', 'BUSINESS', 'OTHER',
] as const;
export const PROPERTY_STATUSES = [
  'DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'ARCHIVED',
] as const;
export const TRANSACTION_TYPES = ['SALE', 'RENTAL'] as const;

export const TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Appartement',
  VILLA: 'Villa',
  HOUSE: 'Maison',
  LAND: 'Terrain',
  COMMERCIAL: 'Local commercial',
  OFFICE: 'Bureau',
  BUSINESS: 'Fonds de commerce',
  OTHER: 'Autre',
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  DRAFT: 'Brouillon',
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SOLD: 'Vendu',
  RENTED: 'Loué',
  ARCHIVED: 'Archivé',
};

export const STATUS_STYLES: Record<PropertyStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  AVAILABLE: 'bg-green-100 text-green-700 border-green-200',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-200',
  SOLD: 'bg-blue-100 text-blue-700 border-blue-200',
  RENTED: 'bg-purple-100 text-purple-700 border-purple-200',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  SALE: 'Vente',
  RENTAL: 'Location',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Finalisée',
  CANCELLED: 'Annulée',
};

export const TRANSACTION_STATUS_STYLES: Record<TransactionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

export const typeOptions = PROPERTY_TYPES.map((v) => ({ value: v, label: TYPE_LABELS[v] }));
export const statusOptions = PROPERTY_STATUSES.map((v) => ({ value: v, label: STATUS_LABELS[v] }));
export const transactionOptions = TRANSACTION_TYPES.map((v) => ({ value: v, label: TRANSACTION_LABELS[v] }));

export const TITLE_TYPE_LABELS: Record<TitleType, string> = {
  INDIVIDUAL: 'Titre individuel',
  COLLECTIVE: 'Titre collectif (indivision)',
  IN_PROGRESS: 'Titre en cours',
  NONE: 'Sans titre (contrat / acte)',
};
export const titleTypeOptions = (Object.keys(TITLE_TYPE_LABELS) as TitleType[]).map((v) => ({
  value: v,
  label: TITLE_TYPE_LABELS[v],
}));

export const LAND_ZONING_LABELS: Record<LandZoning, string> = {
  RESIDENTIAL: "Zone d'habitat",
  AGRICULTURAL: 'Agricole',
  INDUSTRIAL: 'Industrielle',
  TOURISTIC: 'Touristique',
  MIXED: 'Mixte / commerciale',
};
export const landZoningOptions = (Object.keys(LAND_ZONING_LABELS) as LandZoning[]).map((v) => ({
  value: v,
  label: LAND_ZONING_LABELS[v],
}));

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  BUYER: 'Acheteur',
  SELLER: 'Vendeur',
  RENTER: 'Locataire',
};

export const CLIENT_TYPE_STYLES: Record<ClientType, string> = {
  BUYER: 'bg-blue-100 text-blue-700 border-blue-200',
  SELLER: 'bg-green-100 text-green-700 border-green-200',
  RENTER: 'bg-purple-100 text-purple-700 border-purple-200',
};

export const clientTypeOptions = Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

// Prisma Decimal arrive en string dans le JSON
export const toNumber = (v: number | string | null | undefined) => Number(v ?? 0);

export const fullName = (p?: { firstName: string; lastName: string } | null) =>
  p ? `${p.firstName} ${p.lastName}`.trim() : '—';

/** Nombre de visites du bien (l'API compte les liens visite ↔ bien, hors annulées et absences). */
export function getVisitsCount(property: { _count?: { visitProperties?: number } }): number {
  return property._count?.visitProperties ?? 0;
}