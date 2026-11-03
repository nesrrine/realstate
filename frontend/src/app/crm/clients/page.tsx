'use client';

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { Users, Plus, Wallet, TrendingUp, type LucideIcon } from 'lucide-react';

import {
  clientsService,
  type Client,
  type ClientFilters,
  type ClientType,
} from '@/services/clients.service';
import { agentsService } from '@/services/agents.service';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/use-debounce';
import { CLIENT_TYPE_LABELS } from '@/lib/property-constants';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { ClientsFiltersBar } from '@/components/clients/clients-filters-bar';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { ExportExcelButton } from '@/components/shared/export-excel-button';
import {
  ClientsTable,
  ClientsTableSkeleton,
} from '@/components/clients/clients-table';

const DEFAULT_LIMIT = 20;
const STAT_ICONS: Record<ClientType, LucideIcon> = {
  BUYER: Wallet,
  SELLER: TrendingUp,
  RENTER: Users,
};

type Tab = 'all' | 'prospect' | 'client' | 'inactive';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'client', label: 'Clients' },
  { key: 'inactive', label: 'Supprimés' },
];

// Les clients supprimés (désactivés) n'apparaissent que dans l'onglet « Supprimés »
const DEFAULT_FILTERS: ClientFilters = { page: 1, limit: DEFAULT_LIMIT, isActive: true };

export default function ClientsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canFilterByAgent = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const qc = useQueryClient();

  // Filtres et onglet retrouvés au retour d'une fiche client
  const [filters, setFilters] = usePersistentState<ClientFilters>('clients', DEFAULT_FILTERS);
  const [tab, setTab] = usePersistentState<Tab>('clients-onglet', 'all');
  const [convertingId, setConvertingId] = useState<number | string | null>(null);

  const debouncedFilters = useDebounce(filters, 300);

  const updateFilters = (patch: Partial<ClientFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      isActive: true,
      page: 1,
    }));
    setTab('all');
  };

  const applyTab = (t: Tab) => {
    setTab(t);
    setFilters((current) => {
      const next: ClientFilters = { ...current, page: 1 };
      if (t === 'inactive') {
        next.status = undefined;
        next.isActive = false;
      } else {
        next.isActive = true;
        next.status = t === 'prospect' ? 'PROSPECT' : t === 'client' ? 'CLIENT' : undefined;
      }
      return next;
    });
  };

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    enabled: !authLoading && canFilterByAgent,
    staleTime: 5 * 60_000,
  });

  const { data: clients, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.clients.list(debouncedFilters),
    queryFn: () => clientsService.getAll(debouncedFilters),
    enabled: !authLoading && !!user,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const convertMutation = useMutation({
    mutationFn: (id: number | string) => clientsService.convert(id),
    onMutate: (_id) => setConvertingId(_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Prospect converti en client');
      setConvertingId(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setConvertingId(null);
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string | number; targetId: string | number }) =>
      clientsService.merge(sourceId, targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Fiches fusionnées');
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
    },
  });

  // Suppression = fiche masquée ; visites, transactions et historique restent dans le CRM
  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => clientsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Client supprimé (récupérable dans l’onglet « Supprimés »)');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number | string) => clientsService.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Client restauré');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const list: Client[] = clients?.data ?? [];
  const meta = clients?.meta;
  const total = meta?.total ?? list.length;

  const countByType = (type: ClientType) =>
    list.filter((c: Client) => c.clientType === type).length;

  const countByStatus = (status: 'PROSPECT' | 'CLIENT') =>
    list.filter((c: Client) => c.status === status).length;

  const countInactive = () =>
    list.filter((c: Client) => !c.isActive).length;

  const statCards = [
    { label: 'Total clients', value: total, icon: Users },
    { label: 'Clients confirmés', value: countByStatus('CLIENT'), icon: Users },
    { label: 'Prospects', value: countByStatus('PROSPECT'), icon: Users },
    { label: 'Inactifs', value: countInactive(), icon: TrendingUp },
    ...(['BUYER', 'SELLER', 'RENTER'] as ClientType[]).map((type) => ({
      label: `${CLIENT_TYPE_LABELS[type]}s (cette page)`,
      value: countByType(type),
      icon: STAT_ICONS[type],
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Gérez vos relations clients"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportExcelButton type="clients" />
            <Link href="/crm/clients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau client
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card, i) => (
          <StatCard
            key={i}
            label={card.label}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </div>

      {/* Onglets de statut */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count =
            t.key === 'all'
              ? total
              : t.key === 'inactive'
                ? list.filter((c) => !c.isActive).length
                : list.filter((c) => c.status === (t.key === 'prospect' ? 'PROSPECT' : 'CLIENT')).length;
          return (
            <button
              key={t.key}
              onClick={() => applyTab(t.key)}
className={`px-4 py-2 rounded-md border border-border text-sm font-medium transition-colors ${
  active
    ? 'bg-primary text-primary-foreground'
    : 'bg-input text-muted-foreground hover:bg-muted'
}`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ClientsFiltersBar
            filters={filters}
            agents={agents}
            canFilterByAgent={canFilterByAgent}
            onChange={updateFilters}
            onReset={() => {
              setFilters(DEFAULT_FILTERS);
              setTab('all');
            }}
          />
        </CardContent>
      </Card>

      <Card
        className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}
      >
        <CardContent className="p-0">
          {authLoading || isLoading ? (
            <div className="p-6">
              <ClientsTableSkeleton />
            </div>
          ) : list.length > 0 ? (
            <>
              <ClientsTable
                items={list}
                canFilterByAgent={canFilterByAgent}
                canMerge={canFilterByAgent}
                onConvert={(client) => {
                  if (client.status === 'PROSPECT') {
                    convertMutation.mutate(client.id);
                  }
                }}
                onMerge={async (sourceId, targetId) => {
                  await mergeMutation.mutateAsync({ sourceId, targetId });
                }}
                onDelete={
                  canFilterByAgent
                    ? (client) => {
                        if (window.confirm(`Supprimer ${client.firstName} ${client.lastName} ?`)) {
                          deleteMutation.mutate(client.id);
                        }
                      }
                    : undefined
                }
                onRestore={canFilterByAgent ? (client) => restoreMutation.mutate(client.id) : undefined}
                convertingId={convertingId}
              />
              {meta && meta.total > 0 && (
                <div className="border-t border-border px-6 py-4">
                  <DataTablePagination
                    meta={meta}
                    onPage={(page) => setFilters({ ...filters, page })}
                    onLimit={(limit) => updateFilters({ limit })}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="Aucun client trouvé"
                description="Commencez par ajouter votre premier client"
                action={
                  <Link href="/crm/clients/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau client
                    </Button>
                  </Link>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}