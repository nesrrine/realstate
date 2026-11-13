"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { transactionsService } from "@/services/transactions.service";
import type { UpdateTransactionDto } from "@/services/transactions.service";
import { agentsService } from "@/services/agents.service";
import { getErrorMessage } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  amount: z.coerce.number().positive("Le montant doit être supérieur à zéro"),
  date: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  notes: z.string().optional(),
  fieldAgentId: z.string().min(1, "Agent terrain requis"),
  officeAgentId: z.string().min(1, "Agent bureau requis"),
});

type FormValues = z.infer<typeof schema>;

function formatDt(value: number | string | undefined | null) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("fr-TN", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function getDateInputValue(value?: string | null) {
  if (!value) return "";

  // Une date ISO provenant de l'API.
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Finalisée",
  CANCELLED: "Annulée",
};

export function TransactionEditForm({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      date: "",
      status: "PENDING",
      notes: "",
      fieldAgentId: "",
      officeAgentId: "",
    },
  });

  // Charger la transaction à modifier.
  const {
    data: transaction,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionsService.getById(id),
    enabled: !!id,
  });

  // Charger les agents disponibles.
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["agents", "options"],
    queryFn: () => agentsService.getOptions(),
  });

  // Préremplir le formulaire dès réception de la transaction.
  useEffect(() => {
    if (!transaction) return;

    reset({
      amount: Number(transaction.amount),
      date: getDateInputValue(transaction.date),
      status: transaction.status,
      notes: transaction.notes ?? "",
      fieldAgentId: transaction.fieldAgentId ?? "",
      officeAgentId: transaction.officeAgentId ?? "",
    });
  }, [transaction, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: UpdateTransactionDto = {
        amount: values.amount,
        date: values.date || undefined,
        status: values.status,
        notes: values.notes ?? "",
        fieldAgentId: values.fieldAgentId,
        officeAgentId: values.officeAgentId,
      };

      return transactionsService.update(id, payload);
    },

    onSuccess: async () => {
      toast.success("Transaction modifiée avec succès");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["transactions"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["transaction", id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["commissions"],
        }),
      ]);

      router.push(`/crm/transactions/${id}`);
    },

    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de la transaction...
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <Card>
        <CardContent className="py-6 space-y-4">
          <p className="text-destructive">
            Impossible de charger cette transaction.
          </p>

          <Button
            variant="outline"
            onClick={() => router.push("/crm/transactions")}
          >
            Retour aux transactions
          </Button>
        </CardContent>
      </Card>
    );
  }

  const commissionPaid =
    transaction.commission?.paymentStatus === "PAID";

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Informations de la transaction</CardTitle>
          <CardDescription>
            Les informations du bien, du client et le type de transaction
            sont conservés.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Bien</Label>
            <Input
              value={transaction.property?.title ?? transaction.propertyId}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Input
              value={
                transaction.client
                  ? `${transaction.client.firstName} ${transaction.client.lastName}`
                  : transaction.clientId
              }
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Input
              value={transaction.type === "SALE" ? "Vente" : "Location"}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>Montant (DT) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un statut" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                    <SelectItem value="COMPLETED">Finalisée</SelectItem>
                    <SelectItem value="CANCELLED">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affectation des agents</CardTitle>
          <CardDescription>
            Tu peux modifier les agents associés à cette transaction.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Agent terrain *</Label>

            <Controller
              control={control}
              name="fieldAgentId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={agentsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un agent terrain" />
                  </SelectTrigger>

                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.user.firstName} {agent.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {errors.fieldAgentId && (
              <p className="text-sm text-destructive">
                {errors.fieldAgentId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Agent bureau *</Label>

            <Controller
              control={control}
              name="officeAgentId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={agentsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un agent bureau" />
                  </SelectTrigger>

                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.user.firstName} {agent.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {errors.officeAgentId && (
              <p className="text-sm text-destructive">
                {errors.officeAgentId.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>

        <CardContent>
          <Input
            placeholder="Ajouter une note..."
            {...register("notes")}
          />
        </CardContent>
      </Card>

      {transaction.commission && (
        <Card>
          <CardHeader>
            <CardTitle>Commission associée</CardTitle>
            <CardDescription>
              Les montants de commission sont gérés par le backend.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Commission totale
              </span>
              <strong>{formatDt(transaction.commission.amount)} DT</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Paiement</span>
              <strong>{transaction.commission.paymentStatus}</strong>
            </div>

            {commissionPaid && (
              <p className="text-amber-600">
                Cette commission est déjà payée. Le backend doit empêcher
                toute modification incompatible avec ce paiement.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/crm/transactions/${id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Annuler
        </Button>

        <Button type="submit" disabled={mutation.isPending || agentsLoading}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}

          Enregistrer les modifications
        </Button>
      </div>
    </form>
  );
}