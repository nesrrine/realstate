import type { PropertyType, TransactionType } from '@/services/properties.service';

export type FieldKey =
  | 'rooms' | 'bedrooms' | 'bathrooms' | 'floor' | 'totalFloors'
  | 'parking' | 'furnished' | 'elevator' | 'balcony' | 'garden' | 'cellar'
  | 'charges' | 'deposit'
  | 'commercialMonthlyRevenue' | 'commercialLeased' | 'commercialFrontage'
  | 'commercialCeilingHeight' | 'commercialMezzanine'
  | 'landFrontage' | 'landDepth' | 'landCos' | 'landCuf' | 'landZoning'
  | 'landServiced' | 'landCorner'
  | 'businessActivity' | 'businessDailyRevenue' | 'businessRent' | 'businessEmployees';

// Champs génériques (le type « Autre » les propose tous)
const GENERIC_FIELDS: FieldKey[] = [
  'rooms', 'bedrooms', 'bathrooms', 'floor', 'totalFloors',
  'parking', 'furnished', 'elevator', 'balcony', 'garden', 'cellar',
  'charges', 'deposit',
];

export const COMMERCIAL_FIELDS: FieldKey[] = [
  'commercialMonthlyRevenue', 'commercialLeased', 'commercialFrontage',
  'commercialCeilingHeight', 'commercialMezzanine',
];

export const LAND_FIELDS: FieldKey[] = [
  'landFrontage', 'landDepth', 'landCos', 'landCuf', 'landZoning', 'landServiced', 'landCorner',
];

export const BUSINESS_FIELDS: FieldKey[] = [
  'businessActivity', 'businessDailyRevenue', 'businessRent', 'businessEmployees',
];

const BY_TYPE: Record<PropertyType, FieldKey[]> = {
  APARTMENT: ['rooms', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'parking', 'furnished',
    'elevator', 'balcony', 'cellar', 'charges', 'deposit'],
  VILLA: ['rooms', 'bedrooms', 'bathrooms', 'totalFloors', 'parking', 'furnished',
    'balcony', 'garden', 'cellar', 'charges', 'deposit'],
  HOUSE: ['rooms', 'bedrooms', 'bathrooms', 'totalFloors', 'parking', 'furnished',
    'balcony', 'garden', 'cellar', 'charges', 'deposit'],
  LAND: LAND_FIELDS,
  COMMERCIAL: ['rooms', 'bathrooms', 'floor', 'parking', 'elevator', 'cellar',
    'charges', 'deposit', ...COMMERCIAL_FIELDS],
  OFFICE: ['rooms', 'bathrooms', 'floor', 'totalFloors', 'parking', 'elevator', 'furnished',
    'cellar', 'charges', 'deposit'],
  BUSINESS: ['bathrooms', 'floor', 'parking', 'charges', 'deposit', ...BUSINESS_FIELDS],
  OTHER: GENERIC_FIELDS,
};

export function getVisibleFields(type: PropertyType, transactionType: TransactionType): Set<FieldKey> {
  const set = new Set(BY_TYPE[type]);
  if (transactionType !== 'RENTAL') set.delete('deposit'); // dépôt = location seulement
  return set;
}

// Libellés adaptés au type
export function fieldLabel(field: FieldKey, type: PropertyType): string {
  const office = type === 'OFFICE' || type === 'COMMERCIAL' || type === 'BUSINESS';
  switch (field) {
    case 'rooms': return office ? 'Nombre de pièces / espaces' : 'Pièces';
    case 'bathrooms': return office ? 'Sanitaires' : 'Salles de bain';
    case 'floor': return 'Étage';
    case 'totalFloors': return type === 'VILLA' || type === 'HOUSE' ? "Nombre d'étages" : "Étages de l'immeuble";
    default: return field;
  }
}

export const surfaceLabel = (type: PropertyType) =>
  type === 'LAND' ? 'Surface du terrain (m²)' : 'Surface (m²)';

export const priceLabel = (t: TransactionType) =>
  t === 'RENTAL' ? 'Loyer mensuel' : 'Prix de vente';