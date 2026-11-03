"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { clientsService } from "@/services/clients.service";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/clients/client-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientEditPage() {
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
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/crm/clients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier {client.firstName} {client.lastName}
          </h1>
          <p className="text-muted-foreground">
            Mettez à jour les informations du client
          </p>
        </div>
      </div>
      <ClientForm mode="edit" client={client} />
    </div>
  );
}
