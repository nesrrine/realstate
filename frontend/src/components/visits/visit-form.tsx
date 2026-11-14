"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Loader2,
  Mail,
  Phone,
  Save,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  visitsService,
  type Visit,
  type CreateVisitDto,
} from "@/services/visits.service";
import {
  propertiesService,
  type Property,
} from "@/services/properties.service";
import { clientsService, type Client } from "@/services/clients.service";
import { agentsService, type AgentOption } from "@/services/agents.service";
import { useAuth } from "@/providers/AuthProvider";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import {
  MultiPropertySelect,
  type PropertyOption,
} from "@/components/clients/multi-property-select";
import { VisitNumberBadge } from "@/components/visits/visit-number-badge";

// Valeur sentinelle: Radix Select interdit <SelectItem value="" />
const NONE = "none";

function formatLocalDateTime(dateString: string): string {
  const date = new Date(dateString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ── Validation Schema ────────────────────────────────────────────
const schema = z.object({
  clientId: z.string().min(1, "Client requis"),
  fieldAgentId: z.string().optional(),
  officeAgentId: z.string().optional(),
  visitType: z.enum(["IN_PERSON", "REMOTE"]).optional(),
  scheduledAt: z.string().min(1, "Date requise"),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  duration: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number(v) >= 15 && Number(v) <= 480),
      "La durée doit être comprise entre 15 et 480 minutes",
    ),
  feedback: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const newClientSchema = z.object({
  firstName: z.string().min(2, "Minimum 2 caractères"),
  lastName: z.string().min(2, "Minimum 2 caractères"),
  phone: z.string().min(8, "Numéro de téléphone requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  cinOrPassport: z.string().min(1, "CNI ou passeport requis"),
  professionalAddress: z.string().min(1, "Adresse professionnelle requise"),
  status: z.enum(["PROSPECT", "CLIENT"]).optional(),
});

type NewClientForm = z.infer<typeof newClientSchema>;

// ── Sélecteur de client (intégré dans ce fichier) ────────────────
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  cinOrPassport?: string | null;
  status?: string | null; // PROSPECT | CLIENT
}

interface ClientSelectProps {
  options: ClientOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

const CLIENT_STATUS_LABELS: Record<string, string> = {
  CLIENT: "Client",
  PROSPECT: "Prospect",
};

const CLIENT_STATUS_STYLES: Record<string, string> = {
  CLIENT:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  PROSPECT:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
};

function initials(c: { firstName: string; lastName: string }): string {
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        CLIENT_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {CLIENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Avatar({
  client,
  active,
  className,
}: {
  client: { firstName: string; lastName: string };
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-primary/10 text-primary",
        className,
      )}
    >
      {initials(client)}
    </span>
  );
}

function ClientSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner un client...",
  searchPlaceholder = "Rechercher par nom, téléphone, email, CNI...",
}: ClientSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const selectedOption = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryDigits = query.replace(/\s/g, "");

    return options.filter((o) => {
      if (status !== "ALL" && o.status !== status) return false;
      if (!query) return true;

      const text = [o.firstName, o.lastName, o.email, o.cinOrPassport]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const phone = (o.phone ?? "").replace(/\s/g, "");

      return (
        text.includes(query) ||
        `${o.lastName} ${o.firstName}`.toLowerCase().includes(query) ||
        (queryDigits.length > 0 && phone.includes(queryDigits))
      );
    });
  }, [options, search, status]);

  const hasFilters = Boolean(search) || status !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
  };

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const chipBase =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const chipOn = "border-primary bg-primary text-primary-foreground";
  const chipOff =
    "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            value
              ? "border-primary/40 bg-primary/5 hover:border-primary"
              : "border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5",
            open && "border-primary ring-2 ring-primary/20",
          )}
        >
          {value ? (
            <Avatar
              client={selectedOption ?? { firstName: "", lastName: "" }}
              active
              className="h-8 w-8"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="h-4 w-4" />
            </span>
          )}

          <span className="min-w-0 flex-1">
            {value ? (
              <>
                <span className="block truncate text-sm font-semibold">
                  {selectedOption
                    ? `${selectedOption.firstName} ${selectedOption.lastName}`
                    : "Client sélectionné"}
                </span>
                {selectedOption?.phone && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {selectedOption.phone}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="block truncate text-sm font-medium">
                  {placeholder}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {options.length} client{options.length > 1 ? "s" : ""} dans la
                  base
                </span>
              </>
            )}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="flex max-h-[min(80vh,560px)] w-[min(94vw,460px)] flex-col overflow-hidden rounded-xl border p-0 shadow-xl"
      >
        {/* ── En-tête : recherche + raccourcis ─────────────────── */}
        <div className="space-y-3 border-b bg-muted/30 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 rounded-lg bg-background pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { value: "ALL", label: "Tous" },
              { value: "CLIENT", label: "Clients" },
              { value: "PROSPECT", label: "Prospects" },
            ].map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatus(chip.value)}
                className={cn(chipBase, status === chip.value ? chipOn : chipOff)}
              >
                {chip.label}
              </button>
            ))}

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto text-xs font-medium text-destructive hover:underline"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* ── Résultats ───────────────────────────────────────── */}
        <div className="border-b px-3 py-2">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            résultat{filtered.length > 1 ? "s" : ""} sur {options.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <UserRound className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucun client ne correspond à la recherche.
              </p>
              {hasFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                >
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            filtered.map((option) => {
              const isSelected = option.id === value;

              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => pick(option.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-2.5 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                      : "border-transparent bg-card hover:border-border hover:bg-accent/60",
                  )}
                >
                  {isSelected && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
                  )}

                  <Avatar
                    client={option}
                    active={isSelected}
                    className="h-9 w-9"
                  />

                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {option.firstName} {option.lastName}
                      </span>
                      <StatusPill status={option.status} />
                    </span>

                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {option.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {option.phone}
                        </span>
                      )}
                      {option.email && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{option.email}</span>
                        </span>
                      )}
                    </span>
                  </span>

                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  mode: "create" | "edit";
  visit?: Visit;
  /** Création d'une revisite : client et biens repris de la visite précédente */
  /** scheduledAt : « AAAA-MM-JJTHH:mm » (créneau choisi dans l'agenda) */
  prefill?: { clientId?: string; propertyIds?: string[]; scheduledAt?: string };
}

