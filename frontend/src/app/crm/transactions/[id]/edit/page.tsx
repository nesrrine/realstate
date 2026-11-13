"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TransactionEditForm } from "@/components/transactions/transaction-edit-form";

export default function EditTransactionPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/crm/transactions/${id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier la transaction
          </h1>

          <p className="text-muted-foreground">
            Modifier les informations de la transaction.
          </p>
        </div>
      </div>

      <TransactionEditForm id={id} />
    </div>
  );
}