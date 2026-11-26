"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Eye } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { AgentForm } from "@/components/agents/agent-form";
import { ResetPasswordButton } from "@/components/agents/reset-password-dialog";
import { agentsService } from "@/services/agents.service";
import { Button } from "@/components/ui/button";
import { fullName } from "@/lib/property-constants";

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function PageSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-6">
      <div className="h-16 rounded-xl bg-muted" />
      <div className="h-96 rounded-xl bg-muted" />
    </div>
  );
}

export default function AgentEditPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER";

  // Accès réservé aux ADMIN / MANAGER
  useEffect(() => {
    if (!authLoading && (!user || !canEdit)) {
      router.replace("/crm/dashboard");
    }
  }, [authLoading, user, canEdit, router]);

  const {
    data: agent,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["agents", "detail", id],
    queryFn: () => agentsService.getById(id),
    enabled: !!id && !authLoading && canEdit,
  });

  // Mêmes règles que le back : pas son propre compte,
  // et un compte MANAGER n'est modifiable que par un MANAGER
  const isSelf = !!agent && agent.user.email === user?.email;
  const blockedByRole =
    !!agent && agent.user.role === "MANAGER" && user?.role !== "MANAGER";
  const forbidden = isSelf || blockedByRole;

  useEffect(() => {
    if (agent && forbidden) {
      toast.error(
        isSelf
          ? "Vous ne pouvez pas modifier votre propre compte depuis cette page"
          : "Seul le gérant peut modifier ce compte",
      );
      router.replace(`/crm/agents/${id}`);
    }
  }, [agent, forbidden, isSelf, id, router]);

  if (authLoading || !user || !canEdit || isLoading || forbidden) {
    return <PageSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">
          Erreur lors du chargement de l&apos;agent.
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

  // ADMIN et MANAGER, comptes AGENT uniquement (son propre compte est déjà exclu)
  const canResetPassword = agent.user.role === "AGENT";

  return (
    <div className="w-full space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/crm/agents/${id}`} aria-label="Retour à la fiche">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
            {initials(agent.user.firstName, agent.user.lastName)}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              Modifier l&apos;agent
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {fullName(agent.user)} · {agent.user.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/crm/agents/${id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Voir la fiche
            </Link>
          </Button>

          {canResetPassword && (
            <ResetPasswordButton
              agentId={id}
              agentName={fullName(agent.user)}
            />
          )}
        </div>
      </div>

      <AgentForm mode="edit" agent={agent} />
    </div>
  );
}