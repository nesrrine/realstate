'use client';

import { useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { PropertyFilters } from '@/services/properties.service';
import type { AgentOption } from '@/services/agents.service';
import { statusOptions, transactionOptions, typeOptions, fullName } from '@/lib/property-constants';
import { GOVERNORATE_LIST, getDelegations } from '@/lib/tunisia-locations';

const ALL = 'all';

function FilterSelect({
  value, onChange, placeholder, options,
  disabled = false,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

interface Props {
  filters: PropertyFilters;
  agents: AgentOption[];
  onChange: (patch: Partial<PropertyFilters>) => void;
  onReset: () => void;
}

export function PropertyFiltersBar({ filters, agents, onChange, onReset }: Props) {
  // Ouvert d'office si des filtres avancés sont actifs (retour d'une fiche bien)
  const [expanded, setExpanded] = useState(() =>
    [filters.type, filters.city, filters.district, filters.agentId, filters.priceMin, filters.priceMax,
      filters.surfaceMin, filters.surfaceMax].some((v) => v !== undefined && v !== ''),
  );

  const num = (v: string) => (v === '' ? undefined : Number(v));
  const publication =
    filters.isPublished === undefined ? undefined : filters.isPublished ? 'true' : 'false';

  const activeCount = [
    filters.search, filters.status, filters.transactionType, filters.type, filters.city,
    filters.isPublished, filters.agentId, filters.priceMin, filters.priceMax,
    filters.surfaceMin, filters.surfaceMax,
  ].filter((v) => v !== undefined && v !== '').length;

  const delegations = filters.city ? getDelegations(filters.city) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (titre, adresse, ville, description)…"
            className="pl-9"
            value={filters.search ?? ''}
            onChange={(e) => onChange({ search: e.target.value || undefined })}
          />
        </div>

        <FilterSelect value={filters.status} placeholder="Tous les statuts"
          options={statusOptions} onChange={(v) => onChange({ status: v as PropertyFilters['status'] })} />
        <FilterSelect value={filters.transactionType} placeholder="Vente & location"
          options={transactionOptions} onChange={(v) => onChange({ transactionType: v as PropertyFilters['transactionType'] })} />
        <FilterSelect value={publication} placeholder="Publication"
          options={[{ value: 'true', label: 'Publiés' }, { value: 'false', label: 'Non publiés' }]}
          onChange={(v) => onChange({ isPublished: v === undefined ? undefined : v === 'true' })} />

        <Button variant="outline" onClick={() => setExpanded((e) => !e)}>
          Plus de filtres
          <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </Button>

        {activeCount > 0 && (
          <Button variant="ghost" onClick={onReset}>
            <X className="mr-1 h-4 w-4" /> Réinitialiser ({activeCount})
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect value={filters.type} placeholder="Tous les types de bien"
            options={typeOptions} onChange={(v) => onChange({ type: v as PropertyFilters['type'] })} />
          <FilterSelect value={filters.city} placeholder="Gouvernorat"
            options={GOVERNORATE_LIST.map((g) => ({ value: g, label: g }))}
            onChange={(v) => {
              onChange({ city: v as PropertyFilters['city'] });
              if (!v) onChange({ district: undefined });
            }} />
          <FilterSelect value={filters.district} placeholder="Délégation"
            options={delegations.map((d) => ({ value: d, label: d }))}
            onChange={(v) => onChange({ district: v as PropertyFilters['district'] })}
            disabled={delegations.length === 0} />
          {agents.length > 0 && (
            <FilterSelect value={filters.agentId} placeholder="Tous les agents"
              options={agents.map((a) => ({ value: a.id, label: fullName(a.user) }))}
              onChange={(v) => onChange({ agentId: v })} />
          )}
          <div className="flex gap-2">
            <Input type="number" min={0} placeholder="Prix min" value={filters.priceMin ?? ''}
              onChange={(e) => onChange({ priceMin: num(e.target.value) })} />
            <Input type="number" min={0} placeholder="Prix max" value={filters.priceMax ?? ''}
              onChange={(e) => onChange({ priceMax: num(e.target.value) })} />
          </div>
          <div className="flex gap-2">
            <Input type="number" min={0} placeholder="m² min" value={filters.surfaceMin ?? ''}
              onChange={(e) => onChange({ surfaceMin: num(e.target.value) })} />
            <Input type="number" min={0} placeholder="m² max" value={filters.surfaceMax ?? ''}
              onChange={(e) => onChange({ surfaceMax: num(e.target.value) })} />
          </div>
        </div>
      )}
    </div>
  );
}