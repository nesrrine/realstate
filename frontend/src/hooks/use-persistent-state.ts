'use client';

import { useEffect, useState } from 'react';

const PREFIX = 'crm-filtres:';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * useState mémorisé pour l'onglet du navigateur (sessionStorage) :
 * les filtres d'une liste sont retrouvés au retour d'une fiche, même via le menu.
 * Oubliés à la fermeture de l'onglet et à la déconnexion (clearPersistentState).
 */
export function usePersistentState<T>(key: string, initial: T) {
  const storageKey = PREFIX + key;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw === null) return initial;
      const saved = JSON.parse(raw) as T;
      // Objet de filtres : les nouveaux champs par défaut restent présents
      return isPlainObject(initial) && isPlainObject(saved) ? ({ ...initial, ...saved } as T) : saved;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // stockage indisponible (navigation privée stricte) : filtres non mémorisés
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}

/** À la déconnexion : le compte suivant ne retrouve pas les filtres du précédent. */
export function clearPersistentState() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // rien à nettoyer
  }
}
