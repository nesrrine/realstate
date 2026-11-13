"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { AgentForm } from "@/components/agents/agent-form";
import { agentsService } from "@/services/agents.service";
import { Button } from "@/components/ui/button";

export default function AgentEditPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    if (!authLoading && (!user || !canEdit)) {
      router.replace("/crm/dashboard");
    }
  }, [authLoading, user, canEdit, router]);

  const {
    data: agent,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agents", "detail", id],
    queryFn: () => agentsService.getById(id),
    enabled: !!id && !authLoading && canEdit,
  });

  if (authLoading || (user && !canEdit) || isLoading) {
    return <div className="py-12 text-center">Chargement...</div>;
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="py-12 text-center">
        Erreur lors du chargement de l&apos;agent.
      </div>
    );
  }

  if (!agent) {
    return <div className="py-12 text-center">Agent introuvable</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm/agents">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <h1 className="text-2xl font-bold">Modifier l&apos;agent</h1>
      </div>

      <AgentForm mode="edit" agent={agent} />
    </div>
  );
}