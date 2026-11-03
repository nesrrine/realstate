'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Edit, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ownersService } from '@/services/owners.service';
import { queryKeys } from '@/lib/query-keys';
import { formatPrice } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import {
  STATUS_LABELS,
  TRANSACTION_LABELS,
  TRANSACTION_STATUS_LABELS,
  TYPE_LABELS,
  fullName,
} from '@/lib/property-constants';
import { useAuth } from '@/providers/AuthProvider';

export default function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { isManager, isAdmin, isLoading: authLoading } = useAuth();
  const canManage = isManager || isAdmin;

  const { data: owner, isLoading } = useQuery({
    queryKey: queryKeys.owners.detail(id),
    queryFn: () => ownersService.getById(id),
    enabled: !!id && canManage,
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      if (owner!.isActive) await ownersService.deactivate(id);
      else await ownersService.update(id, { isActive: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.owners.all });
      toast.success(owner!.isActive ? 'Propriétaire désactivé' : 'Propriétaire réactivé');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (authLoading || (canManage && isLoading)) {
    return <div className="py-12 text-center">Chargement...</div>;
  }
  if (!canManage) {
    return <div className="py-12 text-center">Accès réservé aux managers et administrateurs.</div>;
  }
  if (!owner) return <div className="py-12 text-center">Propriétaire introuvable</div>;

  const address = [owner.address, owner.zipCode, owner.city].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/owners">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{fullName(owner)}</h1>
              <Badge variant={owner.isActive ? 'default' : 'secondary'}>
                {owner.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            <p className="text-muted-foreground">Fiche propriétaire</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
            >
              {owner.isActive ? 'Désactiver' : 'Réactiver'}
            </Button>
          )}
          <Link href={`/crm/owners/${id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${owner.phone}`} className="hover:underline">{owner.phone}</a>
            </p>
            {owner.whatsapp && (
              <p className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                {owner.whatsapp}
              </p>
            )}
            {owner.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${owner.email}`} className="hover:underline">{owner.email}</a>
              </p>
            )}
            {address && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {address}
              </p>
            )}
            {owner.notes && (
              <div className="border-t border-border pt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{owner.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Biens ({owner.properties.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {owner.properties.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bien</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owner.properties.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/crm/properties/${p.id}`} className="font-medium hover:underline">
                          {p.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {p.city} · {p.surface} m²
                        </div>
                      </TableCell>
                      <TableCell>{TYPE_LABELS[p.type] ?? p.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABELS[p.status] ?? p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(Number(p.price))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Building2 className="mx-auto mb-2 h-8 w-8" />
                Aucun bien pour ce propriétaire
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {owner.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dernières transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bien</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owner.transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/crm/transactions/${t.id}`} className="hover:underline">
                        {t.property?.title ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{TRANSACTION_LABELS[t.type] ?? t.type}</TableCell>
                    <TableCell>{TRANSACTION_STATUS_LABELS[t.status] ?? t.status}</TableCell>
                    <TableCell>
                      {t.date ? new Date(t.date).toLocaleDateString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(Number(t.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
