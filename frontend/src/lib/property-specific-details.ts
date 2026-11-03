import type { LandZoning, TitleType } from '@/services/properties.service';
import { formatPrice } from '@/lib/format';
import { LAND_ZONING_LABELS, TITLE_TYPE_LABELS } from '@/lib/property-constants';

// Titre de propriété + champs propres à certains types (communs aux fiches CRM et publique)
interface SpecificFields {
  type: string;
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
}

export interface DetailRow {
  label: string;
  value: string;
}

const has = <T,>(v: T | null | undefined): v is T => v !== null && v !== undefined && v !== '';

const meters = (v: number) => `${v.toLocaleString('fr-FR')} m`;

/** Lignes à afficher (seulement les valeurs renseignées). */
export function getSpecificDetails(p: SpecificFields): DetailRow[] {
  const rows: DetailRow[] = [];

  if (has(p.titleType)) rows.push({ label: 'Titre', value: TITLE_TYPE_LABELS[p.titleType] ?? p.titleType });

  if (p.type === 'COMMERCIAL') {
    if (has(p.commercialMonthlyRevenue))
      rows.push({ label: 'Revenu par mois', value: formatPrice(Number(p.commercialMonthlyRevenue)) });
    if (p.commercialLeased) rows.push({ label: 'Actuellement loué', value: 'Oui' });
    if (has(p.commercialFrontage)) rows.push({ label: 'Façade vitrine', value: meters(p.commercialFrontage) });
    if (has(p.commercialCeilingHeight))
      rows.push({ label: 'Hauteur sous plafond', value: meters(p.commercialCeilingHeight) });
    if (p.commercialMezzanine) rows.push({ label: 'Mezzanine', value: 'Oui' });
  }

  if (p.type === 'LAND') {
    if (has(p.landFrontage)) rows.push({ label: 'Façade', value: meters(p.landFrontage) });
    if (has(p.landDepth)) rows.push({ label: 'Profondeur', value: meters(p.landDepth) });
    if (has(p.landCos)) rows.push({ label: 'COS', value: p.landCos.toLocaleString('fr-FR') });
    if (has(p.landCuf)) rows.push({ label: 'CUF', value: p.landCuf.toLocaleString('fr-FR') });
    if (has(p.landZoning)) rows.push({ label: 'Zone', value: LAND_ZONING_LABELS[p.landZoning] ?? p.landZoning });
    if (p.landServiced) rows.push({ label: 'Viabilisé', value: 'Oui (eau, électricité)' });
    if (p.landCorner) rows.push({ label: "Terrain d'angle", value: 'Oui' });
  }

  if (p.type === 'BUSINESS') {
    if (has(p.businessActivity)) rows.push({ label: 'Activité', value: p.businessActivity });
    if (has(p.businessDailyRevenue))
      rows.push({ label: 'Recette par jour', value: formatPrice(Number(p.businessDailyRevenue)) });
    if (has(p.businessRent))
      rows.push({ label: 'Loyer du local', value: `${formatPrice(Number(p.businessRent))}/mois` });
    if (has(p.businessEmployees)) rows.push({ label: 'Employés', value: String(p.businessEmployees) });
  }

  return rows;
}

/** Titre du bloc qui affiche ces lignes. */
export function specificDetailsTitle(type: string): string {
  if (type === 'LAND') return 'Terrain';
  if (type === 'BUSINESS') return 'Fonds de commerce';
  if (type === 'COMMERCIAL') return 'Local commercial';
  return 'Informations complémentaires';
}
