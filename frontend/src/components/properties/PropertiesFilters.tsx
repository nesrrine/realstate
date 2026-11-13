
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { X, SlidersHorizontal, Building2, Home } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

import { PropertyFilters } from '@/services/public.service';
import { useDebounce } from '@/hooks/use-debounce';
import {
  GOVERNORATE_LIST,
  getDelegations,
} from '@/lib/tunisia-locations';

const TRANSACTION_TYPES = [
  { value: 'SALE', label: 'Vente', icon: Home },
  { value: 'RENTAL', label: 'Location', icon: Building2 },
];

const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Appartement' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'HOUSE', label: 'Maison' },
  { value: 'LAND', label: 'Terrain' },
  { value: 'COMMERCIAL', label: 'Local commercial' },
  { value: 'OFFICE', label: 'Bureau' },
  { value: 'BUSINESS', label: 'Fonds de commerce' },
  { value: 'OTHER', label: 'Autre' },
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Plus récents' },
  { value: 'createdAt:asc', label: 'Plus anciens' },
  { value: 'price:asc', label: 'Prix croissant' },
  { value: 'price:desc', label: 'Prix décroissant' },
  { value: 'surface:desc', label: 'Surface décroissante' },
  { value: 'title:asc', label: 'Titre A → Z' },
];

function getNumberParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
): number {
  const value = params.get(key);

  if (value === null || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getFiltersFromUrl(
  params: URLSearchParams,
  defaultTransactionType?: 'SALE' | 'RENTAL',
  defaultType?: string,
): PropertyFilters {
  const transactionType = params.get('transactionType');
  const type = params.get('type');
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');

  return {
    page: Math.max(1, getNumberParam(params, 'page', 1)),
    limit: Math.max(1, getNumberParam(params, 'limit', 12)),

    search: params.get('search') || undefined,

    transactionType:
      (transactionType as 'SALE' | 'RENTAL' | null) ||
      defaultTransactionType,

    type: type || defaultType,

    city: params.get('city') || undefined,
    district: params.get('district') || undefined,

    priceMin: getNumberParam(params, 'priceMin', 0),
    priceMax: getNumberParam(params, 'priceMax', 2000000),

    surfaceMin: getNumberParam(params, 'surfaceMin', 0),
    surfaceMax: getNumberParam(params, 'surfaceMax', 500),

    sortBy:
      (sortBy as PropertyFilters['sortBy']) || 'createdAt',

    sortOrder:
      (sortOrder as PropertyFilters['sortOrder']) || 'desc',
  };
}

export function PropertiesFilters({
  defaultTransactionType,
  defaultType,
}: {
  defaultTransactionType?: 'SALE' | 'RENTAL';
  defaultType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentUrl = searchParams.toString();

  const [filters, setFilters] = useState<PropertyFilters>(() =>
    getFiltersFromUrl(
      new URLSearchParams(currentUrl),
      defaultTransactionType,
      defaultType,
    ),
  );

  const [priceRange, setPriceRange] = useState<[number, number]>([
    getNumberParam(new URLSearchParams(currentUrl), 'priceMin', 0),
    getNumberParam(new URLSearchParams(currentUrl), 'priceMax', 2000000),
  ]);

  const [surfaceRange, setSurfaceRange] = useState<[number, number]>([
    getNumberParam(new URLSearchParams(currentUrl), 'surfaceMin', 0),
    getNumberParam(new URLSearchParams(currentUrl), 'surfaceMax', 500),
  ]);

  // Évite de réécrire l'URL au premier rendu.
  const isFirstRender = useRef(true);

  // Évite de réinitialiser les filtres lors d'un simple changement de page.
  const previousUrl = useRef(currentUrl);

  const debouncedFilters = useDebounce(filters, 300);

  // Synchronisation des filtres lorsque l'URL change.
  useEffect(() => {
    if (previousUrl.current === currentUrl) return;

    previousUrl.current = currentUrl;

    const urlFilters = getFiltersFromUrl(
      new URLSearchParams(currentUrl),
      defaultTransactionType,
      defaultType,
    );

    setFilters(urlFilters);

    setPriceRange([
      urlFilters.priceMin ?? 0,
      urlFilters.priceMax ?? 2000000,
    ]);

    setSurfaceRange([
      urlFilters.surfaceMin ?? 0,
      urlFilters.surfaceMax ?? 500,
    ]);
  }, [currentUrl, defaultTransactionType, defaultType]);

  // Met à jour l'URL uniquement après une modification réelle des filtres.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams();

    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        params.set(key, String(value));
      }
    });

    const nextUrl = `/biens?${params.toString()}`;

    if (`/biens?${currentUrl}` !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [debouncedFilters, router]);

  const hasActiveFilters =
    filters.search ||
    filters.transactionType ||
    filters.type ||
    filters.city ||
    filters.district ||
    (filters.priceMin ?? 0) > 0 ||
    (filters.priceMax ?? 2000000) < 2000000 ||
    (filters.surfaceMin ?? 0) > 0 ||
    (filters.surfaceMax ?? 500) < 500;

  const handleReset = () => {
    setFilters({
      page: 1,
      limit: 12,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    setPriceRange([0, 2000000]);
    setSurfaceRange([0, 500]);
  };

  const updateFilter = (
    key: keyof PropertyFilters,
    value: string | number | undefined,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleCityChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      city: value || undefined,
      district: undefined,
      page: 1,
    }));
  };

  const handlePriceChange = (value: number[]) => {
    const [min, max] = value as [number, number];

    setPriceRange([min, max]);

    setFilters((prev) => ({
      ...prev,
      priceMin: min,
      priceMax: max,
      page: 1,
    }));
  };

  const handleSurfaceChange = (value: number[]) => {
    const [min, max] = value as [number, number];

    setSurfaceRange([min, max]);

    setFilters((prev) => ({
      ...prev,
      surfaceMin: min,
      surfaceMax: max,
      page: 1,
    }));
  };

  const delegations = filters.city
    ? getDelegations(filters.city)
    : [];

  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Filtres
        </h3>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Effacer
          </Button>
        )}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            <SlidersHorizontal className="mr-1 inline h-3 w-3" />
            Recherche
          </Label>

          <Input
            placeholder="Ville, quartier, référence..."
            value={filters.search || ''}
            onChange={(e) =>
              updateFilter('search', e.target.value || undefined)
            }
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Type d&apos;opération
          </Label>

          <div className="mt-2 flex gap-2">
            {TRANSACTION_TYPES.map((t) => {
              const Icon = t.icon;
              const active = filters.transactionType === t.value;

              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    updateFilter(
                      'transactionType',
                      active ? undefined : t.value,
                    )
                  }
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Type de bien
          </Label>

          <Select
            value={filters.type || ''}
            onValueChange={(v) =>
              updateFilter('type', v || undefined)
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>

            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Gouvernorat
          </Label>

          <Select
            value={filters.city || ''}
            onValueChange={handleCityChange}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Tous les gouvernorats" />
            </SelectTrigger>

            <SelectContent>
              {GOVERNORATE_LIST.map((gov) => (
                <SelectItem key={gov} value={gov}>
                  {gov}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Délégation
          </Label>

          <Select
            value={filters.district || ''}
            onValueChange={(v) =>
              updateFilter('district', v || undefined)
            }
            disabled={delegations.length === 0}
          >
            <SelectTrigger className="mt-2">
              <SelectValue
                placeholder={
                  delegations.length === 0
                    ? 'Sélectionnez un gouvernorat'
                    : 'Toutes les délégations'
                }
              />
            </SelectTrigger>

            <SelectContent>
              {delegations.map((del) => (
                <SelectItem key={del} value={del}>
                  {del}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Prix (DT)
          </Label>

          <div className="mt-2 space-y-2">
            <Slider
              min={0}
              max={2000000}
              step={50000}
              value={priceRange}
              onValueChange={handlePriceChange}
            />

            <div className="flex justify-between text-xs text-slate-500">
              <span>{priceRange[0].toLocaleString()} DT</span>
              <span>{priceRange[1].toLocaleString()} DT</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Surface (m²)
          </Label>

          <div className="mt-2 space-y-2">
            <Slider
              min={0}
              max={500}
              step={10}
              value={surfaceRange}
              onValueChange={handleSurfaceChange}
            />

            <div className="flex justify-between text-xs text-slate-500">
              <span>{surfaceRange[0]} m²</span>
              <span>{surfaceRange[1]} m²</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Trier par
          </Label>

          <Select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onValueChange={(v) => {
              const [sortBy, sortOrder] = v.split(':') as [
                PropertyFilters['sortBy'],
                PropertyFilters['sortOrder'],
              ];

              setFilters((prev) => ({
                ...prev,
                sortBy,
                sortOrder,
                page: 1,
              }));
            }}
          >
            <SelectTrigger className="mt-2">
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
        </div>
      </div>
    </div>
  );
}
