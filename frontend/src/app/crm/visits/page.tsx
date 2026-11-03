"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Edit,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
  CalendarDays,
} from "lucide-react";

import {
  visitsService,
  type Visit,
  type VisitFilters,
  type VisitStatus,
} from "@/services/visits.service";
import { agentsService } from "@/services/agents.service";
import { useAuth } from "@/providers/AuthProvider";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { VisitNumberBadge } from "@/components/visits/visit-number-badge";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { canDelete } from "@/lib/permissions";
import { ExportExcelButton, toDay } from "@/components/shared/export-excel-button";
import { VISIT_STATUS_LABELS, VISIT_STATUS_STYLES } from "@/lib/visit-status";

const ALL = "__all__";
const DEFAULT_LIMIT = 20;

const STATUS_LABELS = VISIT_STATUS_LABELS;
const STATUS_STYLES = VISIT_STATUS_STYLES;

// Actions rapides proposées selon le statut actuel
const NEXT_STATUSES: VisitStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];

type Period = "upcoming" | "today" | "week" | "past" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "upcoming", label: "À venir" },
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "7 prochains jours" },
  { key: "past", label: "Passées" },
  { key: "all", label: "Toutes" },
];

/** Bornes de dates et ordre de tri pour chaque période. */
function periodRange(period: Period): Pick<VisitFilters, "dateFrom" | "dateTo" | "sortOrder"> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = 24 * 60 * 60 * 1000;
  switch (period) {
    case "upcoming":
      return { dateFrom: startOfDay.toISOString(), sortOrder: "asc" };
    case "today":
      return {
        dateFrom: startOfDay.toISOString(),
        dateTo: new Date(startOfDay.getTime() + day - 1).toISOString(),
        sortOrder: "asc",
      };
    case "week":
      return {
        dateFrom: startOfDay.toISOString(),
        dateTo: new Date(startOfDay.getTime() + 7 * day).toISOString(),
        sortOrder: "asc",
      };
    case "past":
      return { dateTo: now.toISOString(), sortOrder: "desc" };
    default:
      return { sortOrder: "desc" };
  }
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(date);
  if (sameDay(date, today)) return { day: "Aujourd'hui", time, highlight: true };
  if (sameDay(date, tomorrow)) return { day: "Demain", time, highlight: true };
  const day = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
  return { day, time, highlight: false };
}

const isOverdue = (v: Visit) =>
  (v.status === "SCHEDULED" || v.status === "CONFIRMED") && new Date(v.scheduledAt) < new Date();

