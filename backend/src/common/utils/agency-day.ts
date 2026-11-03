/**
 * Journées de l'agence à l'heure de Tunis (UTC+1, pas d'heure d'été),
 * indépendamment du fuseau du serveur (souvent UTC en production / Docker).
 * Surchargeable avec AGENCY_UTC_OFFSET (ex. "+01:00").
 */
const OFFSET = process.env.AGENCY_UTC_OFFSET ?? "+01:00";
const OFFSET_MS = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(OFFSET);
  if (!m) return 60 * 60 * 1000;
  const ms = (Number(m[2]) * 60 + Number(m[3])) * 60 * 1000;
  return m[1] === "-" ? -ms : ms;
})();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Jour courant de l'agence, au format YYYY-MM-DD. */
export function agencyToday(now = new Date()): string {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Instant de début (minuit, heure de l'agence) d'un jour YYYY-MM-DD. */
export function agencyDayStart(day: string): Date {
  return new Date(`${day}T00:00:00${OFFSET}`);
}

/** Bornes [début, fin) d'un jour de l'agence. */
export function agencyDayRange(day: string): { start: Date; end: Date } {
  const start = agencyDayStart(day);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Début du mois en cours (heure de l'agence). */
export function agencyMonthStart(now = new Date()): Date {
  return agencyDayStart(`${agencyToday(now).slice(0, 7)}-01`);
}
