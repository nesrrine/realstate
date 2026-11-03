import { toast } from 'sonner';

/** Partage natif (mobile) si disponible, sinon copie du lien dans le presse-papiers. */
export async function shareLink(url: string, title: string) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      // Partage annulé par l'utilisateur : rien à faire
      if ((e as Error).name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Lien copié dans le presse-papiers');
  } catch {
    toast.error(`Copie impossible : ${url}`);
  }
}
