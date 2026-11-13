'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';

import {
  transactionsService,
  type TransactionFilters,
} from '@/services/transactions.service';
import { agentsService } from '@/services/agents.service';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/use-debounce';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { ExportExcelButton } from '@/components/shared/export-excel-button';
import {
  TransactionsFiltersBar,
} from '@/components/transactions/transactions-filters-bar';
import {
  TransactionsTable,
  TransactionsTableSkeleton,
} from '@/components/transactions/transactions-table';

const DEFAULT_LIMIT = 20;

export default function TransactionsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [filters, setFilters] = usePersistentState<TransactionFilters>('transactions', {
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const debouncedFilters = useDebounce(filters, 300);

  const updateFilters = (patch: Partial<TransactionFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: 1,
    }));
  };

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    enabled: canManage,
    staleTime: 5 * 60_000,
  });

  const {
    data: txData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.transactions.list(debouncedFilters),
    queryFn: () => transactionsService.getAll(debouncedFilters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const rows = txData?.data ?? [];
  const meta = txData?.meta;
  const total = meta?.total ?? rows.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Ventes et locations finalisées"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportExcelButton type="transactions" />
            {canManage && (
              <Link href="/crm/transactions/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle transaction
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <TransactionsFiltersBar
            filters={filters}
            agents={agents}
            canManage={canManage}
            onChange={updateFilters}
            onReset={() => setFilters({ page: 1, limit: DEFAULT_LIMIT })}
          />
        </CardContent>
      </Card>

      <Card
        className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Liste ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TransactionsTableSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-destructive">
                {getErrorMessage(error)}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune transaction trouvée"
              description="Aucune transaction ne correspond à vos critères de recherche."
            />
          ) : (
            <>
<TransactionsTable
  items={rows}
  canManage={canManage}
  canDelete={user?.role === 'ADMIN'}
/>              {meta && meta.total > 0 && (
                <div className="border-t border-border px-6 py-4">
                  <DataTablePagination
                    meta={meta}
                    onPage={(page) => setFilters({ ...filters, page })}
                    onLimit={(limit) => updateFilters({ limit })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
