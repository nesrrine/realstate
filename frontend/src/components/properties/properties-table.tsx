'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpDown, Building2, Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Ruler, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Property, PropertyFilters } from '@/services/properties.service';
import { formatPrice } from '@/lib/format';
import { TRANSACTION_LABELS, TYPE_LABELS, fullName, toNumber, getVisitsCount } from '@/lib/property-constants';
import { PublicationBadge, StatusBadge } from './property-badges';
import React from 'react';

export type SortField = NonNullable<PropertyFilters['sortBy']>;

function SortHead({
  label, field, sortBy, sortOrder, onSort, className,
}: {
  label: string;
  field: SortField;
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = sortBy === field;
  return (
    <TableHead className={className}>
      <button type="button" onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 ${active ? 'text-foreground' : ''}`}>
        {label}
        <ArrowUpDown className="h-3 w-3" />
        {active && <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </TableHead>
  );
}

interface Props {
  items: Property[];
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
  busyId?: string | null;
  onSort: (field: SortField) => void;
  onTogglePublish: (property: Property) => void;
  /** Absent : suppression non autorisée (agent) */
  onDelete?: (property: Property) => void;
  /** Modifier / publier : gérant, ou agent sur ses propres biens */
  canEdit?: (property: Property) => boolean;
}

function PropertiesTableInner({
  items, sortBy, sortOrder, busyId, onSort, onTogglePublish, onDelete, canEdit = () => true,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <SortHead label="Bien" field="title" {...{ sortBy, sortOrder, onSort }} className="w-[280px]" />
          <TableHead>Type</TableHead>
          <SortHead label="Prix" field="price" {...{ sortBy, sortOrder, onSort }} className="w-[140px]" />
          <SortHead label="Surface" field="surface" {...{ sortBy, sortOrder, onSort }} className="w-[120px]" />
          <TableHead className="w-[80px] text-center">Visites</TableHead>
          <TableHead className="w-[140px]">Agent</TableHead>
          <TableHead className="w-[100px]">Statut</TableHead>
          <TableHead className="w-[100px]">Publication</TableHead>
          <SortHead label="Créé le" field="createdAt" {...{ sortBy, sortOrder, onSort }} className="w-[120px]" />
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((p) => {
          const cover = p.images?.[0];
          const busy = busyId === p.id;
          const editable = canEdit(p);
          return (
            <TableRow key={p.id} className={busy ? 'opacity-60' : undefined}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted border">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt={p.title}
                        width={64}
                        height={48}
                        sizes="64px"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link href={editable ? `/crm/properties/${p.id}/edit` : `/crm/properties/${p.id}`}
                      className="line-clamp-1 font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="line-clamp-1 text-xs font-mono text-muted-foreground">
                      {p.reference}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {p.address}, {p.city}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div className="text-sm">{TYPE_LABELS[p.type]}</div>
                <div className="text-xs text-muted-foreground">{TRANSACTION_LABELS[p.transactionType]}</div>
              </TableCell>

              <TableCell className="whitespace-nowrap">
                <div className="font-semibold">
                  {formatPrice(toNumber(p.price))}
                  {p.transactionType === 'RENTAL' && (
                    <span className="text-xs font-normal text-muted-foreground"> /mois</span>
                  )}
                </div>
                {p.pricePerSqm != null && (
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(toNumber(p.pricePerSqm))}/m²
                  </div>
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap">
                <span className="inline-flex items-center gap-1 text-sm">
                  <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                  {p.surface} m²
                </span>
              </TableCell>

              <TableCell className="whitespace-nowrap text-center font-medium">
                <span className="inline-flex items-center justify-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                  {getVisitsCount(p)}
                </span>
              </TableCell>

              <TableCell className="whitespace-nowrap text-sm">
                {fullName(p.agent?.user)}
              </TableCell>

              <TableCell><StatusBadge status={p.status} /></TableCell>
              <TableCell><PublicationBadge published={p.isPublished} /></TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {new Date(p.createdAt).toLocaleDateString('fr-FR')}
              </TableCell>

              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/crm/properties/${p.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> Voir détails
                      </Link>
                    </DropdownMenuItem>
                    {editable && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={`/crm/properties/${p.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTogglePublish(p)}>
                          {p.isPublished ? (
                            <><EyeOff className="mr-2 h-4 w-4" /> Dépublier</>
                          ) : (
                            <><Eye className="mr-2 h-4 w-4" /> Publier</>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(p)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// React.memo : évite les re-renders inutiles lorsque les props ne changent pas
// (par exemple lors d'un changement de filtre dans la page parente).
export const PropertiesTable = React.memo(PropertiesTableInner);