export default function VisitsPage() {
  const { user } = useAuth();
  const canFilterByAgent = user?.role === "ADMIN" || user?.role === "MANAGER";
  const qc = useQueryClient();

  // Période, recherche et filtres retrouvés au retour d'une fiche visite
  const [period, setPeriod] = usePersistentState<Period>("visites-periode", "upcoming");
  const [search, setSearch] = usePersistentState("visites-recherche", "");
  const debouncedSearch = useDebounce(search);
  const [filters, setFilters] = usePersistentState<VisitFilters>("visites", { page: 1, limit: DEFAULT_LIMIT });

  // Filtres envoyés à l'API (période + recherche + filtres manuels)
  const query = useMemo<VisitFilters>(
    () => ({ ...filters, ...periodRange(period), search: debouncedSearch.trim() || undefined }),
    [filters, period, debouncedSearch],
  );

  const updateFilters = (patch: Partial<VisitFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    enabled: canFilterByAgent,
    staleTime: 5 * 60_000,
  });

  const { data: list, isLoading } = useQuery({
    queryKey: queryKeys.visits.list(query),
    queryFn: () => visitsService.getAll(query),
  });

  const { data: stats } = useQuery({
    queryKey: [...queryKeys.visits.all, "stats"],
    queryFn: visitsService.getStats,
  });

  const visits: Visit[] = list?.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.visits.all });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VisitStatus }) =>
      visitsService.update(id, { status }),
    onSuccess: (_, { status }) => {
      invalidate();
      // Une visite terminée peut faire passer le client de prospect à confirmé
      if (status === "COMPLETED") qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success(`Visite marquée « ${STATUS_LABELS[status]} »`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => visitsService.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("Visite supprimée");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const hasManualFilters =
    !!filters.status || !!filters.fieldAgentId || !!filters.officeAgentId || !!search;

  const statCards = [
    { label: "Aujourd'hui", value: stats?.today, icon: CalendarClock, period: "today" as Period },
    { label: "À venir", value: stats?.upcoming, icon: Calendar, period: "upcoming" as Period },
    {
      label: "À mettre à jour",
      value: stats?.overdue,
      icon: AlertTriangle,
      period: "past" as Period,
      warn: (stats?.overdue ?? 0) > 0,
      hint: "Date passée, statut non mis à jour",
    },
    { label: "Terminées", value: stats?.completed, icon: CheckCircle2, period: "all" as Period },
    { label: "Ce mois", value: stats?.thisMonth, icon: CalendarCheck, period: "all" as Period },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visites</h1>
          <p className="text-muted-foreground">
            {stats ? `${stats.total} visite(s) au total` : "Gérez vos rendez-vous de visite"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/crm/visits/agenda">
            <Button variant="outline">
              <CalendarDays className="mr-2 h-4 w-4" />
              Agenda
            </Button>
          </Link>
          {/* Export de la période affichée (aujourd'hui, à venir, ce mois…) */}
          <ExportExcelButton type="visites" from={toDay(query.dateFrom)} to={toDay(query.dateTo)} />
          <Link href="/crm/visits/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle visite
            </Button>
          </Link>
        </div>
      </div>

      {/* Compteurs (cliquables : appliquent la période) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {statCards.map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.hint}
            onClick={() => {
              setPeriod(s.period);
              setFilters((f) => ({ ...f, page: 1 }));
            }}
            className={cn(
              "rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent",
              s.warn && "border-orange-300 bg-orange-50 hover:bg-orange-100",
            )}
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {s.label}
              <s.icon className={cn("h-4 w-4", s.warn && "text-orange-600")} />
            </div>
            <div className={cn("mt-1 text-2xl font-bold", s.warn && "text-orange-700")}>
              {s.value ?? "—"}
            </div>
          </button>
        ))}
      </div>

      {/* Période + filtres */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={period === p.key ? "default" : "outline"}
                onClick={() => {
                  setPeriod(p.key);
                  setFilters((f) => ({ ...f, page: 1 }));
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Client, téléphone, bien ou ville..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFilters((f) => ({ ...f, page: 1 }));
                }}
              />
            </div>

            <Select
              value={filters.status ?? ALL}
              onValueChange={(v) => updateFilters({ status: v === ALL ? undefined : v })}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les statuts</SelectItem>
                {(Object.keys(STATUS_LABELS) as VisitStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canFilterByAgent && agents.length > 0 && (
              <>
                <Select
                  value={filters.fieldAgentId ?? ALL}
                  onValueChange={(v) =>
                    updateFilters({ fieldAgentId: v === ALL ? undefined : v })
                  }
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tous agents terrain</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.user.firstName} {a.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.officeAgentId ?? ALL}
                  onValueChange={(v) =>
                    updateFilters({ officeAgentId: v === ALL ? undefined : v })
                  }
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tous agents bureau</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.user.firstName} {a.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {hasManualFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setFilters({ page: 1, limit: filters.limit ?? DEFAULT_LIMIT });
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-12 text-center">Chargement...</div>
          ) : visits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bien</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => {
                  const when = formatWhen(visit.scheduledAt);
                  const overdue = isOverdue(visit);
                  const props = visit.properties ?? [];
                  const first = props[0]?.property;
                  return (
                    <TableRow key={visit.id} className={cn(overdue && "bg-orange-50/60")}>
                      <TableCell>
                        <Link href={`/crm/visits/${visit.id}`} className="block hover:underline">
                          <div className={cn("font-medium", when.highlight && "text-primary")}>
                            {when.day}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {when.time}
                            {visit.duration ? ` · ${visit.duration} min` : ""}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {first ? (
                          <>
                            <Link
                              href={`/crm/properties/${first.id}`}
                              className="font-medium hover:underline"
                            >
                              {first.title}
                            </Link>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="mr-1 h-3 w-3" />
                              {first.city}
                              {props.length > 1 && (
                                <Badge variant="secondary" className="ml-2">
                                  +{props.length - 1} bien{props.length > 2 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {visit.client ? (
                          <>
                            <Link
                              href={`/crm/clients/${visit.client.id}`}
                              className="font-medium hover:underline"
                            >
                              {visit.client.firstName} {visit.client.lastName}
                            </Link>
                            <div className="my-0.5">
                              <VisitNumberBadge number={visit.visitNumber} />
                            </div>
                            {visit.client.phone && (
                              <a
                                href={`tel:${visit.client.phone}`}
                                className="flex items-center text-sm text-muted-foreground hover:underline"
                              >
                                <Phone className="mr-1 h-3 w-3" />
                                {visit.client.phone}
                              </a>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <span className="text-muted-foreground">Terrain : </span>
                          {visit.fieldAgent?.user
                            ? `${visit.fieldAgent.user.firstName} ${visit.fieldAgent.user.lastName}`
                            : "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bureau : </span>
                          {visit.officeAgent?.user
                            ? `${visit.officeAgent.user.firstName} ${visit.officeAgent.user.lastName}`
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className={STATUS_STYLES[visit.status]}>
                            {STATUS_LABELS[visit.status] ?? visit.status}
                          </Badge>
                          {overdue && (
                            <span className="flex items-center text-xs text-orange-700">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              À mettre à jour
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {(visit.status === "SCHEDULED" || visit.status === "CONFIRMED") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={statusMutation.isPending}
                              onClick={() =>
                                statusMutation.mutate({ id: visit.id, status: "COMPLETED" })
                              }
                              title="Marquer la visite comme terminée"
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Terminer
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Plus d'actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                              {NEXT_STATUSES.filter((s) => s !== visit.status).map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => statusMutation.mutate({ id: visit.id, status: s })}
                                >
                                  {STATUS_LABELS[s]}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/crm/visits/${visit.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifier
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/crm/visits/${visit.id}/bon-de-visite`} target="_blank">
                                  <Printer className="mr-2 h-4 w-4" />
                                  Bon de visite
                                </Link>
                              </DropdownMenuItem>
                              {canDelete(user) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      if (window.confirm("Supprimer cette visite ?")) {
                                        deleteMutation.mutate(visit.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Aucune visite trouvée</h3>
              <p className="mb-4 text-muted-foreground">
                {hasManualFilters || period !== "all"
                  ? "Aucune visite pour cette période ou ces filtres."
                  : "Commencez par planifier votre première visite."}
              </p>
              {period !== "all" && (
                <Button variant="outline" className="mr-2" onClick={() => setPeriod("all")}>
                  Voir toutes les visites
                </Button>
              )}
              <Link href="/crm/visits/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle visite
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
