"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";

import { transactionsService } from "@/services/transactions.service";
import { fullName } from "@/lib/property-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDt(value: number | string) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 2 }).format(n);
}

const statusLabel: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Finalisée",
  CANCELLED: "Annulée",
};

export default function TransactionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    data: tx,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionsService.getById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }

  if (error || !tx) {
    return (
      <div className="space-y-4">
        <Link href="/crm/transactions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <p className="text-destructive">Transaction introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/transactions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction</h1>
          <p className="text-muted-foreground">
            {tx.property?.title ?? tx.propertyId}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Détails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{tx.type === "SALE" ? "Vente" : "Location"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-semibold">{formatDt(tx.amount)} DT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant="secondary">
                {statusLabel[tx.status] ?? tx.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>
                {tx.date ? new Date(tx.date).toLocaleDateString("fr-FR") : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span>
                {tx.client
                  ? `${tx.client.firstName} ${tx.client.lastName}`
                  : tx.clientId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Propriétaire</span>
              <span>
                {tx.owner
                  ? `${tx.owner.firstName} ${tx.owner.lastName}`
                  : tx.ownerId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent terrain</span>
              <span>
                {tx.fieldAgent?.user ? fullName(tx.fieldAgent.user) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent bureau</span>
              <span>
                {tx.officeAgent?.user ? fullName(tx.officeAgent.user) : "—"}
              </span>
            </div>
            {tx.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1">{tx.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission</CardTitle>
          </CardHeader>
          <CardContent>
            {!tx.commission ? (
              <p className="text-muted-foreground text-sm">
                Aucune commission liée.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taux</span>
                  <span>
                    {(Number(tx.commission.commissionRate) * 100).toFixed(2)} %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agence</span>
                  <span>{formatDt(tx.commission.agencyAmount)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent terrain</span>
                  <span>{formatDt(tx.commission.fieldAgentAmount)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent bureau</span>
                  <span>{formatDt(tx.commission.officeAgentAmount)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {formatDt(tx.commission.amount)} DT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paiement</span>
                  <Badge variant="secondary">
                    {tx.commission.paymentStatus}
                  </Badge>
                </div>
                <Link href="/crm/commissions">
                  <Button variant="outline" size="sm" className="mt-2">
                    Voir toutes les commissions
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
