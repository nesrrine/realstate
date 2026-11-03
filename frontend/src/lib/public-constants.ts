export const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Appartement',
  VILLA: 'Villa',
  HOUSE: 'Maison',
  LAND: 'Terrain',
  COMMERCIAL: 'Local commercial',
  OFFICE: 'Bureau',
  BUSINESS: 'Fonds de commerce',
  OTHER: 'Autre',
};

export const TRANSACTION_LABELS: Record<string, string> = {
  SALE: 'Vente',
  RENTAL: 'Location',
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SOLD: 'Vendu',
  RENTED: 'Loué',
  ARCHIVED: 'Archivé',
};


export const toNumber = (v: number | string | null | undefined): number => Number(v ?? 0);

export const formatPrice = (price: number | string | null | undefined): string => {
  const n = toNumber(price);
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)} M DT`;
  }
  return n.toLocaleString('fr-TN', { maximumFractionDigits: 0 });
};

export const formatArea = (surface: number | string | null | undefined): string => {
  const n = toNumber(surface);
  return `${n.toLocaleString('fr-TN')} m²`;
};

export function getCoverImage(images: { url: string; isCover?: boolean }[] | undefined): string {
  if (!images || images.length === 0) return '/images/placeholder-property.jpg';
  const cover = images.find((img) => img.isCover);
  return (cover || images[0]).url;
}

export function fullName(p?: { firstName: string; lastName: string } | null): string {
  return p ? `${p.firstName} ${p.lastName}`.trim() : '—';
}