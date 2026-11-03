'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Bath, BedDouble, Building2, Eye, EyeOff, Loader2, MapPin,
  MoreHorizontal, Pencil, Ruler, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Property } from '@/services/properties.service';
import { formatPrice } from '@/lib/format';
import { TRANSACTION_LABELS, TYPE_LABELS, fullName, toNumber, getVisitsCount } from '@/lib/property-constants';
import { PublicationBadge, StatusBadge } from './property-badges';

interface Props {
  items: Property[];
  busyId?: string | null;
  onTogglePublish: (property: Property) => void;
  /** Absent : suppression non autorisée (agent) */
  onDelete?: (property: Property) => void;
  /** Modifier / publier : gérant, ou agent sur ses propres biens */
  canEdit?: (property: Property) => boolean;
}

export function PropertiesCards({ items, busyId, onTogglePublish, onDelete, canEdit = () => true }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => {
        const cover = p.images?.[0];
        const busy = busyId === p.id;

        return (
          <Card key={p.id} className={`overflow-hidden p-0 transition-all hover:shadow-lg hover:border-slate-300 ${busy ? 'opacity-60' : ''}`}>
            {/* Photo */}
            <div className="relative aspect-video bg-muted">
              <Link href={`/crm/properties/${p.id}/edit`} className="block h-full w-full">
                {cover ? (
                  <Image
                    src={cover.url}
                    alt={p.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-100">
                    <Building2 className="h-14 w-14 text-muted-foreground" />
                  </div>
                )}
              </Link>

              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                <StatusBadge status={p.status} />
                <span className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm">
                  <Eye className="h-3 w-3" />
                  {getVisitsCount(p)}
                </span>
              </div>

              <div className="absolute right-2 top-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/crm/properties/${p.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> Voir détails
                      </Link>
                    </DropdownMenuItem>
                    {canEdit(p) && (
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
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(p)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {p.images?.length > 1 && (
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  {p.images.length} photos
                </span>
              )}
            </div>

            {/* Contenu */}
            <div className="space-y-3 p-4">
              <div>
                <Link href={`/crm/properties/${p.id}/edit`} className="line-clamp-1 font-semibold hover:underline flex items-center gap-2">
                  <span className="truncate">{p.title}</span>
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                    {p.reference || p.id.slice(0, 8)}
                  </span>
                </Link>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1">{p.address}, {p.city}</span>
                </p>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(toNumber(p.price))}
                    {p.transactionType === 'RENTAL' && (
                      <span className="text-xs font-normal text-muted-foreground"> /mois</span>
                    )}
                  </div>
                  {p.pricePerSqm != null && (
                    <div className="text-xs text-muted-foreground">{formatPrice(toNumber(p.pricePerSqm))}/m²</div>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{TYPE_LABELS[p.type]}</div>
                  <div>{TRANSACTION_LABELS[p.transactionType]}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-border pt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Ruler className="h-4 w-4" />{p.surface} m²</span>
                {p.bedrooms != null && (
                  <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{p.bedrooms}</span>
                )}
                {p.bathrooms != null && (
                  <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{p.bathrooms}</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <PublicationBadge published={p.isPublished} />
                <span className="text-xs text-muted-foreground">
                  Agent: {fullName(p.agent?.user)}
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}