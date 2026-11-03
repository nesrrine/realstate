'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, Mail, MoreHorizontal, Pencil, Phone, UserCheck, UserPlus, Clock, CheckCircle2, AlertCircle, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Client, ClientType, FollowUpStatus } from '@/services/clients.service';
import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPE_STYLES,
  fullName,
} from '@/lib/property-constants';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';

interface Props {
  items: Client[];
  canFilterByAgent?: boolean;
  canMerge?: boolean;
  isLoading?: boolean;
  onConvert?: (client: Client) => void;
  onMerge?: (sourceId: string | number, targetId: string | number) => void;
  /** Gérant / admin : suppression (fiche masquée, historique conservé) et restauration */
  onDelete?: (client: Client) => void;
  onRestore?: (client: Client) => void;
  convertingId?: number | string | null;
  mergingSourceId?: string | number | null;
}

function ClientTypeBadge({ clientType }: { clientType?: ClientType }) {
  if (!clientType) {
    return <Badge variant="secondary">—</Badge>;
  }
  return (
    <Badge variant="outline" className={CLIENT_TYPE_STYLES[clientType]}>
      {CLIENT_TYPE_LABELS[clientType]}
    </Badge>
  );
}

function StatusBadge({ status, onConvert, converting }: { status?: 'PROSPECT' | 'CLIENT'; onConvert?: () => void; converting?: boolean }) {
  if (status === 'CLIENT') {
    return (
      <Badge variant="default" className="flex items-center gap-1.5 bg-green-100 text-green-700 border-green-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Client confirmé
      </Badge>
    );
  }
  if (status === 'PROSPECT') {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-blue-50 text-blue-700 border-blue-100" onClick={onConvert}>
        <AlertCircle className="h-3.5 w-3.5" />
        Prospect
        {onConvert && (
          <Button variant="outline" size="icon" className="ml-1 h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onConvert(); }}>
            {converting ? <Clock className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
          </Button>
        )}
      </Badge>
    );
  }
  return <Badge variant="secondary">—</Badge>;
}

function FollowUpStatusBadge({ status }: { status?: FollowUpStatus }) {
  // Variantes réelles du composant Badge (les anciennes « badge-xxx » n'existaient pas)
  const styles: Record<FollowUpStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
    TO_CONTACT: { variant: 'outline' },
    CONTACTED: { variant: 'secondary' },
    NEGOTIATION: { variant: 'default' },
    WON: { variant: 'outline', className: 'border-green-200 bg-green-100 text-green-700' },
    LOST: { variant: 'destructive' },
  };
  const labels: Record<FollowUpStatus, string> = {
    TO_CONTACT: 'À contacter',
    CONTACTED: 'Contacté',
    NEGOTIATION: 'Négociation',
    WON: 'Gagné',
    LOST: 'Perdu',
  };
  if (!status) return <Badge variant="outline">—</Badge>;
  return (
    <Badge variant={styles[status].variant} className={styles[status].className}>
      {labels[status]}
    </Badge>
  );
}

function formatBudget(value?: number) {
  if (!value) return '—';
  return formatPrice(Number(value));
}

export function ClientsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ClientsTable({
  items,
  canFilterByAgent = false,
  canMerge = false,
  isLoading = false,
  onConvert,
  onMerge,
  onDelete,
  onRestore,
  convertingId = null,
}: Props) {
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [localMergeSource, setLocalMergeSource] = useState<string | number | null>(null);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Suivi</TableHead>
            <TableHead>Dernière interaction</TableHead>
            <TableHead>Prochaine relance</TableHead>
            <TableHead>Contact</TableHead>
            {canFilterByAgent && <TableHead>Agent</TableHead>}
            <TableHead>Budget</TableHead>
            <TableHead>Date d&apos;ajout</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/crm/clients/${client.id}`}
                  className="hover:underline"
                >
                  {client.firstName} {client.lastName}
                </Link>
              </TableCell>
              <TableCell>
                <ClientTypeBadge clientType={client.clientType} />
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={client.status}
                  onConvert={client.status === 'PROSPECT' ? () => onConvert?.(client) : undefined}
                  converting={convertingId === client.id}
                />
              </TableCell>
              <TableCell>
                <FollowUpStatusBadge status={client.followUpStatus} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {client.lastInteractionAt ? new Date(client.lastInteractionAt).toLocaleDateString('fr-FR') : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {client.nextFollowUpAt ? new Date(client.nextFollowUpAt).toLocaleDateString('fr-FR') : '—'}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {client.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {client.phone}
                  </div>
                </div>
              </TableCell>
              {canFilterByAgent && (
                <TableCell className="text-sm">
                  {client.agent?.user ? fullName(client.agent.user) : '—'}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap">
                {formatBudget(client.budget)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(client.createdAt).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isLoading}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/crm/clients/${client.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir détails
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/crm/clients/${client.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </Link>
                    </DropdownMenuItem>
                    {client.status === 'PROSPECT' && onConvert && (
                      <DropdownMenuItem
                        onClick={() => onConvert(client)}
                        disabled={convertingId === client.id}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {convertingId === client.id ? 'Conversion...' : 'Convertir en client'}
                      </DropdownMenuItem>
                    )}
                    {canMerge && (
                      <>
                        {localMergeSource === client.id ? (
                          <div className="p-2 space-y-2">
                            <p className="px-2 text-sm text-muted-foreground">Fusionner avec :</p>
                            <Select
                              value={mergeTargetId || ''}
                              onValueChange={setMergeTargetId}
                            >
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Choisir la cible" />
                              </SelectTrigger>
                              <SelectContent>
                                {items
                                  .filter((c) => c.id !== client.id)
                                  .map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                      {c.firstName} {c.lastName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setLocalMergeSource(null);
                                  setMergeTargetId('');
                                }}
                              >
                                Annuler
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={!mergeTargetId || isLoading}
                                onClick={() => {
                                  if (!mergeTargetId) return;
                                  onMerge?.(client.id, mergeTargetId);
                                  setLocalMergeSource(null);
                                  setMergeTargetId('');
                                }}
                              >
                                Confirmer fusion
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setLocalMergeSource(client.id);
                              setMergeTargetId('');
                            }}
                            disabled={isLoading}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Fusionner avec un autre client
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {client.isActive === false
                      ? onRestore && (
                          <DropdownMenuItem onClick={() => onRestore(client)} disabled={isLoading}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restaurer le client
                          </DropdownMenuItem>
                        )
                      : onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDelete(client)}
                              disabled={isLoading}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer le client
                            </DropdownMenuItem>
                          </>
                        )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}