'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, MapPin, Home, LandPlot, Briefcase, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GOVERNORATE_LIST, getDelegations } from '@/lib/tunisia-locations';

const TRANSACTION_TYPES = [
  { value: 'SALE', label: 'Vente', icon: Home },
  { value: 'RENTAL', label: 'Location', icon: Home },
];

const PROPERTY_TYPES = [
  { value: 'APPARTMENT', label: 'Appartement' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'HOUSE', label: 'Maison' },
  { value: 'LAND', label: 'Terrain' },
  { value: 'COMMERCIAL', label: 'Local commercial' },
  { value: 'OFFICE', label: 'Bureau' },
];

export function SearchSection() {
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [governorate, setGovernorate] = useState<string>('');
  const [delegation, setDelegation] = useState<string>('');

  const delegations = governorate ? getDelegations(governorate) : [];

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (transactionType) params.set('transactionType', transactionType);
    if (type) params.set('type', type);
    if (governorate) params.set('city', governorate);
    if (delegation) params.set('district', delegation);
    return `/biens?${params.toString()}`;
  };

  return (
    <section className="relative -mt-8 z-10 px-4 sm:px-6">
      <div className="container mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                <MapPin className="mr-1 inline h-3 w-3" />
                Gouvernorat
              </label>
              <Select value={governorate} onValueChange={(v) => {
                setGovernorate(v === governorate ? '' : v);
                if (v !== governorate) setDelegation('');
              }}>
                <SelectTrigger className="h-11">
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
            <div className="lg:col-span-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Délégation
              </label>
              <Select value={delegation} onValueChange={(v) => setDelegation(v === delegation ? '' : v)} disabled={delegations.length === 0}>
                <SelectTrigger className="h-11">
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
            <div className="lg:col-span-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Type d'opération
              </label>
              <div className="flex gap-2">
                {TRANSACTION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = transactionType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTransactionType(transactionType === t.value ? '' : t.value)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
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
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Type de bien
              </label>
              <Select value={type} onValueChange={(v) => setType(v === type ? '' : v)}>
                <SelectTrigger className="h-11">
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
            <div className="lg:col-span-2">
              <Button
                asChild
                className="h-11 w-full bg-slate-900 px-6 font-semibold text-white hover:bg-slate-800"
              >
                <Link href={buildQuery()}>Rechercher</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}