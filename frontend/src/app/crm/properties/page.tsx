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
  AlertCircle,
  Building2,
  LayoutGrid,
  List,
  Loader2,
  Map as MapIcon,
  Plus,
  SearchX,
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

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'table', label: 'Tableau', icon: List },
  { value: 'cards', label: 'Cartes', icon: LayoutGrid },
  { value: 'map', label: 'Carte', icon: MapIcon },
];

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
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
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
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      publish ? propertiesService.publish(id) : propertiesService.unpublish(id),

    onSuccess: (_data, { publish }) => {
      toast.success(publish ? 'Bien publié' : 'Bien dépublié');
      qc.invalidateQueries({ queryKey: queryKeys.properties.all });
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
      qc.invalidateQueries({ queryKey: queryKeys.properties.all });
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
  const total = data?.meta.total;

  // Désactiver les actions pendant une mutation.
  const busyId = publishMutation.isPending
    ? publishMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables
      : null;

  // Tri utilisé dans la vue cartes.
  const selectedSort = `${filters.sortBy}:${filters.sortOrder}`;

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':') as [SortField, 'asc' | 'desc'];
    updateFilters({ sortBy, sortOrder });
  };

  const handleTogglePublish = (property: Property) =>
    publishMutation.mutate({
      id: property.id,
      publish: !property.isPublished,
    });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      {/* ═════════════ En-tête ═════════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Biens immobiliers
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {total !== undefined
              ? `${total} bien${total > 1 ? 's' : ''} au total`
              : 'Gérez votre portefeuille'}
            {isFetching && !isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Mise à jour" />
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton type="biens" />
          <Button asChild>
            <Link href="/crm/properties/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bien
            </Link>
          </Button>
        </div>
      </header>

      {/* ═════════════ Filtres ═════════════ */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <PropertyFiltersBar
            filters={filters}
            agents={agents}
            onChange={updateFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </CardContent>
      </Card>

      {/* ═════════════ Vue + tri ═════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Mode d'affichage"
          className="inline-flex items-center rounded-lg bg-muted p-1"
        >
          {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = view === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeView(value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {view === 'cards' && (
          <Select value={selectedSort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[210px] bg-background">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ═════════════ Contenu ═════════════ */}
      {isLoading ? (
        /* Chargement : le skeleton suit la vue choisie */
        view === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </CardContent>
          </Card>
        )
      ) : isError ? (
        /* Erreur API */
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Impossible de charger les biens</p>
              <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        /* Aucun résultat */
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <SearchX className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Aucun bien trouvé</h3>
              <p className="text-sm text-muted-foreground">
                Modifiez vos filtres ou ajoutez un bien.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Réinitialiser les filtres
              </Button>
              <Button asChild>
                <Link href="/crm/properties/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau bien
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        /* Vue tableau */
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <PropertiesTable
                items={items}
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                busyId={busyId}
                onSort={handleSort}
                onTogglePublish={handleTogglePublish}
                onDelete={canDelete(user) ? setToDelete : undefined}
                canEdit={(p) => canEditProperty(user, p)}
              />
            </div>
          </CardContent>
        </Card>
      ) : view === 'map' ? (
        /* Vue carte */
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-2">
            <PropertiesMapView items={items} />
          </CardContent>
        </Card>
      ) : (
        /* Vue cartes */
        <PropertiesCards
          items={items}
          busyId={busyId}
          onTogglePublish={handleTogglePublish}
          onDelete={canDelete(user) ? setToDelete : undefined}
          canEdit={(p) => canEditProperty(user, p)}
        />
      )}

      {/* ═════════════ Pagination ═════════════ */}
      {data && data.meta.total > 0 && (
        <PropertiesPagination
          meta={data.meta}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
          onLimit={(limit) => updateFilters({ limit })}
        />
      )}

      {/* ═════════════ Confirmation de suppression ═════════════ */}
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
            <DialogTitle>Supprimer ce bien ?</DialogTitle>
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