import axios from 'axios';

export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' · ');
    if (typeof msg === 'string') return msg;
    if (error.response?.status === 403) return "Vous n'avez pas les droits pour cette action";
  }
  return error instanceof Error ? error.message : fallback;
}