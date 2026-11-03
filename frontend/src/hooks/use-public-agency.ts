'use client';

import { useQuery } from '@tanstack/react-query';
import { publicService } from '@/services/public.service';

/** Coordonnées de l'agence saisies dans Paramètres (site vitrine : pied de page, contact). */
export function usePublicAgency() {
  return useQuery({
    queryKey: ['public', 'agency'],
    queryFn: publicService.getAgency,
    staleTime: 10 * 60_000,
  });
}

/** Lien « tel: » à partir d'un numéro saisi librement (« 71 000 000 », « +216 … »). */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
