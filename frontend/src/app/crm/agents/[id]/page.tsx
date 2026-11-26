"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CalendarDays,
  Edit,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { agentsService } from "@/services/agents.service";
import { cashService } from "@/services/cash.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fullName } from "@/lib/property-constants";
import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query-keys";
import { DeleteAgentButton } from "@/components/agents/delete-agent-dialog";
import { AgentTypeBadge } from "@/components/agents/agent-type-badge";
import { ResetPasswordButton } from "@/components/agents/reset-password-dialog";

const ROLE_LABELS: Record<string, string> = {
  AGENT: "Agent",
  ADMIN: "Administrateur",
  MANAGER: "Gérant",
};

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function formatDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-24 rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted lg:col-span-2" />
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();

  const isAgentRole = user?.role === "AGENT";

  useEffect(() => {
    if (!authLoading && isAgentRole) {
      router.replace("/crm/dashboard");
    }
  }, [authLoading, isAgentRole, router]);

  const {
    data: agent,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["agents", "detail", id],
    queryFn: () => agentsService.getById(id),
    enabled: !!id && !authLoading && !!user && !isAgentRole,
  });

  const cashAccess = useMutation({
    mutationFn: (enabled: boolean) => cashService.setAgentAccess(id, enabled),
    onSuccess: ({ canManageCash }) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: queryKeys.cash.all });
      toast.success(
        canManageCash
          ? "Accès aux frais et dépenses accordé"
          : "Accès aux frais et dépenses retiré",
      );
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Activation / désactivation : PATCH /agents/:id/status
  const status = useMutation({
    mutationFn: (isActive: boolean) => agentsService.setStatus(id, isActive),
    onSuccess: ({ isActive }) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      toast.success(isActive ? "Compte activé" : "Compte désactivé");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (authLoading || !user || isAgentRole || isLoading) {
    return <PageSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">
          Impossible de charger la fiche de l&apos;agent.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Réessayer
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/crm/agents">Retour à la liste</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">Agent introuvable.</p>
        <Button variant="outline" asChild>
          <Link href="/crm/agents">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  // Règles alignées sur le back
  const isSelf = agent.user.email === user.email;
  const targetRole = agent.user.role ?? "AGENT";
  const canManageTarget = targetRole !== "MANAGER" || user.role === "MANAGER";
  const canEditOrDelete = canManageTarget && !isSelf;
  const canResetPassword = targetRole === "AGENT" && !isSelf;
  // Accès aux frais : réservé au gérant (cf. le texte de la carte)
  const canToggleCash = user.role === "MANAGER" && !isSelf;

  const isActive = !!agent.user.isActive;
  const isOffice = agent.agentType === "OFFICE";
  const visitsCount = isOffice
    ? (agent._count?.officeAgentVisits ?? 0)
    : (agent._count?.fieldAgentVisits ?? 0);
  const clientsCount = agent._count?.clients ?? 0;
  const clientsList = agent.clients ?? [];
  const memberSince = formatDate(agent.user.createdAt);
  const agentDisplayName = fullName(agent.user);

  function toggleStatus() {
    if (isActive) {
      const ok = window.confirm(
        `Désactiver le compte de ${agentDisplayName} ? Il ne pourra plus se connecter.`,
      );
      if (!ok) return;
    }
    status.mutate(!isActive);
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex min-w-0 items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/crm/agents" aria-label="Retour à la liste">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials(agent.user.firstName, agent.user.lastName)}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {agentDisplayName}
                {isSelf && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (vous)
                  </span>
                )}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <AgentTypeBadge type={agent.agentType} />
                <Badge variant="outline">
                  {ROLE_LABELS[targetRole] ?? targetRole}
                </Badge>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEditOrDelete && (
              <Button asChild>
                <Link href={`/crm/agents/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </Button>
            )}

            {canResetPassword && (
              <ResetPasswordButton
                agentId={id}
                agentName={agentDisplayName}
              />
            )}

            {canEditOrDelete && (
              <Button
                variant="outline"
                disabled={status.isPending}
                onClick={toggleStatus}
              >
                {isActive ? (
                  <UserX className="mr-2 h-4 w-4" />
                ) : (
                  <UserCheck className="mr-2 h-4 w-4" />
                )}
                {status.isPending
                  ? "Mise à jour..."
                  : isActive
                    ? "Désactiver"
                    : "Activer"}
              </Button>
            )}

            {canEditOrDelete && (
              <DeleteAgentButton
                agentId={id}
                agentName={agentDisplayName}
                myAgentId={user.agentId}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Clients" value={clientsCount} icon={Users} />
        <StatCard
          label="Biens"
          value={agent._count?.properties ?? 0}
          icon={Building2}
        />
        <StatCard
          label="Visites"
          value={visitsCount}
          hint={isOffice ? "planifiées" : "accompagnées"}
          icon={CalendarCheck}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${agent.user.email}`}
                  className="truncate hover:underline"
                >
                  {agent.user.email}
                </a>
              </div>

              {agent.user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`tel:${agent.user.phone}`}
                    className="hover:underline"
                  >
                    {agent.user.phone}
                  </a>
                </div>
              )}

              {agent.licenseNumber && (
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Carte pro : {agent.licenseNumber}</span>
                </div>
              )}

              {memberSince && (
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Membre depuis le {memberSince}</span>
                </div>
              )}

              {agent.bio && (
                <p className="border-t pt-3 text-muted-foreground">
                  {agent.bio}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Frais de visite &amp; dépenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    agent.canManageCash ? "bg-green-500" : "bg-muted-foreground"
                  }`}
                />
                <span className="text-sm font-medium">
                  {agent.canManageCash ? "Accès autorisé" : "Accès non autorisé"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {agent.canManageCash
                  ? "Cet agent peut consulter et saisir les frais de visite et les dépenses de chaque jour."
                  : "Accès réservé au gérant. Le gérant peut autoriser cet agent à les consulter et les saisir."}
              </p>
              {canToggleCash && (
                <Button
                  className="w-full"
                  variant={agent.canManageCash ? "outline" : "default"}
                  disabled={cashAccess.isPending}
                  onClick={() => cashAccess.mutate(!agent.canManageCash)}
                >
                  {cashAccess.isPending
                    ? "Mise à jour..."
                    : agent.canManageCash
                      ? "Retirer l'accès"
                      : "Autoriser l'accès"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Clients assignés
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({clientsCount})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientsList.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsList.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.firstName} {c.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{c.phone}</div>
                          {c.email && (
                            <div className="text-xs text-muted-foreground">
                              {c.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/crm/clients/${c.id}`}>Voir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {clientsCount > clientsList.length && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    {clientsList.length} derniers clients affichés sur{" "}
                    {clientsCount}.
                  </p>
                )}
              </>
            ) : (
              <div className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {clientsCount > 0
                    ? `Cet agent a ${clientsCount} client(s), mais la liste détaillée n'est pas disponible.`
                    : "Aucun client pour cet agent."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}