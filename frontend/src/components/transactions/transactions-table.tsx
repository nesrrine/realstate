
'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import {
  transactionsService,
  type Transaction,
  type TransactionStatus,
  type TransactionType,
} from '@/services/transactions.service';

import {
  TRANSACTION_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_STYLES,
  fullName,
} from '@/lib/property-constants';
import { getErrorMessage } from '@/lib/errors';

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  SALE: TRANSACTION_LABELS.SALE,
  RENTAL: TRANSACTION_LABELS.RENTAL,
};

const TRANSACTION_TYPE_STYLES: Record<TransactionType, string> = {
  SALE: 'bg-blue-100 text-blue-700 border-blue-200',
  RENTAL: 'bg-teal-100 text-teal-700 border-teal-200',
};

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge variant="outline" className={TRANSACTION_TYPE_STYLES[type]}>
      {TRANSACTION_TYPE_LABELS[type]}
    </Badge>
  );
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <Badge variant="outline" className={TRANSACTION_STATUS_STYLES[status]}>
      {TRANSACTION_STATUS_LABELS[status]}
    </Badge>
  );
}

function formatAmount(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;

  if (Number.isNaN(n)) return '—';

  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(n);
}

export function TransactionsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

interface Props {
  items: Transaction[];
  canManage?: boolean;
  canDelete?: boolean;
}

export function TransactionsTable({
  items,
  canManage = false,
  canDelete = false,
}: Props) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsService.remove(id),
    onSuccess: () => {
      toast.success('Transaction supprimée');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handleDelete = (id: string) => {
    const confirmed = window.confirm(
      'Voulez-vous vraiment supprimer cette transaction ? Cette action est irréversible.',
    );

    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bien</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Agent terrain</TableHead>
            <TableHead>Agent bureau</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Commission</TableHead>
            {(canManage || canDelete) && (
              <TableHead className="text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>
                <Link
                  href={`/crm/transactions/${tx.id}`}
                  className="font-medium hover:underline"
                >
                  {tx.property?.title ?? tx.propertyId}
                  {tx.property?.city ? ` (${tx.property.city})` : ''}
                </Link>
              </TableCell>

              <TableCell>
                {tx.client
                  ? `${tx.client.firstName} ${tx.client.lastName}`
                  : tx.clientId}
              </TableCell>

              <TableCell className="text-sm">
                {tx.fieldAgent?.user ? fullName(tx.fieldAgent.user) : '—'}
              </TableCell>

              <TableCell className="text-sm">
                {tx.officeAgent?.user ? fullName(tx.officeAgent.user) : '—'}
              </TableCell>

              <TableCell>
                <TransactionTypeBadge type={tx.type} />
              </TableCell>

              <TableCell className="whitespace-nowrap">
                {formatAmount(tx.amount)}
              </TableCell>

              <TableCell>
                <TransactionStatusBadge status={tx.status} />
              </TableCell>

              <TableCell className="text-sm">
                {tx.date
                  ? new Date(tx.date).toLocaleDateString('fr-FR')
                  : '—'}
              </TableCell>

              <TableCell className="text-sm">
                {tx.commission ? formatAmount(tx.commission.amount) : '—'}
              </TableCell>

              {(canManage || canDelete) && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/crm/transactions/${tx.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </Link>
                      </DropdownMenuItem>

                      {canManage && (
                        <DropdownMenuItem asChild>
                          <Link href={`/crm/transactions/${tx.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={deleteMutation.isPending}
                          onSelect={() => handleDelete(tx.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
