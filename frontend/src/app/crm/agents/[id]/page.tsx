"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Edit, Mail, Phone, Wallet } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { agentsService } from "@/services/agents.service";
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
import { cashService } from "@/services/cash.service";
import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/query-keys";
import { DeleteAgentButton } from "@/components/agents/delete-agent-dialog";
import { AgentTypeBadge } from "@/components/agents/agent-type-badge";

export default function AgentDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const isAgentRole = user?.role === "AGENT";

  useEffect(() => {
    if (!authLoading && isAgentRole) {
      router.replace("/crm/dashboard");
    }
  }, [authLoading, isAgentRole, router]);

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agents", "detail", id],
    queryFn: () => agentsService.getById(id),
    enabled: !!id && !authLoading && !!user && !isAgentRole,
  });

  const qc = useQueryClient();
  const cashAccess = useMutation({
    mutationFn: (enabled: boolean) => cashService.setAgentAccess(id, enabled),
    onSuccess: ({ canManageCash }) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: queryKeys.cash.all });
      toast.success(canManageCash ? "Accès aux frais et dépenses accordé" : "Accès aux frais et dépenses retiré");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (authLoading || isAgentRole || isLoading) {
    return <div className="py-12 text-center">Chargement...</div>;
  }

  if (!agent) {
    return <div className="py-12 text-center">Agent introuvable</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/agents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{fullName(agent.user)}</h1>
            <div className="mt-1 flex items-center gap-2 text-muted-foreground">
              Fiche agent
              <AgentTypeBadge type={agent.agentType} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/crm/agents/${id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
          {/* Gérant / admin, jamais sur son propre compte */}
          {!isAgentRole && agent.user.email !== user?.email && (
            <DeleteAgentButton
              agentId={id}
              agentName={fullName(agent.user)}
              myAgentId={user?.agentId}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agent._count?.clients ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Biens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {agent._count?.properties ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visites
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Agent terrain : visites accompagnées ; agent bureau : visites planifiées */}
            <p className="text-2xl font-bold">
              {agent.agentType === "OFFICE"
                ? (agent._count?.officeAgentVisits ?? 0)
                : (agent._count?.fieldAgentVisits ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {agent.agentType === "OFFICE" ? "planifiées" : "accompagnées"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Frais de visite &amp; dépenses</p>
              <p className="text-sm text-muted-foreground">
                {agent.canManageCash
                  ? "Cet agent peut consulter et saisir les frais de visite et les dépenses de chaque jour."
                  : "Accès réservé au gérant. Autorisez cet agent pour qu'il puisse les consulter et les saisir."}
              </p>
            </div>
          </div>
          <Button
            variant={agent.canManageCash ? "outline" : "default"}
            disabled={cashAccess.isPending}
            onClick={() => cashAccess.mutate(!agent.canManageCash)}
          >
            {agent.canManageCash ? "Retirer l'accès" : "Autoriser l'accès"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {agent.user.email}
          </div>
          {agent.user.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {agent.user.phone}
            </div>
          )}
          <Badge variant={agent.user.isActive ? "default" : "secondary"}>
            {agent.user.isActive ? "Actif" : "Inactif"}
          </Badge>
          {agent.licenseNumber && (
            <p className="text-sm text-muted-foreground">
              Carte pro : {agent.licenseNumber}
            </p>
          )}
          {agent.bio && <p className="text-sm">{agent.bio}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients assignés</CardTitle>
        </CardHeader>
        <CardContent>
          {agent.clients && agent.clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agent.clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.firstName} {c.lastName}
                    </TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell>
                      <Link href={`/crm/clients/${c.id}`}>
                        <Button variant="outline" size="sm">
                          Voir
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun client pour cet agent.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
