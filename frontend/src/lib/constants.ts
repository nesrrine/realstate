export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
} as const;

export const ROLE_LABELS: Record<keyof typeof ROLES, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Gérant',
  AGENT: 'Agent',
};

// Nom réel du cookie utilisé par AuthProvider, api-client et middleware
export const AUTH_COOKIE = 'auth_token';

export const CLIENT_TYPES = {
  PROSPECT: 'Prospect',
  CONFIRMED: 'Client confirmé',
} as const;

export const PROPERTY_TYPES = {
  APARTMENT: 'Appartement',
  VILLA: 'Villa',
  HOUSE: 'Maison',
  LAND: 'Terrain',
  COMMERCIAL: 'Commercial',
  OFFICE: 'Bureau',
  BUSINESS: 'Fonds de commerce',
  OTHER: 'Autre',
} as const;

export const PROPERTY_STATUS = {
  DRAFT: 'Brouillon',
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SOLD: 'Vendu',
  RENTED: 'Loué',
  ARCHIVED: 'Archivé',
} as const;

export const LEAD_STATUS = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUALIFIED: 'Qualifié',
  VISIT_SCHEDULED: 'Visite planifiée',
  NEGOTIATION: 'Négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
} as const;