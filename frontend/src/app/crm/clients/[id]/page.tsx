"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, Edit, Mail, Phone, Trash2, User } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

import { useAuth } from "@/providers/AuthProvider";
import { clientsService, FINANCING_LABELS } from "@/services/clients.service";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { AiPropertyMatchesCard } from "@/components/ai/ai-matches-card";
import { visitsService } from "@/services/visits.service";
import { revisitHref } from "@/components/visits/visit-number-badge";

export default function ClientDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => clientsService.getById(id),
    enabled: !!id && !authLoading && !!user,
  });

  // 1re visite = visite, les suivantes = revisites
  const { data: visitCount } = useQuery({
    queryKey: ["visits", "client-count", id],
    queryFn: () => visitsService.clientVisitCount(id),
    enabled: !!id && !authLoading && !!user,
  });

  // Suppression réservée au gérant / admin (fiche masquée, historique conservé)
  const router = useRouter();
  const qc = useQueryClient();
  const canDelete = user?.role === "ADMIN" || user?.role === "MANAGER";
  const deleteMutation = useMutation({
    mutationFn: () => clientsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success("Client supprimé (récupérable dans l’onglet « Supprimés »)");
      router.push("/crm/clients");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="py-12 text-center">
        Client introuvable ou accès refusé.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/clients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {client.firstName} {client.lastName}
            </h1>
            <p className="text-muted-foreground">
              Fiche client
              {visitCount && (
                <>
                  {" · "}
                  {visitCount.count === 0
                    ? "aucune visite"
                    : `${visitCount.count} visite${visitCount.count > 1 ? "s" : ""} (1 visite${visitCount.count > 1 ? ` + ${visitCount.count - 1} revisite${visitCount.count > 2 ? "s" : ""}` : ""})`}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={revisitHref(String(id))}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              {visitCount?.count ? "Planifier une revisite" : "Planifier une visite"}
            </Link>
          </Button>
          <Link href={`/crm/clients/${id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
          {canDelete && client.isActive !== false && (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm(`Supprimer ${client.firstName} ${client.lastName} ?`)) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={client.status === "CLIENT" ? "default" : "secondary"}
            >
              {client.status === "CLIENT" ? "Client confirmé" : "Prospect"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.clientType ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {client.budget ? formatPrice(Number(client.budget)) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <AiPropertyMatchesCard clientId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {client.email ?? "—"}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {client.phone}
          </div>
          {client.agent && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              Agent : {client.agent.user.firstName} {client.agent.user.lastName}
            </div>
          )}
          {client.fieldAgent && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              Agent terrain : {client.fieldAgent.user.firstName} {client.fieldAgent.user.lastName}
            </div>
          )}
          {client.financing && (
            <p className="text-sm">
              <span className="text-muted-foreground">Paiement : </span>
              {FINANCING_LABELS[client.financing] ?? client.financing}
            </p>
          )}
          {client.needDescription && (
            <div className="border-t border-border pt-2 text-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Besoin exact</p>
              <p className="whitespace-pre-wrap">{client.needDescription}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
