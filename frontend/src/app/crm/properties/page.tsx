'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Map,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  propertiesService,
  type Property,
  type PropertyFilters,
} from '@/services/properties.service';
import { agentsService } from '@/services/agents.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/providers/AuthProvider';
import { canDelete, canEditProperty } from '@/lib/permissions';

import { PropertyFiltersBar } from '@/components/properties/property-filters-bar';
import {
  PropertiesTable,
  type SortField,
} from '@/components/properties/properties-table';
import { PropertiesPagination } from '@/components/properties/properties-pagination';
import { PropertiesCards } from '@/components/properties/properties-cards';
import { PropertiesMapView } from '@/components/properties/properties-map-view';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { ExportExcelButton } from '@/components/shared/export-excel-button';

const DEFAULT_FILTERS: PropertyFilters = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

type ViewMode = 'table' | 'cards' | 'map';

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Plus récents' },
  { value: 'createdAt:asc', label: 'Plus anciens' },
  { value: 'price:asc', label: 'Prix croissant' },
  { value: 'price:desc', label: 'Prix décroissant' },
  { value: 'surface:desc', label: 'Surface décroissante' },
  { value: 'title:asc', label: 'Titre A → Z' },
];

// Initialisation lazy de la vue depuis localStorage : évite un useEffect + re-render.
function getInitialView(): ViewMode {
  if (typeof window === 'undefined') return 'table';
  const saved = localStorage.getItem('properties-view');
  return saved === 'table' || saved === 'cards' || saved === 'map' ? saved : 'table';
}

