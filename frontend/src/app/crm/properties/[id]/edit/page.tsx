"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/crm/properties"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour à la liste
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier le bien
          </h1>
          {property && (
            <>
              <StatusBadge status={property.status} />
              <PublicationBadge published={property.isPublished} />
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {isError && (
        <div className="space-y-3 py-12 text-center">
          <p className="text-destructive">{getErrorMessage(error)}</p>
          <Button variant="outline" asChild>
            <Link href="/crm/properties">Retour</Link>
          </Button>
        </div>
      )}

      {/* Un agent ne modifie que ses propres biens (l'API refuserait l'enregistrement) */}
      {property && !canEditProperty(user, property) && (
        <div className="space-y-3 py-12 text-center">
          <p className="text-muted-foreground">
            Ce bien est suivi par un autre agent : vous pouvez le consulter, pas le modifier.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/crm/properties/${property.id}`}>Voir le bien</Link>
          </Button>
        </div>
      )}

      {property && canEditProperty(user, property) && <PropertyForm mode="edit" property={property} />}
    </div>
  );
}
