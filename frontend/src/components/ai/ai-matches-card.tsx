'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Loader2, Phone, Sparkles, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { aiService } from '@/services/ai.service';
import { formatPrice } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { TYPE_LABELS } from '@/lib/property-constants';
import { cn } from '@/lib/utils';

const scoreClass = (s: number) =>
  s >= 75 ? 'bg-green-100 text-green-700' : s >= 55 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';

/** Biens recommandés pour un client (fiche client). */
export function AiPropertyMatchesCard({ clientId }: { clientId: string }) {
  const m = useMutation({
    mutationFn: () => aiService.matchForClient(clientId),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const matches = m.data?.matches;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Biens recommandés (IA)
          </CardTitle>
          <CardDescription>Classés selon le budget, les zones et les critères du client.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
          {matches ? 'Relancer' : 'Trouver des biens'}
        </Button>
      </CardHeader>
      <CardContent>
        {!matches ? (
          <p className="text-sm text-muted-foreground">Cliquez sur « Trouver des biens » pour lancer l&apos;analyse.</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun bien disponible ne correspond à cette recherche.</p>
        ) : (
          <ul className="divide-y divide-border">
            {matches.map((r) => (
              <li key={r.id} className="flex gap-3 py-3">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {r.property.coverUrl ? (
                    <Image src={r.property.coverUrl} alt="" fill sizes="80px" className="object-cover" />
                  ) : (
                    <Building2 className="m-auto mt-5 h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/crm/properties/${r.property.id}`} className="font-medium hover:underline">
                      {r.property.title}
                    </Link>
                    <Badge className={cn('shrink-0 border-0', scoreClass(r.score))}>{r.score}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[r.property.type] ?? r.property.type} · {r.property.city} · {r.property.surface} m² ·{' '}
                    {formatPrice(Number(r.property.price))}
                  </p>
                  <p className="mt-1 text-sm">{r.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Clients intéressés par un bien (fiche bien). */
export function AiClientMatchesCard({ propertyId }: { propertyId: string }) {
  const m = useMutation({
    mutationFn: () => aiService.matchForProperty(propertyId),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const matches = m.data?.matches;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Clients intéressés (IA)
          </CardTitle>
          <CardDescription>Clients dont la recherche correspond à ce bien.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Users className="mr-1 h-4 w-4" />}
          {matches ? 'Relancer' : 'Trouver des clients'}
        </Button>
      </CardHeader>
      <CardContent>
        {!matches ? (
          <p className="text-sm text-muted-foreground">Cliquez sur « Trouver des clients » pour lancer l&apos;analyse.</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun client actif ne correspond à ce bien.</p>
        ) : (
          <ul className="divide-y divide-border">
            {matches.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/crm/clients/${r.client.id}`} className="font-medium hover:underline">
                    {r.client.firstName} {r.client.lastName}
                  </Link>
                  <Badge className={cn('shrink-0 border-0', scoreClass(r.score))}>{r.score}%</Badge>
                </div>
                <a
                  href={`tel:${r.client.phone}`}
                  className="flex items-center text-xs text-muted-foreground hover:underline"
                >
                  <Phone className="mr-1 h-3 w-3" />
                  {r.client.phone}
                </a>
                <p className="mt-1 text-sm">{r.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
