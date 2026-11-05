'use client';

import { useState } from 'react';
import { Reveal } from '@/components/motion/reveal';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, Home, LandPlot, Briefcase, Loader2, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicService, Property, PropertyFilters } from '@/services/public.service';
import { queryKeys } from '@/lib/query-keys';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatPrice, formatArea, getCoverImage, TYPE_LABELS, TRANSACTION_LABELS } from '@/lib/public-constants';

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Plus récents' },
  { value: 'createdAt:asc', label: 'Plus anciens' },
  { value: 'price:asc', label: 'Prix croissant' },
  { value: 'price:desc', label: 'Prix décroissant' },
  { value: 'surface:desc', label: 'Surface décroissante' },
  { value: 'title:asc', label: 'Titre A → Z' },
];

type ViewMode = 'grid' | 'list';

function PropertyCard({ property }: { property: Property }) {
  const cover = getCoverImage(property.images);

  return (
    <Link href={`/biens/${property.id}`} className="group block">
      <Card className="card-lift overflow-hidden h-full flex flex-col border-slate-200">
        <div className="relative aspect-[4/3] overflow-hidden">
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
            style={{ backgroundImage: `url(${cover})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
              {TRANSACTION_LABELS[property.transactionType]}
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
              {TYPE_LABELS[property.type]}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="text-lg font-bold">{formatPrice(property.price)}</div>
            <div className="text-sm opacity-90">{property.city}</div>
          </div>
        </div>
        <CardContent className="flex-1 flex flex-col p-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex-1">
              {property.title}
            </h3>
            {property.reference && (
              <span className="flex-shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 whitespace-nowrap">
                {property.reference}
              </span>
            )}
          </div>
          <p className="flex items-center text-sm text-slate-500 mb-3">
            <MapPin className="mr-1 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">
              {property.city}
              {property.district ? `, ${property.district}` : ''}
            </span>
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
              <Home className="h-3.5 w-3.5" />
              {formatArea(property.surface)}
            </div>
            {property.rooms && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                <Briefcase className="h-3.5 w-3.5" />
                {property.rooms} pièces
              </div>
            )}
            {property.bedrooms && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                <LandPlot className="h-3.5 w-3.5" />
                {property.bedrooms} ch.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function PropertyListItem({ property }: { property: Property }) {
  const cover = getCoverImage(property.images);

  return (
    <Link href={`/biens/${property.id}`} className="group block">
      <Card className="overflow-hidden border-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <div className="relative md:w-72 md:flex-shrink-0">
              <div
                className="h-56 md:h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${cover})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent md:from-black/40 md:via-black/10 md:to-transparent" />
              <div className="absolute left-3 top-3 flex gap-2">
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
                  {TRANSACTION_LABELS[property.transactionType]}
                </span>
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
                  {TYPE_LABELS[property.type]}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="text-lg font-bold">{formatPrice(property.price)}</div>
                <div className="text-sm opacity-90">{property.city}</div>
              </div>
            </div>
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {property.reference && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                      {property.reference}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {property.title}
                </h3>
                <p className="mt-1 flex items-center text-sm text-slate-500">
                  <MapPin className="mr-1 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1">
                    {property.city}
                    {property.district ? `, ${property.district}` : ''}
                  </span>
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                  <Home className="h-3.5 w-3.5" />
                  {formatArea(property.surface)}
                </div>
                {property.rooms && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                    <Briefcase className="h-3.5 w-3.5" />
                    {property.rooms} pièces
                  </div>
                )}
                {property.bedrooms && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                    <LandPlot className="h-3.5 w-3.5" />
                    {property.bedrooms} ch.
                  </div>
                )}
                <span className="ml-auto text-sm font-bold text-slate-900">
                  {formatPrice(property.price)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

async function getProperties(filters: PropertyFilters) {
  try {
    const res = await publicService.getProperties(filters);
    return res;
  } catch {
    return { data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0, hasNext: false, hasPrev: false } };
  }
}

export function PropertiesList({ 
  defaultTransactionType, 
  defaultType 
}: { 
  defaultTransactionType?: 'SALE' | 'RENTAL';
  defaultType?: string;
}) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>('grid');
  const queryClient = useQueryClient();

  const initialTransactionType = searchParams.get('transactionType') as 'SALE' | 'RENTAL' | null;
  const initialType = searchParams.get('type');
  
  const filters: PropertyFilters = {
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    limit: 12,
    search: searchParams.get('search') || undefined,
    transactionType: initialTransactionType || defaultTransactionType,
    type: initialType || defaultType,
    city: searchParams.get('city') || undefined,
    district: searchParams.get('district') || undefined,
    priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
    priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
    surfaceMin: searchParams.get('surfaceMin') ? Number(searchParams.get('surfaceMin')) : undefined,
    surfaceMax: searchParams.get('surfaceMax') ? Number(searchParams.get('surfaceMax')) : undefined,
    sortBy: (searchParams.get('sortBy') as PropertyFilters['sortBy']) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as PropertyFilters['sortOrder']) || 'desc',
  };

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.properties.list(filters),
    queryFn: () => getProperties(filters),
    placeholderData: keepPreviousData,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });

  const refreshProperties = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.properties.list(filters) });
  };

  const properties = data?.data ?? [];
  const meta = data?.meta;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Erreur lors du chargement des biens</p>
        </CardContent>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <Home className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Aucun bien trouvé</h3>
          <p className="mb-4 text-slate-600">
            Essayez de modifier vos critères de recherche
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/biens'}>
            Voir tous les biens
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = meta?.total ?? properties.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{total}</span> bien{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
            {isFetching && <Loader2 className="ml-2 inline h-4 w-4 animate-spin text-blue-600" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onValueChange={(v) => {
              const parts = v.split(':');
              if (parts.length !== 2) return;
              const sortBy = parts[0]!;
              const sortOrder = parts[1]!;
              const params = new URLSearchParams(searchParams.toString());
              params.set('sortBy', sortBy);
              params.set('sortOrder', sortOrder);
              params.set('page', '1');
              window.location.href = `/biens?${params.toString()}`;
            }}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              aria-label="Vue grille"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              aria-label="Vue liste"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshProperties}
            disabled={isFetching}
            className="gap-1 h-9"
            aria-label="Actualiser la liste des biens"
          >
            <Loader2 className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {properties.map((property, i) => (
            <Reveal key={property.id} delay={(i % 4) * 90} className="h-full">
              <PropertyCard property={property} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property, i) => (
            <Reveal key={property.id} variant="left" delay={Math.min(i, 5) * 60}>
              <PropertyListItem property={property} />
            </Reveal>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(meta.page - 1));
              window.location.href = `/biens?${params.toString()}`;
            }}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <span className="px-4 text-sm text-slate-600 font-medium">
            Page <span className="font-semibold text-slate-900">{meta.page}</span> / <span className="font-semibold text-slate-900">{meta.totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(meta.page + 1));
              window.location.href = `/biens?${params.toString()}`;
            }}
            className="gap-1"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}