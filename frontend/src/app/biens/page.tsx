import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PropertiesFilters } from '@/components/properties/PropertiesFilters';
import { PropertiesList } from '@/components/properties/PropertiesList';
import { AiSearchBar } from '@/components/ai/ai-search-bar';

export const metadata: Metadata = {
  title: 'Tous nos biens | Le Portail Immobilier',
  description:
    'Appartements, villas, terrains, locaux commerciaux et fonds de commerce en vente et location. Filtrez par type, prix, surface et ville.',
};

/* ───────── Squelettes de chargement ───────── */

function FiltersSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-slate-100" aria-hidden />;
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

/* ───────── Page ───────── */

export default function BiensPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* En-tête (même style que « Biens à la une ») */}
        <header>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Portefeuille
          </span>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Tous nos biens
          </h1>
          <p className="mt-2 text-slate-600">
            Découvrez notre sélection de biens immobiliers en vente et location.
          </p>
        </header>

        {/* Recherche IA + filtres : une seule carte, toujours visible */}
        <div className="mt-8 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <AiSearchBar />
          <Suspense fallback={<FiltersSkeleton />}>
            <PropertiesFilters />
          </Suspense>
        </div>

        {/* Liste pleine largeur : 1 / 2 / 3 colonnes comme l'accueil */}
        <div className="mt-10">
          <Suspense fallback={<ListSkeleton />}>
            <PropertiesList />
          </Suspense>
        </div>
      </div>
    </section>
  );
}