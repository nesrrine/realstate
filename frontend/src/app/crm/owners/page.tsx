'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Plus, Search } from 'lucide-react';

import { ownersService, type OwnerFilters } from '@/services/owners.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fullName } from '@/lib/property-constants';
import { queryKeys } from '@/lib/query-keys';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { useAuth } from '@/providers/AuthProvider';
import { usePersistentState } from '@/hooks/use-persistent-state';

export default function OwnersPage() {
  // La fiche et la modification sont réservées aux managers et admins (API)
  const { isManager, isAdmin } = useAuth();
  const canManage = isManager || isAdmin;
  const [filters, setFilters] = usePersistentState<OwnerFilters>('proprietaires', { page: 1, limit: 20 });

  const { data: list, isLoading } = useQuery({
    queryKey: queryKeys.owners.list(filters),
    queryFn: () => ownersService.getList(filters),
  });

  const owners = list?.data ?? [];
  const total = list?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propriétaires</h1>
          <p className="text-muted-foreground">
            {total} propriétaire(s) · les personnes qui vous confient leurs biens
          </p>
        </div>
        <Link href="/crm/owners/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau propriétaire
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, téléphone, email, ville..."
              className="pl-9"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, page: 1 })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-12 text-center">Chargement...</div>
          ) : owners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Biens</TableHead>
                  <TableHead>Statut</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">{fullName(owner)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{owner.phone ?? '—'}</div>
                      {owner.email && (
                        <div className="text-xs text-muted-foreground">{owner.email}</div>
                      )}
                    </TableCell>
                    <TableCell>{owner.city || '—'}</TableCell>
                    <TableCell>{owner._count?.properties ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={owner.isActive ? 'default' : 'secondary'}>
                        {owner.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Link href={`/crm/owners/${owner.id}`}>
                          <Button variant="outline" size="sm">
                            Voir
                          </Button>
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <KeyRound className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Aucun propriétaire</h3>
              <p className="mb-4 text-muted-foreground">
                {filters.search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier propriétaire.'}
              </p>
              <Link href="/crm/owners/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau propriétaire
                </Button>
              </Link>
            </div>
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
