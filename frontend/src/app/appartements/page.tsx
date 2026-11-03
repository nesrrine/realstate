import { Metadata } from 'next';
import { Suspense } from 'react';
import { PropertiesFilters } from '@/components/properties/PropertiesFilters';
import { PropertiesList } from '@/components/properties/PropertiesList';

export const metadata: Metadata = {
  title: 'Appartements à vendre et louer - Le Portail Immobilier',
  description: 'Découvrez nos appartements à vendre et à louer : studios, T2, T3, T4, T5 et plus.',
};

export default function AppartementsPage() {
  return (
    <div className="py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Appartements
          </span>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Appartements
          </h1>
          <p className="mt-2 text-slate-600">
            Découvrez notre sélection d'appartements à vendre et à louer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}>
              <PropertiesFilters defaultType="APARTMENT" />
            </Suspense>
          </aside>
          <main className="lg:col-span-3">
            <Suspense fallback={<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-100" />)}</div>}>
              <PropertiesList defaultType="APARTMENT" />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}