// ── Page ─────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  // Filtres retrouvés au retour d'une fiche bien
  const [filters, setFilters] = usePersistentState<PropertyFilters>('biens', DEFAULT_FILTERS);

  const [toDelete, setToDelete] = useState<Property | null>(null);

  // Mode d'affichage : tableau, cartes ou carte géographique.
  const [view, setView] = useState<ViewMode>(getInitialView);

  const changeView = useCallback((newView: ViewMode) => {
    setView(newView);
    localStorage.setItem('properties-view', newView);
  }, []);

  // Éviter une requête API à chaque frappe dans les filtres.
  const debouncedFilters = useDebounce(filters, 300);

  // Toute modification d'un filtre ramène à la première page.
  const updateFilters = useCallback(
    (patch: Partial<PropertyFilters>) => {
      setFilters((current) => ({
        ...current,
        ...patch,
        page: 1,
      }));
    },
    [],
  );

  // Chargement des biens.
  // enabled : on attend que l'utilisateur soit chargé (évite les requêtes sans token).
  // placeholderData = keepPreviousData : l'écran ne saute pas lors d'un changement de filtre.
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.properties.list(debouncedFilters),
    queryFn: () => propertiesService.getAll(debouncedFilters),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  // Liste des agents pour les filtres.
  // Clé dédiée aux agents (et non queryKeys.properties.all).
  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    enabled: !!user,
    retry: false,
    staleTime: 5 * 60_000,
  });

  // Publication / dépublication.
  const publishMutation = useMutation({
    mutationFn: ({
      id,
      publish,
    }: {
      id: string;
      publish: boolean;
    }) =>
      publish
        ? propertiesService.publish(id)
        : propertiesService.unpublish(id),

    onSuccess: (_data, { publish }) => {
      toast.success(publish ? 'Bien publié' : 'Bien dépublié');

      qc.invalidateQueries({
        queryKey: queryKeys.properties.all,
      });
    },

    onError: (e) => {
      toast.error(getErrorMessage(e));
    },
  });

  // Suppression d'un bien.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => propertiesService.remove(id),

    onSuccess: () => {
      toast.success('Bien supprimé');
      setToDelete(null);

      qc.invalidateQueries({
        queryKey: queryKeys.properties.all,
      });
    },

    onError: (e) => {
      toast.error(getErrorMessage(e));
      setToDelete(null);
    },
  });

  // Tri du tableau.
  const handleSort = (field: SortField) => {
    setFilters((current) => ({
      ...current,
      page: 1,
      sortBy: field,
      sortOrder:
        current.sortBy === field
          ? current.sortOrder === 'desc'
            ? 'asc'
            : 'desc'
          : field === 'title'
            ? 'asc'
            : 'desc',
    }));
  };

  const items = data?.data ?? [];

  // Désactiver les actions pendant une mutation.
  const busyId = publishMutation.isPending
    ? publishMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables
      : null;

  // Tri utilisé dans la vue cartes.
  const selectedSort = `${filters.sortBy}:${filters.sortOrder}`;

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':') as [
      SortField,
      'asc' | 'desc',
    ];

    updateFilters({
      sortBy,
      sortOrder,
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Biens immobiliers
          </h1>

          <p className="text-muted-foreground">
            {data
              ? `${data.meta.total} bien${data.meta.total > 1 ? 's' : ''}`
              : 'Gérez votre portefeuille'}

            {isFetching && !isLoading && (
              <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ExportExcelButton type="biens" />
          <Button asChild>
            <Link href="/crm/properties/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bien
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <PropertyFiltersBar
            filters={filters}
            agents={agents}
            onChange={updateFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </CardContent>
      </Card>

      {/* Choix de la vue et tri */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={view === 'table' ? 'default' : 'ghost'}
            onClick={() => changeView('table')}
          >
            <List className="mr-2 h-4 w-4" />
            Tableau
          </Button>

          <Button
            type="button"
            size="sm"
            variant={view === 'cards' ? 'default' : 'ghost'}
            onClick={() => changeView('cards')}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Cartes
          </Button>

          <Button
            type="button"
            size="sm"
            variant={view === 'map' ? 'default' : 'ghost'}
            onClick={() => changeView('map')}
          >
            <Map className="mr-2 h-4 w-4" />
            Carte
          </Button>
        </div>

        {view === 'cards' && (
          <Select
            value={selectedSort}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>

            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Chargement */}
      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-14 w-full"
              />
            ))}
          </CardContent>
        </Card>
      ) : isError ? (
        /* Erreur API */
        <Card>
          <CardContent className="space-y-3 p-12 text-center">
            <p className="text-destructive">
              {getErrorMessage(error)}
            </p>

            <Button
              variant="outline"
              onClick={() => refetch()}
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        /* Aucun résultat */
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

            <h3 className="mb-2 text-lg font-semibold">
              Aucun bien trouvé
            </h3>

            <p className="mb-4 text-muted-foreground">
              Modifiez vos filtres ou ajoutez un bien.
            </p>

            <Button asChild>
              <Link href="/crm/properties/new">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau bien
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        /* Vue tableau */
        <Card>
          <CardContent className="p-0">
            <PropertiesTable
              items={items}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              busyId={busyId}
              onSort={handleSort}
              onTogglePublish={(property) =>
                publishMutation.mutate({
                  id: property.id,
                  publish: !property.isPublished,
                })
              }
              onDelete={canDelete(user) ? setToDelete : undefined}
              canEdit={(p) => canEditProperty(user, p)}
            />
          </CardContent>
        </Card>
      ) : view === 'map' ? (
        /* Vue carte */
        <Card>
          <CardContent className="p-6">
            <PropertiesMapView items={items} />
          </CardContent>
        </Card>
      ) : (
        /* Vue cartes */
        <PropertiesCards
          items={items}
          busyId={busyId}
          onTogglePublish={(property) =>
            publishMutation.mutate({
              id: property.id,
              publish: !property.isPublished,
            })
          }
          onDelete={canDelete(user) ? setToDelete : undefined}
          canEdit={(p) => canEditProperty(user, p)}
        />
      )}

      {/* Pagination */}
      {data && data.meta.total > 0 && (
        <PropertiesPagination
          meta={data.meta}
          onPage={(page) =>
            setFilters((current) => ({
              ...current,
              page,
            }))
          }
          onLimit={(limit) =>
            updateFilters({
              limit,
            })
          }
        />
      )}

      {/* Confirmation de suppression */}
      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Supprimer ce bien ?
            </DialogTitle>

            <DialogDescription>
              « {toDelete?.title} » et toutes ses photos seront supprimés
              définitivement. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setToDelete(null)}
            >
              Annuler
            </Button>

            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !toDelete}
              onClick={() => {
                if (toDelete) {
                  deleteMutation.mutate(toDelete.id);
                }
              }}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}