'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Building2, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { PropertyFilters } from '@/services/public.service';
import { useDebounce } from '@/hooks/use-debounce';
import { GOVERNORATE_LIST, getDelegations } from '@/lib/tunisia-locations';

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

export function PropertiesFilters({ 
  defaultTransactionType, 
  defaultType 
}: { 
  defaultTransactionType?: 'SALE' | 'RENTAL';
  defaultType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
  const [surfaceRange, setSurfaceRange] = useState<[number, number]>([0, 500]);

  const initialTransactionType = searchParams.get('transactionType') as 'SALE' | 'RENTAL' | null;
  const initialType = searchParams.get('type');
  
  const [filters, setFilters] = useState<PropertyFilters>({
    page: 1,
    limit: 12,
    search: searchParams.get('search') || undefined,
    transactionType: initialTransactionType || defaultTransactionType,
    type: initialType || defaultType,
    city: searchParams.get('city') || undefined,
    district: searchParams.get('district') || undefined,
    priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : 0,
    priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : 2000000,
    surfaceMin: searchParams.get('surfaceMin') ? Number(searchParams.get('surfaceMin')) : 0,
    surfaceMax: searchParams.get('surfaceMax') ? Number(searchParams.get('surfaceMax')) : 500,
    sortBy: (searchParams.get('sortBy') as PropertyFilters['sortBy']) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as PropertyFilters['sortOrder']) || 'desc',
  });

  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 0) {
        params.set(key, String(value));
      }
    });
    router.push(`/biens?${params.toString()}`, { scroll: false });
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
  };

  const updateFilter = (key: keyof PropertyFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const delegations = filters.city ? getDelegations(filters.city) : [];

  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Filtres</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-600 hover:text-slate-900">
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
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
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
                  onClick={() => updateFilter('transactionType', active ? undefined : t.value)}
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
            onValueChange={(v) => updateFilter('type', v || undefined)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les types</SelectItem>
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
            onValueChange={(v) => {
              updateFilter('city', v || undefined);
              if (!v) updateFilter('district', undefined);
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Tous les gouvernorats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les gouvernorats</SelectItem>
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
            onValueChange={(v) => updateFilter('district', v || undefined)}
            disabled={delegations.length === 0}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={delegations.length === 0 ? 'Sélectionnez un gouvernorat' : 'Toutes les délégations'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les délégations</SelectItem>
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
              onValueChange={(val: [number, number]) => {
                const [min, max] = val;
                setPriceRange([min, max]);
                updateFilter('priceMin', min);
                updateFilter('priceMax', max);
              }}
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
              onValueChange={(val: [number, number]) => {
                const [min, max] = val;
                setSurfaceRange([min, max]);
                updateFilter('surfaceMin', min);
                updateFilter('surfaceMax', max);
              }}
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
              const [sortBy, sortOrder] = v.split(':') as [PropertyFilters['sortBy'], PropertyFilters['sortOrder']];
              updateFilter('sortBy', sortBy);
              updateFilter('sortOrder', sortOrder);
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