export function VisitForm({ mode, visit, prefill }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = mode === "edit";

  // fieldAgentId est choisissable par tous (ADMIN, MANAGER, AGENT)
  const canEditFieldAgent = true;
  // officeAgentId est fixé à l'agent connecté pour un AGENT ; modifiable seulement par ADMIN/MANAGER
  const canEditOfficeAgent = user?.role === "ADMIN" || user?.role === "MANAGER";

  // ID de l'agent connecté (pour pré-remplir officeAgentId en création côté agent)
  const connectedAgentId = user?.agentId ?? user?.agent?.id ?? "";

  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(
    visit?.properties?.map((p) => String(p.property.id)) ?? prefill?.propertyIds ?? [],
  );
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: visit?.client?.id != null ? String(visit.client.id) : (prefill?.clientId ?? ""),
      fieldAgentId: visit?.fieldAgent?.id ?? "",
      officeAgentId:
        visit?.officeAgent?.id != null
          ? String(visit.officeAgent.id)
          : canEditOfficeAgent
            ? ""
            : connectedAgentId,
      visitType: visit?.visitType ?? "IN_PERSON",
      scheduledAt: visit?.scheduledAt
        ? formatLocalDateTime(visit.scheduledAt)
        : (prefill?.scheduledAt ?? ""),
      status: visit?.status || "SCHEDULED",
      duration: visit?.duration ? String(visit.duration) : "60",
      feedback: visit?.feedback || "",
    },
  });

  const selectedClientId = watch("clientId");

  // Visite ou revisite ? (nombre de visites déjà faites par ce client)
  const { data: clientVisits } = useQuery({
    queryKey: ["visits", "client-count", selectedClientId],
    queryFn: () => visitsService.clientVisitCount(selectedClientId),
    enabled: !isEdit && !!selectedClientId,
  });

  useEffect(() => {
    if (!visit || !isEdit) return;
    reset({
      clientId: visit.client?.id != null ? String(visit.client.id) : "",
      fieldAgentId: visit.fieldAgent?.id ?? "",
      officeAgentId: visit.officeAgent?.id ?? "",
      visitType: visit.visitType ?? "IN_PERSON",
      scheduledAt: visit.scheduledAt
        ? formatLocalDateTime(visit.scheduledAt)
        : "",
      status: visit.status || "SCHEDULED",
      duration: visit.duration ? String(visit.duration) : "60",
      feedback: visit.feedback || "",
    });
    setSelectedPropertyIds(
      (visit.properties ?? []).map((p) => String(p.property.id)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit?.id, visit?.updatedAt, isEdit, reset]);

  // Charger TOUS les biens (page par page, sans limite de 100)
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "all-options"],
    queryFn: async () => {
      const pageSize = 100;
      const all: Property[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const result = await propertiesService.getAll({
          page,
          limit: pageSize,
        });
        all.push(...result.data);
        totalPages = result.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages && page <= 200); // 200 = sécurité anti-boucle

      return all;
    },
    staleTime: 60_000,
  });

  // Charger les clients
  const { data: clients = [], refetch: refetchClients } = useQuery({
    queryKey: queryKeys.clients.list({ limit: 500 }),
    queryFn: async () => {
      const result = await clientsService.getAll({ limit: 500 });
      return result.data;
    },
    staleTime: 60_000,
  });

  // Charger les agents (inutile pour un agent simple)
  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    staleTime: 5 * 60_000,
  });

  const {
    register: registerNew,
    handleSubmit: handleNewSubmit,
    formState: { errors: newErrors },
    reset: resetNewForm,
  } = useForm<NewClientForm>({
    resolver: zodResolver(newClientSchema),
  });

  const createClientMutation = useMutation({
    mutationFn: (data: NewClientForm) => clientsService.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      setValue("clientId", String(created.id), { shouldValidate: true });
      refetchClients();
      setShowNewClientForm(false);
      resetNewForm();
      toast.success("Client créé et lié à la visite");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createClient = handleNewSubmit(async (data: NewClientForm) => {
    // Détection de doublons avant création (non bloquant)
    try {
      const dup = await clientsService.detectDuplicates({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || undefined,
      });
      if (dup.hasDuplicate && dup.duplicates.length > 0) {
        toast.warning(
          `${dup.duplicates.length} fiche(s) similaire(s) détectée(s). Le client sera tout de même créé.`,
        );
      }
    } catch {
      // Ignore les erreurs de détection, on crée quand même
    }
    await createClientMutation.mutateAsync(data);
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: CreateVisitDto = {
        clientId: values.clientId,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        status: values.status,
        duration: values.duration ? Number(values.duration) : undefined,
        feedback: values.feedback || undefined,
        propertyIds: selectedPropertyIds,
        // fieldAgentId toujours envoyé (choisissable par tous)
        fieldAgentId: values.fieldAgentId || undefined,
        // officeAgentId : fixé à l'agent connecté pour un AGENT ; sinon valeur du formulaire
        officeAgentId: canEditOfficeAgent
          ? isEdit
            ? (values.officeAgentId ?? "")
            : values.officeAgentId || undefined
          : connectedAgentId || undefined,
        // Type de visite : présentiel ou à distance
        visitType: values.visitType || undefined,
      };

      if (isEdit && visit) {
        return visitsService.update(visit.id, payload);
      }
      return visitsService.create(payload);
    },
    onSuccess: (saved: Visit) => {
      // Raffraîchissement: mettre à jour et invalider toutes les clés de cache possibles
      qc.setQueryData(queryKeys.visits.detail(saved.id), saved);
      qc.setQueryData(["visit", saved.id], saved);
      qc.invalidateQueries({ queryKey: queryKeys.visits.all });
      qc.invalidateQueries({ queryKey: ["visit", saved.id] });
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success(isEdit ? "Visite mise à jour" : "Visite créée");
      // Après création : ouvrir directement le message de confirmation pour le client
      router.push(isEdit ? `/crm/visits/${saved.id}` : `/crm/visits/${saved.id}?confirmer=1`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onValid = (values: FormValues) => {
    // Agent terrain requis sauf pour un AGENT qui crée (le backend met l'agent connecté par défaut)
    if (canEditFieldAgent && !values.fieldAgentId && user?.role !== "AGENT") {
      setError("fieldAgentId", { message: "Agent terrain requis" });
      return;
    }
    if (selectedPropertyIds.length === 0) {
      toast.error("Sélectionnez au moins un bien");
      return;
    }
    mutation.mutate(values);
  };

  // ✅ CORRECTION : on transmet TOUS les champs utilisés par les filtres
  // (type, transaction, quartier, surface, référence, adresse).
  // ⚠️ Adapter les noms de champs à ton type `Property` si besoin
  // (ex. p.transactionType → p.transaction, p.district → p.delegation).
  const propertyOptions: PropertyOption[] = properties.map((p: Property) => ({
    id: String(p.id),
    title: p.title,
    reference: p.reference ?? undefined,
    address: p.address ?? undefined,
    city: p.city,
    district: p.district ?? null,
    type: p.type,
    transactionType: p.transactionType,
    surface: p.surface,
    price: p.price,
    status: p.status,
  }));

  // Clients actifs + le client déjà choisi (même s'il a été désactivé depuis)
  // ⚠️ Adapter les noms de champs à ton type `Client` si besoin
  // (phone, email, cinOrPassport, status).
  const clientOptions: ClientOption[] = clients
    .filter((c: Client) => c.isActive !== false || String(c.id) === selectedClientId)
    .map((c: Client) => ({
      id: String(c.id),
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone ?? null,
      email: c.email ?? null,
      cinOrPassport: c.cinOrPassport ?? null,
      status: c.status ?? null,
    }));

  return (
    <form
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as
          HTMLElement | null | undefined;
        if (submitter?.dataset.submit !== "true") {
          e.preventDefault();
          return;
        }
        handleSubmit(onValid)(e);
      }}
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          (e.target as HTMLElement).tagName === "INPUT"
        ) {
          e.preventDefault();
        }
      }}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Détails de la visite</CardTitle>
              <CardDescription>
                Bien(s) à visiter et informations du rendez-vous
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyIds">
                  Bien(s) immobilier(s){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <MultiPropertySelect
                  options={propertyOptions}
                  selected={selectedPropertyIds}
                  onChange={setSelectedPropertyIds}
                  placeholder="Sélectionner un ou plusieurs biens"
                  searchPlaceholder="Rechercher un bien..."
                />
                {selectedPropertyIds.length === 0 && (
                  <p className="text-xs text-destructive">
                    Sélectionnez au moins un bien
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">
                  Client <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ClientSelect
                      options={clientOptions}
                      value={selectedClientId}
                      onChange={(id) =>
                        setValue("clientId", id, { shouldValidate: true })
                      }
                      placeholder="Sélectionner un client..."
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewClientForm(!showNewClientForm)}
                    aria-label="Créer un nouveau client"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {clientVisits && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <VisitNumberBadge number={clientVisits.nextNumber} />
                    {clientVisits.count === 0
                      ? "Première visite de ce client"
                      : `Ce client a déjà ${clientVisits.count} visite${clientVisits.count > 1 ? "s" : ""} : celle-ci est une revisite`}
                  </div>
                )}

                {showNewClientForm && (
                  <div
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (e.target as HTMLElement).tagName === "INPUT"
                      ) {
                        e.preventDefault();
                        createClient();
                      }
                    }}
                    className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          placeholder="Prénom"
                          {...registerNew("firstName")}
                          aria-invalid={!!newErrors.firstName}
                          className="rounded-lg"
                        />
                        {newErrors.firstName && (
                          <p className="mt-1 text-xs text-destructive">
                            {newErrors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          placeholder="Nom"
                          {...registerNew("lastName")}
                          aria-invalid={!!newErrors.lastName}
                          className="rounded-lg"
                        />
                        {newErrors.lastName && (
                          <p className="mt-1 text-xs text-destructive">
                            {newErrors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Input
                        placeholder="Téléphone *"
                        {...registerNew("phone")}
                        aria-invalid={!!newErrors.phone}
                        className="rounded-lg"
                      />
                      {newErrors.phone && (
                        <p className="mt-1 text-xs text-destructive">
                          {newErrors.phone.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="Email (facultatif)"
                        {...registerNew("email")}
                        aria-invalid={!!newErrors.email}
                        className="rounded-lg"
                      />
                      {newErrors.email && (
                        <p className="mt-1 text-xs text-destructive">
                          {newErrors.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="newClientCin" className="text-sm">
                        CNI / Passeport <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="newClientCin"
                        placeholder="Numéro de CNI ou passeport"
                        {...registerNew("cinOrPassport")}
                        aria-invalid={!!newErrors.cinOrPassport}
                        className="mt-1 rounded-lg"
                      />
                      {newErrors.cinOrPassport && (
                        <p className="mt-1 text-xs text-destructive">
                          {newErrors.cinOrPassport.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="newClientProAddress" className="text-sm">
                        Adresse professionnelle <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="newClientProAddress"
                        placeholder="Adresse professionnelle"
                        {...registerNew("professionalAddress")}
                        aria-invalid={!!newErrors.professionalAddress}
                        className="mt-1 rounded-lg"
                      />
                      {newErrors.professionalAddress && (
                        <p className="mt-1 text-xs text-destructive">
                          {newErrors.professionalAddress.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="newClientStatus" className="text-sm">
                        Statut
                      </Label>
                      <select
                        id="newClientStatus"
                        {...registerNew("status")}
                        className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="CLIENT">Client confirmé</option>
                        <option value="PROSPECT">Prospect</option>
                      </select>
                      {newErrors.status && (
                        <p className="mt-1 text-xs text-destructive">
                          {newErrors.status.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={createClientMutation.isPending}
                      onClick={() => createClient()}
                    >
                      {createClientMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        "Créer le client"
                      )}
                    </Button>
                  </div>
                )}

                {errors.clientId && (
                  <p className="text-sm text-destructive">
                    {errors.clientId.message}
                  </p>
                )}
              </div>

              {/* Agent terrain - toujours affichage (choisissable par tous) */}
              <div className="space-y-2">
                <Label htmlFor="fieldAgentId">
                  Agent terrain <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="fieldAgentId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner l'agent terrain" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent: AgentOption) => (
                          <SelectItem key={agent.id} value={String(agent.id)}>
                            {agent.user.firstName} {agent.user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.fieldAgentId && (
                  <p className="text-xs text-destructive">
                    {errors.fieldAgentId.message}
                  </p>
                )}
              </div>

              {/* Agent bureau - réservé à ADMIN/MANAGER ; lecture seule pour AGENT */}
              {canEditOfficeAgent ? (
                <div className="space-y-2">
                  <Label htmlFor="officeAgentId">Agent bureau</Label>
                  <Controller
                    control={control}
                    name="officeAgentId"
                    render={({ field }) => (
                      <Select
                        value={field.value || NONE}
                        onValueChange={(v) =>
                          field.onChange(v === NONE ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner l'agent bureau (optionnel)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Aucun</SelectItem>
                          {agents.map((agent: AgentOption) => (
                            <SelectItem key={agent.id} value={String(agent.id)}>
                              {agent.user.firstName} {agent.user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ) : (
                isEdit &&
                visit?.officeAgent?.user && (
                  <div className="space-y-2">
                    <Label>Agent bureau</Label>
                    <p className="text-sm text-muted-foreground">
                      {visit.officeAgent.user.firstName}{" "}
                      {visit.officeAgent.user.lastName}
                    </p>
                  </div>
                )
              )}

              {/* Type de visite - Présentiel ou À distance */}
              <div className="space-y-2">
                <Label htmlFor="visitType">Type de visite</Label>
                <Controller
                  control={control}
                  name="visitType"
                  render={({ field }) => (
                    <Select
                      value={field.value || "IN_PERSON"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            field.value === "REMOTE"
                              ? "À distance"
                              : "Présentiel"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN_PERSON">Présentiel</SelectItem>
                        <SelectItem value="REMOTE">À distance</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledAt">
                  Date et heure <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  {...register("scheduledAt")}
                />
                {errors.scheduledAt && (
                  <p className="text-xs text-destructive">
                    {errors.scheduledAt.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durée (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="480"
                  {...register("duration")}
                  placeholder="60"
                />
                {errors.duration ? (
                  <p className="text-xs text-destructive">
                    {errors.duration.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Durée estimée de la visite (15-480 minutes)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Retour de visite</CardTitle>
              <CardDescription>
                Notes et observations suite à la visite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="feedback">Commentaires</Label>
                <textarea
                  id="feedback"
                  {...register("feedback")}
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Impressions du client, points positifs, objections..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">
                  Statut <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHEDULED">Planifiée</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                        <SelectItem value="COMPLETED">Terminée</SelectItem>
                        <SelectItem value="CANCELLED">Annulée</SelectItem>
                        <SelectItem value="NO_SHOW">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {isEdit && visit && (
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Référence</p>
                  <p className="font-medium">#{visit.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Créée le</p>
                  <p className="font-medium">
                    {new Date(visit.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Mise à jour le
                  </p>
                  <p className="font-medium">
                    {new Date(visit.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" asChild>
          <Link
            href={isEdit && visit ? `/crm/visits/${visit.id}` : "/crm/visits"}
          >
            Annuler
          </Link>
        </Button>

        <Button type="submit" data-submit="true" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isEdit ? "Enregistrer" : "Créer la visite"}
        </Button>
      </div>
    </form>
  );
}