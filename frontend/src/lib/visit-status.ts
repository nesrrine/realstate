import type { VisitStatus } from '@/services/visits.service';

/** Libellés et couleurs des statuts de visite (liste et agenda). */
export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  SCHEDULED: 'Planifiée',
  CONFIRMED: 'Confirmée',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  NO_SHOW: 'Absent',
};

export const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  NO_SHOW: 'bg-orange-100 text-orange-700 border-orange-200',
};
