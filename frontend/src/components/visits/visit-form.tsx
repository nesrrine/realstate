"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, UserPlus } from "lucide-react";

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
import { MultiPropertySelect } from "@/components/clients/multi-property-select";
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

  const propertyOptions = properties.map((p: Property) => ({
    id: String(p.id),
    title: p.title,
    city: p.city,
    price: p.price,
    status: p.status,
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
                    <Select
                      value={selectedClientId}
                      onValueChange={(v) =>
                        setValue("clientId", v, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Clients actifs + le client déjà choisi (même s'il a été désactivé depuis) */}
                        {clients
                          .filter((c: Client) => c.isActive !== false || String(c.id) === selectedClientId)
                          .map((c: Client) => (
                            <SelectItem key={String(c.id)} value={String(c.id)}>
                              {c.firstName} {c.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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