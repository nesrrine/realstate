'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  commissionsService,
  type CommissionFilters,
  type CommissionPaymentStatus,
} from '@/services/commissions.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getErrorMessage } from '@/lib/errors';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { useAuth } from '@/providers/AuthProvider';
import { usePersistentState } from '@/hooks/use-persistent-state';

function formatDt(value: number | string) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 2 }).format(n);
}

const paymentLabel: Record<CommissionPaymentStatus, string> = {
  PENDING: 'En attente',
  PAID: 'Payée',
  CANCELLED: 'Annulée',
};

export default function CommissionsPage() {
  const { user } = useAuth();
  const canManageConfig = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const qc = useQueryClient();
  const [filters, setFilters] = usePersistentState<CommissionFilters>('commissions', { page: 1, limit: 20 });
  const [rateInput, setRateInput] = useState('');
  const [fieldShareInput, setFieldShareInput] = useState('');
  const [officeShareInput, setOfficeShareInput] = useState('');

  const { data: list, isLoading } = useQuery({
    queryKey: ['commissions', filters],
    queryFn: () => commissionsService.getAll(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['commissions', 'stats'],
    queryFn: () => commissionsService.getStats(),
  });

  const { data: config } = useQuery({
    queryKey: ['commissions', 'config'],
    queryFn: () => commissionsService.getConfig(),
  });

  const saveConfig = useMutation({
    mutationFn: () =>
      commissionsService.updateConfig({
        commissionRate: rateInput ? parseFloat(rateInput) / 100 : undefined,
        fieldAgentShareRate: fieldShareInput ? parseFloat(fieldShareInput) / 100 : undefined,
        officeAgentShareRate: officeShareInput ? parseFloat(officeShareInput) / 100 : undefined,
      }),
    onSuccess: () => {
      toast.success('Configuration enregistrée');
      qc.invalidateQueries({ queryKey: ['commissions', 'config'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) =>
      commissionsService.update(id, { paymentStatus: 'PAID' }),
    onSuccess: () => {
      toast.success('Commission marquée comme payée');
      qc.invalidateQueries({ queryKey: ['commissions'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rows = list?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground">Répartition agence / agent et paiements</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatDt(stats?.totalAmount ?? 0)} DT
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Payé</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">
            {formatDt(stats?.paidAmount ?? 0)} DT
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En attente</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">
            {formatDt(stats?.unpaidAmount ?? 0)} DT
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Part agence</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatDt(stats?.totalAgencyAmount ?? 0)} DT
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuration des taux
          </CardTitle>
          <CardDescription>
            Actuel : {(Number(config?.commissionRate ?? 0.02) * 100).toFixed(2)} % — terrain{' '}
            {(Number(config?.fieldAgentShareRate ?? 0.3) * 100).toFixed(0)} % — bureau{' '}
            {(Number(config?.officeAgentShareRate ?? 0.2) * 100).toFixed(0)} %. Exemple : 250 000 DT × 2
            % = 5 000 DT de commission totale.
          </CardDescription>
        </CardHeader>
        {canManageConfig ? (
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Taux commission global (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="2"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Part agent terrain (%)</Label>
              <Input
                type="number"
                step="1"
                placeholder="30"
                value={fieldShareInput}
                onChange={(e) => setFieldShareInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Part agent bureau (%)</Label>
              <Input
                type="number"
                step="1"
                placeholder="20"
                value={officeShareInput}
                onChange={(e) => setOfficeShareInput(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => saveConfig.mutate()}
              disabled={saveConfig.isPending || (!rateInput && !fieldShareInput && !officeShareInput)}
            >
              Enregistrer
            </Button>
          </CardContent>
        ) : (
          <CardContent className="text-sm text-muted-foreground">
            Seuls les administrateurs et managers peuvent modifier les taux.
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Commissions ({list?.meta.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">Aucune commission.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>Agence</TableHead>
                  <TableHead>Agent terrain</TableHead>
                  <TableHead>Agent bureau</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.transaction?.property?.title ?? c.transactionId}
                    </TableCell>
                    <TableCell>
                      {(Number(c.commissionRate) * 100).toFixed(2)} %
                    </TableCell>
                    <TableCell>{formatDt(c.agencyAmount)} DT</TableCell>
                    <TableCell>{formatDt(c.fieldAgentAmount)} DT</TableCell>
                    <TableCell>{formatDt(c.officeAgentAmount)} DT</TableCell>
                    <TableCell>{formatDt(c.amount)} DT</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.paymentStatus === 'PAID' ? 'default' : 'secondary'
                        }
                      >
                        {paymentLabel[c.paymentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageConfig && c.paymentStatus === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markPaid.mutate(c.id)}
                          disabled={markPaid.isPending}
                        >
                          Marquer payée
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {list?.meta && list.meta.total > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <DataTablePagination
                meta={list.meta}
                onPage={(page) => setFilters((f) => ({ ...f, page }))}
                onLimit={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
