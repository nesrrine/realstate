import { Suspense } from 'react';
import { PropertiesFilters } from '@/components/properties/PropertiesFilters';
import { PropertiesList } from '@/components/properties/PropertiesList';
import { AiSearchBar } from '@/components/ai/ai-search-bar';

export default function BiensPage() {
  return (
    <div className="py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Portefeuille
          </span>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Tous nos biens
          </h1>
          <p className="mt-2 text-slate-600">
            Découvrez notre sélection de biens immobiliers en vente et location.
          </p>
        </div>

        <AiSearchBar />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}>
              <PropertiesFilters />
            </Suspense>
          </aside>
          <main className="lg:col-span-3">
            <Suspense fallback={<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-100" />)}</div>}>
              <PropertiesList />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}