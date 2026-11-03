import { Metadata } from 'next';
import { Suspense } from 'react';
import { PropertiesFilters } from '@/components/properties/PropertiesFilters';
import { PropertiesList } from '@/components/properties/PropertiesList';

export const metadata: Metadata = {
  title: 'Terrains à vendre et louer - Le Portail Immobilier',
  description: 'Découvrez nos terrains à vendre et à louer : terrains constructibles, terrains agricoles, terrains viabilisés.',
};

export default function TerrainsPage() {
  return (
    <div className="py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Terrains
          </span>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Terrains
          </h1>
          <p className="mt-2 text-slate-600">
            Découvrez notre sélection de terrains constructibles et agricoles.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}>
              <PropertiesFilters defaultType="LAND" />
            </Suspense>
          </aside>
          <main className="lg:col-span-3">
            <Suspense fallback={<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-100" />)}</div>}>
              <PropertiesList defaultType="LAND" />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}