"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyForm } from "@/components/properties/property-form";
import {
  PublicationBadge,
  StatusBadge,
} from "@/components/properties/property-badges";
import { propertiesService } from "@/services/properties.service";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { canEditProperty } from "@/lib/permissions";
import { useAuth } from "@/providers/AuthProvider";

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const { user } = useAuth();

  const {
    data: property,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn: () => propertiesService.getById(id),
    enabled: !!id,
  });

  const canEdit = !!property && canEditProperty(user, property);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* ───────── En-tête de page ───────── */}
      <header className="space-y-3">
        <Link
          href="/crm/properties"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Modifier le bien
            </h1>
            {property?.title && (
              <p className="truncate text-sm text-muted-foreground">
                {property.title}
              </p>
            )}
          </div>

          {property && (
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={property.status} />
              <PublicationBadge published={property.isPublished} />
            </div>
          )}
        </div>
      </header>

      {/* ───────── Chargement : imite la vraie mise en page (formulaire + colonne de droite) ───────── */}
      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-10 w-full" />
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* ───────── Erreur ───────── */}
      {isError && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Impossible de charger ce bien
            </p>
            <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/crm/properties">Retour à la liste</Link>
          </Button>
        </div>
      )}

      {/* ───────── Accès refusé : un agent ne modifie que ses propres biens ───────── */}
      {property && !canEdit && (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Modification non autorisée</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Ce bien est suivi par un autre agent : vous pouvez le consulter,
              pas le modifier.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/crm/properties/${property.id}`}>Voir le bien</Link>
          </Button>
        </div>
      )}

      {/* ───────── Formulaire ───────── */}
      {property && canEdit && <PropertyForm mode="edit" property={property} />}
    </div>
  );
}