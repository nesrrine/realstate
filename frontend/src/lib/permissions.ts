import type { User } from '@/types/auth';

/**
 * Droits côté écran, alignés sur ceux de l'API : on n'affiche pas une action
 * que le serveur refuserait (bouton qui finit en erreur 403).
 */

/** Gérant ou administrateur : gestion complète de l'agence. */
export const isManagement = (user?: User | null) => user?.role === 'ADMIN' || user?.role === 'MANAGER';

/** Un agent ne modifie que ses propres biens (photos, documents, publication compris). */
export const canEditProperty = (user: User | null | undefined, property: { agent?: { id: string } | null }) =>
  isManagement(user) || (!!user?.agentId && property.agent?.id === user.agentId);

/** Supprimer un bien, une visite, un lead ou un client : gérant ou administrateur. */
export const canDelete = isManagement;
