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
import type { TransactionFilters, TransactionStatus, TransactionType } from '@/services/transactions.service';
import type { AgentOption } from '@/services/agents.service';
import {
  TRANSACTION_STATUS_LABELS,
  fullName,
  transactionOptions,
} from '@/lib/property-constants';

const ALL = 'all';

interface Props {
  filters: TransactionFilters;
  agents: AgentOption[];
  canManage?: boolean;
  onChange: (patch: Partial<TransactionFilters>) => void;
  onReset: () => void;
}

const statusOptions = Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function TransactionsFiltersBar({
  filters,
  agents,
  canManage = false,
  onChange,
  onReset,
}: Props) {
  const activeCount = [
    filters.search, filters.transactionType, filters.status,
    filters.fieldAgentId, filters.officeAgentId,
  ].filter((v) => v !== undefined && v !== '').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une transaction..."
            className="pl-9"
            value={filters.search ?? ''}
            onChange={(e) => onChange({ search: e.target.value || undefined })}
          />
        </div>

        <Select
          value={filters.transactionType ?? ALL}
          onValueChange={(v) =>
            onChange({
              transactionType: (v === ALL ? undefined : v) as TransactionType | undefined,
            })
          }
        >
          <SelectTrigger className="min-w-[170px]">
            <SelectValue placeholder="Vente & location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les types</SelectItem>
            {transactionOptions.map((o) => (
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
              status: (v === ALL ? undefined : v) as TransactionStatus | undefined,
            })
          }
        >
          <SelectTrigger className="min-w-[170px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les statuts</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && agents.length > 0 && (
          <>
            <Select
              value={filters.fieldAgentId ?? ALL}
              onValueChange={(v) => onChange({ fieldAgentId: v === ALL ? undefined : v })}
            >
              <SelectTrigger className="min-w-[170px]">
                <SelectValue placeholder="Agent terrain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les agents terrain</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {fullName(a.user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.officeAgentId ?? ALL}
              onValueChange={(v) => onChange({ officeAgentId: v === ALL ? undefined : v })}
            >
              <SelectTrigger className="min-w-[170px]">
                <SelectValue placeholder="Agent bureau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les agents bureau</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {fullName(a.user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
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
