'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { publicService } from '@/services/public.service';

/** « Décrivez ce que vous cherchez » → filtres de la page Nos biens. */
export function AiSearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const f = await publicService.aiSearch(query.trim());
      const params = new URLSearchParams();
      const set = (k: string, v: string | number | null) => {
        if (v !== null && v !== '') params.set(k, String(v));
      };
      set('type', f.type);
      set('transactionType', f.transactionType);
      set('city', f.city);
      set('district', f.district);
      set('priceMin', f.priceMin);
      set('priceMax', f.priceMax);
      set('surfaceMin', f.surfaceMin);
      set('surfaceMax', f.surfaceMax);
      set('search', f.search);
      params.set('page', '1');
      // Même navigation que les filtres existants de la page
      window.location.href = `/biens?${params.toString()}`;
    } catch {
      setError('La recherche intelligente est indisponible pour le moment. Utilisez les filtres.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-8">
      <div className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50/60 p-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 px-2">
          <Sparkles className="h-5 w-5 shrink-0 text-blue-600" />
          <input
            className="h-10 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
            placeholder="Décrivez votre recherche : « S+2 meublé à La Marsa, moins de 1500 DT par mois »"
            value={query}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Rechercher
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
