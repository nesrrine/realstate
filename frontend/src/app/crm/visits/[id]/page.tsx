"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { visitsService } from "@/services/visits.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Printer,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { AiVisitMessageButton, AiVisitReportButton } from "@/components/ai/ai-visit-tools";
import { VisitNumberBadge, revisitHref } from "@/components/visits/visit-number-badge";
import { settingsService, AGENCY_SETTINGS_KEY } from "@/services/settings.service";
import { whatsappLink } from "@/services/ai.service";
import { canDelete } from "@/lib/permissions";
import { useAuth } from "@/providers/AuthProvider";

export default function VisitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const visitId = params.id as string;
  const { user } = useAuth();
  // ?confirmer=1 : arrivée juste après la planification → proposer le message de confirmation
  const autoConfirm = useSearchParams().get("confirmer") === "1";
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const {
    data: visit,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => visitsService.getById(visitId),
    enabled: !!visitId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => visitsService.delete(visitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("Visite supprimée");
      router.push("/crm/visits");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
      setIsDeleting(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => visitsService.update(visitId, { status: "COMPLETED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.visits.all });
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      toast.success("Visite terminée : le prospect est devenu client confirmé");
    },
    onError: () => {
      toast.error("Impossible de terminer la visite");
      setIsCompleting(false);
    },
  });

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette visite ?")) {
      return;
    }
    setIsDeleting(true);
    deleteMutation.mutate();
  };

  const handleComplete = async () => {
    if (!confirm("Marquer cette visite comme terminée ? Le client sera automatiquement confirmé.")) {
      return;
    }
    setIsCompleting(true);
    completeMutation.mutate();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "Planifiée";
      case "CONFIRMED":
        return "Confirmée";
      case "COMPLETED":
        return "Terminée";
      case "CANCELLED":
        return "Annulée";
      case "NO_SHOW":
        return "Absent";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-500";
      case "CONFIRMED":
        return "bg-indigo-500";
      case "COMPLETED":
        return "bg-green-500";
      case "CANCELLED":
        return "bg-red-500";
      case "NO_SHOW":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(date);
  };

  // Rappel la veille / le jour même : date, heure, lieu de l'agence et frais de visite
  const { data: agency } = useQuery({
    queryKey: AGENCY_SETTINGS_KEY,
    queryFn: settingsService.getAgency,
    staleTime: 5 * 60_000,
  });
  const reminderText = visit
    ? [
        `Bonjour ${visit.client?.firstName ?? ""}, petit rappel de votre visite le ${formatDateTime(visit.scheduledAt)}.`,
        visit.properties?.length
          ? `Bien : ${visit.properties.map((p: { property: { title: string } }) => p.property.title).join(", ")}`
          : "",
        agency?.address || agency?.mapsUrl
          ? `Rendez-vous à l'agence ${agency.name}${agency.address ? ` : ${agency.address}` : ""}${agency.mapsUrl ? `\n📍 ${agency.mapsUrl}` : ""}`
          : "",
        agency ? `Frais de visite : ${agency.visitFee} DT.` : "",
        "À bientôt !",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="space-y-6">
        <Link href="/crm/visits">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Visite non trouvée</h3>
            <p className="text-muted-foreground">
              Cette visite n&apos;existe pas ou a été supprimée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/crm/visits">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          {(visit.status === "SCHEDULED" || visit.status === "CONFIRMED") && (
            <AiVisitMessageButton visitId={visit.id} autoOpen={autoConfirm} />
          )}
          {visit.status === "COMPLETED" && (
            <AiVisitReportButton
              visitId={visit.id}
              clientName={`${visit.client?.firstName ?? ""} ${visit.client?.lastName ?? ""}`.trim()}
            />
          )}
          {(visit.status === "SCHEDULED" || visit.status === "CONFIRMED") && (
            <Button
              variant="default"
              onClick={handleComplete}
              disabled={isCompleting}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isCompleting ? "En cours..." : "Marquer comme terminée"}
            </Button>
          )}
          <Link href={`/crm/visits/${visit.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
          <Link href={`/crm/visits/${visit.id}/bon-de-visite`} target="_blank">
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Bon de visite
            </Button>
          </Link>
          {canDelete(user) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visit Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    Visite du bien
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getStatusColor(visit.status)}>
                      {getStatusLabel(visit.status)}
                    </Badge>
                    <VisitNumberBadge number={visit.visitNumber} />
                    {visit.clientVisitCount ? (
                      <span className="text-xs text-muted-foreground">
                        {visit.clientVisitCount} visite{visit.clientVisitCount > 1 ? "s" : ""} au total pour ce client
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Date et heure */}
                <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date et heure
                    </p>
                    <p className="font-medium text-lg">
                      {formatDateTime(visit.scheduledAt)}
                    </p>
                    {visit.duration && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Durée : {visit.duration} minutes
                      </p>
                    )}
                  </div>
                </div>

                {/* Bien immobilier */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Bien immobilier
                  </h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        {visit.properties && visit.properties.length > 0 ? (
                          visit.properties.map(
                            (p: {
                              id: string;
                              property: {
                                id: string;
                                title: string;
                                address: string;
                                city: string;
                              };
                            }) => (
                              <div key={p.property.id} className="space-y-2">
                                <p className="font-medium text-lg">
                                  {p.property.title}
                                </p>
                                <p className="text-muted-foreground">
                                  {p.property.address}, {p.property.city}
                                </p>
                                <Link href={`/crm/properties/${p.property.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                  >
                                    Voir le bien
                                  </Button>
                                </Link>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="text-muted-foreground">
                            Aucun bien associé
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Client */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client
                  </h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <p className="font-medium text-lg">
                          {visit.client.firstName} {visit.client.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {visit.client.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {visit.client.phone}
                        </div>
                        <Link href={`/crm/clients/${visit.client.id}`}>
                          <Button variant="outline" size="sm" className="mt-2">
                            Voir le client
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Notes */}
                {visit.feedback && (
                  <div>
                    <h3 className="font-semibold mb-2">Retour de visite</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {visit.feedback}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Visit Info */}
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
                <p className="text-sm text-muted-foreground">Mise à jour le</p>
                <p className="font-medium">
                  {new Date(visit.updatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent terrain</p>
                <p className="font-medium">
                  {visit.fieldAgent?.user ? `${visit.fieldAgent.user.firstName} ${visit.fieldAgent.user.lastName}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent bureau</p>
                <p className="font-medium">
                  {visit.officeAgent?.user ? `${visit.officeAgent.user.firstName} ${visit.officeAgent.user.lastName}` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visit.client?.phone && (visit.status === "SCHEDULED" || visit.status === "CONFIRMED") && (
                <Button className="w-full" variant="outline" asChild>
                  <a href={whatsappLink(visit.client.phone, reminderText)} target="_blank" rel="noopener noreferrer">
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer un rappel (WhatsApp)
                  </a>
                </Button>
              )}
              {visit.client && (
                <Button className="w-full" variant="outline" asChild>
                  <Link
                    href={revisitHref(
                      visit.client.id,
                      (visit.properties ?? []).map((p: { property: { id: string } }) => p.property.id),
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Planifier une revisite
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
