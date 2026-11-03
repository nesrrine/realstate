"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { visitsService } from "@/services/visits.service";
import { VisitForm } from "@/components/visits/visit-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditVisitPage() {
  const params = useParams();
  const visitId = params.id as string;

  const { data: visit, isLoading } = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => visitsService.getById(visitId),
    enabled: !!visitId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="space-y-6">
        <Link href="/crm/visits">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Visite non trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/crm/visits/${visit.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier la visite
          </h1>
          <p className="text-muted-foreground">
            {new Date(visit.scheduledAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      <VisitForm mode="edit" visit={visit} />
    </div>
  );
}
