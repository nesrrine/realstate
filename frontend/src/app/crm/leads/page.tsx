'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { UserPlus, Plus, Mail, FileText } from 'lucide-react';

import { leadsService, type Lead, type LeadFilters, type LeadStatus, type LeadSource } from '@/services/leads.service';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { usePersistentState } from '@/hooks/use-persistent-state';

const DEFAULT_LIMIT = 20;

const STATUS_OPTIONS: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'NEGOTIATION', 'WON', 'LOST'];
const SOURCE_OPTIONS: LeadSource[] = ['WEBSITE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'PHONE', 'WALK_IN', 'REFERRAL', 'OTHER'];

export default function LeadsPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [filters, setFilters] = usePersistentState<LeadFilters>('leads', {
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const debouncedFilters = useDebounce(filters, 300);

  const updateFilters = (patch: Partial<LeadFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leads.list(debouncedFilters),
    queryFn: () => leadsService.getAll(debouncedFilters),
    enabled: !authLoading && !!user,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const list: Lead[] = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? list.length;
  const totalPages = meta?.totalPages ?? 1;

  const getStatusColor = (status: LeadStatus) => leadsService.statusColors[status];

  const formatDate = (dateString: string) =>
    formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <div>
            <div className="h-7 w-48 bg-slate-200 animate-pulse rounded mb-2"></div>
            <div className="h-4 w-64 bg-slate-200 animate-pulse rounded"></div>
          </div>
          <div className="h-10 w-36 bg-slate-200 animate-pulse rounded"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-slate-200 animate-pulse rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Gérez vos prospects et demandes de contact"
        actions={
          <Link href="/crm/leads/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau lead
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtres</CardTitle>
            <Badge variant="secondary">{total} lead{total !== 1 ? 's' : ''}</Badge>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Select
              value={filters.status ?? ''}
              onValueChange={(val) => updateFilters({ status: val ? val as LeadStatus : undefined })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{leadsService.statusLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.source ?? ''}
              onValueChange={(val) => updateFilters({ source: val ? val as LeadSource : undefined })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Toutes les sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les sources</SelectItem>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{leadsService.sourceLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filters.status || filters.source) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ page: 1, limit: DEFAULT_LIMIT })}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {list.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Aucun lead"
              description="Aucun lead ne correspond à vos critères."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Propriété</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Créé</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                              <UserPlus className="h-4 w-4 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {lead.client?.firstName} {lead.client?.lastName}
                              </p>
                              {lead.client?.email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {lead.client.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{lead.properties?.[0]?.property?.title ?? '—'}</p>
                          <p className="text-sm text-muted-foreground">{lead.properties?.[0]?.property?.city ?? ''}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {leadsService.sourceLabels[lead.source]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>
                            {leadsService.statusLabels[lead.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.budget ? `${Number(lead.budget).toLocaleString('fr-FR')} DT` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(lead.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/crm/leads/${lead.id}`}>
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                meta={{
                  page: meta?.page ?? 1,
                  limit: meta?.limit ?? DEFAULT_LIMIT,
                  total,
                  totalPages,
                  hasNext: meta?.hasNext,
                  hasPrev: meta?.hasPrev,
                }}
                onPage={(page) => setFilters((f) => ({ ...f, page }))}
                onLimit={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
