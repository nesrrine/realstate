'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { transactionsService } from '@/services/transactions.service';
import { commissionsService } from '@/services/commissions.service';
import { propertiesService } from '@/services/properties.service';
import { clientsService, type Client } from '@/services/clients.service';
import { agentsService } from '@/services/agents.service';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  propertyId: z.string().min(1, 'Bien requis'),
  clientId: z.string().min(1, 'Client requis'),
  ownerId: z.string().min(1, 'Propriétaire requis'),
  fieldAgentId: z.string().min(1, 'Agent terrain requis'),
  officeAgentId: z.string().min(1, 'Agent bureau requis'),
  transactionType: z.enum(['SALE', 'RENTAL']),
  amount: z.coerce.number().min(0, 'Montant invalide'),
  date: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function formatDt(value: number) {
  return new Intl.NumberFormat('fr-TN', {
    style: 'decimal',
    maximumFractionDigits: 2,
  }).format(value);
}

/** defaultPropertyId : transaction créée depuis la fiche d'un bien */
export function TransactionForm({ defaultPropertyId }: { defaultPropertyId?: string } = {}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<{
    amount: number;
    agencyAmount: number;
    fieldAgentAmount: number;
    officeAgentAmount: number;
    commissionRate: number;
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transactionType: 'SALE',
      status: 'PENDING',
      date: new Date().toISOString().slice(0, 10),
      propertyId: defaultPropertyId ?? '',
    },
  });

  const propertyId = watch('propertyId');
  const amount = watch('amount');

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', 'options'],
    queryFn: async () => {
      const result = await propertiesService.getAll({ limit: 100 });
      return result.data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'options'],
    queryFn: async () => {
      const result = await clientsService.getAll({ limit: 100 });
      return result.data;
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', 'options'],
    queryFn: () => agentsService.getOptions(),
  });

  const { data: config } = useQuery({
    queryKey: ['commissions', 'config'],
    queryFn: () => commissionsService.getConfig(),
  });

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId],
  );

  useEffect(() => {
    if (selectedProperty?.owner?.id) {
      setValue('ownerId', selectedProperty.owner.id);
    }
    if (selectedProperty?.fieldAgent?.id) {
      setValue('fieldAgentId', selectedProperty.fieldAgent.id);
    }
    if (selectedProperty?.officeAgent?.id) {
      setValue('officeAgentId', selectedProperty.officeAgent.id);
    }
    if (selectedProperty?.price && !amount) {
      setValue('amount', Number(selectedProperty.price));
    }
    if (selectedProperty?.transactionType) {
      setValue('transactionType', selectedProperty.transactionType);
    }
  }, [selectedProperty, setValue, amount]);

  useEffect(() => {
    if (!amount || amount <= 0) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const result = await commissionsService.preview(amount);
        setPreview(result);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [amount]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      transactionsService.create({
        ...values,
        createCommission: true,
      }),
    onSuccess: () => {
      toast.success('Transaction créée');
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
      router.push('/crm/transactions');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>Vente ou location — commission calculée automatiquement</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Bien *</Label>
            <Controller
              control={control}
              name="propertyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un bien" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} — {p.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertyId && (
              <p className="text-sm text-destructive">{errors.propertyId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Client *</Label>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c: Client) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clientId && (
              <p className="text-sm text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Agent terrain *</Label>
            <Controller
              control={control}
              name="fieldAgentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Agent terrain" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.user.firstName} {a.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fieldAgentId && (
              <p className="text-sm text-destructive">{errors.fieldAgentId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Agent bureau *</Label>
            <Controller
              control={control}
              name="officeAgentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Agent bureau" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.user.firstName} {a.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.officeAgentId && (
              <p className="text-sm text-destructive">{errors.officeAgentId.message}</p>
            )}
          </div>

          <input type="hidden" {...register('ownerId')} />

          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              control={control}
              name="transactionType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">Vente</SelectItem>
                    <SelectItem value="RENTAL">Location</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
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

          <div className="space-y-2">
            <Label>Montant (DT) *</Label>
            <Input type="number" step="0.01" {...register('amount')} />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...register('date')} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Input {...register('notes')} />
          </div>
        </CardContent>
      </Card>

      {preview && config && (
        <Card>
          <CardHeader>
            <CardTitle>Aperçu commission</CardTitle>
            <CardDescription>
              Taux global : {(config.commissionRate * 100).toFixed(2)} % — terrain :{' '}
              {(config.fieldAgentShareRate * 100).toFixed(0)} % — bureau :{' '}
              {(config.officeAgentShareRate * 100).toFixed(0)} %
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-4 text-sm">
            <div>
              <span className="text-muted-foreground">Commission totale</span>
              <p className="text-lg font-semibold">{formatDt(preview.amount)} DT</p>
            </div>
            <div>
              <span className="text-muted-foreground">Agence</span>
              <p className="text-lg font-semibold">{formatDt(preview.agencyAmount)} DT</p>
            </div>
            <div>
              <span className="text-muted-foreground">Agent terrain</span>
              <p className="text-lg font-semibold">{formatDt(preview.fieldAgentAmount)} DT</p>
            </div>
            <div>
              <span className="text-muted-foreground">Agent bureau</span>
              <p className="text-lg font-semibold">{formatDt(preview.officeAgentAmount)} DT</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Enregistrer
      </Button>
    </form>
  );
}
