'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClientFilters, ClientType, FollowUpStatus } from '@/services/clients.service';
import type { AgentOption } from '@/services/agents.service';
import { clientTypeOptions, fullName } from '@/lib/property-constants';

const ALL = 'all';

interface Props {
  filters: ClientFilters;
  agents: AgentOption[];
  canFilterByAgent?: boolean;
  onChange: (patch: Partial<ClientFilters>) => void;
  onReset: () => void;
}

export function ClientsFiltersBar({
  filters,
  agents,
  canFilterByAgent = false,
  onChange,
  onReset,
}: Props) {
  const activeCount = [
    filters.search,
    filters.clientType,
    filters.status,
    filters.followUpStatus,
    filters.agentId,
  ].filter((v) => v !== undefined && v !== '').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            className="pl-9"
            value={filters.search ?? ''}
            onChange={(e) => onChange({ search: e.target.value || undefined })}
          />
        </div>

        <Select
          value={filters.clientType ?? ALL}
          onValueChange={(v) =>
            onChange({
              clientType: (v === ALL ? undefined : v) as ClientType | undefined,
            })
          }
        >
          <SelectTrigger className="min-w-[170px]">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les types</SelectItem>
            {clientTypeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) =>
            onChange({
              status: (v === ALL ? undefined : v) as 'PROSPECT' | 'CLIENT' | undefined,
            })
          }
        >
          <SelectTrigger className="min-w-[170px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les statuts</SelectItem>
            <SelectItem value="PROSPECT">Prospect</SelectItem>
            <SelectItem value="CLIENT">Client</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.followUpStatus ?? ALL}
          onValueChange={(v) =>
            onChange({
              followUpStatus: (v === ALL ? undefined : v) as FollowUpStatus | undefined,
            })
          }
        >
          <SelectTrigger className="min-w-[170px]">
            <SelectValue placeholder="Statut de suivi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les statuts de suivi</SelectItem>
            <SelectItem value="TO_CONTACT">À contacter</SelectItem>
            <SelectItem value="CONTACTED">Contacté</SelectItem>
            <SelectItem value="NEGOTIATION">En négociation</SelectItem>
            <SelectItem value="WON">Gagné</SelectItem>
            <SelectItem value="LOST">Perdu</SelectItem>
          </SelectContent>
        </Select>

        {canFilterByAgent && agents.length > 0 && (
          <Select
            value={filters.agentId ?? ALL}
            onValueChange={(v) => onChange({ agentId: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="min-w-[170px]">
              <SelectValue placeholder="Tous les agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {fullName(a.user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activeCount > 0 && (
          <Button variant="ghost" onClick={onReset}>
            <X className="mr-1 h-4 w-4" />
            Réinitialiser ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}