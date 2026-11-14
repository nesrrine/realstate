'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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

import {
  clientsService,
  FINANCING_LABELS,
  type Client,
  type ClientType,
  type CreateClientDto,
  type Financing,
} from '@/services/clients.service';
import { agentsService } from '@/services/agents.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { fullName } from '@/lib/property-constants';

// --------------------------------------------------
// Validation
// --------------------------------------------------

const schema = z.object({
  firstName: z.string().min(2, 'Minimum 2 caractères'),
  lastName: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().min(8, 'Numéro de téléphone invalide'),
  whatsapp: z.string().optional(),
  cinOrPassport: z.string().min(1, 'CNI ou Passeport requis'),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  professionalAddress: z.string().min(1, 'Adresse professionnelle requise'),
  clientType: z.enum(['BUYER', 'SELLER', 'RENTER']),
  followUpStatus: z.enum([
    'TO_CONTACT',
    'CONTACTED',
    'NEGOTIATION',
    'WON',
    'LOST',
  ]).optional(),
  nextFollowUpAt: z.string().optional(),
  status: z.enum(['PROSPECT', 'CLIENT']).optional(),
  budget: z.string().optional(),
  notes: z.string().optional(),
  agentId: z.string().optional(),
  financing: z.enum(['CASH', 'CREDIT', 'MIXED']).optional().or(z.literal('')),
  needDescription: z.string().max(2000).optional(),
  fieldAgentId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  mode: 'create' | 'edit';
  client?: Client;
}

const NONE = '__none__';

const selectOptions = {
  shouldDirty: true,
  shouldValidate: true,
};

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function formatDateTimeLocal(
  value?: string | number | Date | null,
): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultValues(client?: Client): FormValues {
  return {
    firstName: client?.firstName ?? '',
    lastName: client?.lastName ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    whatsapp: client?.whatsapp ?? '',
    cinOrPassport: client?.cinOrPassport ?? '',
    address: client?.address ?? '',
    city: client?.city ?? '',
    zipCode: client?.zipCode ?? '',
    professionalAddress: client?.professionalAddress ?? '',
    clientType: client?.clientType ?? 'BUYER',
    status: client?.status ?? 'PROSPECT',
    followUpStatus: client?.followUpStatus ?? 'TO_CONTACT',
    nextFollowUpAt: formatDateTimeLocal(client?.nextFollowUpAt),
    budget: client?.budget != null ? String(client.budget) : '',
    notes: client?.notes ?? '',
    agentId: client?.agent?.id != null
      ? String(client.agent.id)
      : client?.agentId != null
        ? String(client.agentId)
        : '',
    financing: client?.financing ?? '',
    needDescription: client?.needDescription ?? '',
    fieldAgentId: client?.fieldAgent?.id != null
      ? String(client.fieldAgent.id)
      : client?.fieldAgentId != null
        ? String(client.fieldAgentId)
        : '',
  };
}

// --------------------------------------------------
// Component
// --------------------------------------------------

export function ClientForm({ mode, client }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();

  const isEdit = mode === 'edit';

  const canPickAgent =
    user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // --------------------------------------------------
  // Agents
  // --------------------------------------------------

  const {
    data: agents = [],
    isLoading: isLoadingAgents,
  } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    staleTime: 5 * 60_000,
  });

  // --------------------------------------------------
  // Form
  // --------------------------------------------------

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(client),
  });

  useEffect(() => {
    if (isEdit && client) {
      reset(getDefaultValues(client));
    }
  }, [client, isEdit, reset]);

  // --------------------------------------------------
  // Watched fields
  // --------------------------------------------------

  const clientType = watch('clientType');
  const status = watch('status');
  const followUpStatusVal = watch('followUpStatus');
  const agentId = watch('agentId');
  const financing = watch('financing');
  const fieldAgentId = watch('fieldAgentId');

  // --------------------------------------------------
  // Mutation
  // --------------------------------------------------

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const nextFollowUpAt = values.nextFollowUpAt?.trim()
        ? new Date(values.nextFollowUpAt).toISOString()
        : undefined;

      const budget = values.budget?.trim()
        ? Number(values.budget)
        : undefined;

      const payload: Partial<CreateClientDto> = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: values.phone.trim(),
        clientType: values.clientType,
        status: values.status,
        followUpStatus: values.followUpStatus,
        nextFollowUpAt,
        budget,
        notes: values.notes?.trim() || undefined,
        whatsapp: values.whatsapp?.trim() || undefined,
        cinOrPassport: values.cinOrPassport.trim(),
        address: values.address?.trim() || undefined,
        city: values.city?.trim() || undefined,
        zipCode: values.zipCode?.trim() || undefined,
        professionalAddress: values.professionalAddress.trim(),
        financing: values.financing || undefined,
        needDescription: values.needDescription?.trim() || undefined,
        fieldAgentId: values.fieldAgentId || undefined,
      };

      if (canPickAgent && values.agentId) {
        payload.agentId = values.agentId;
      }

      if (values.email?.trim()) {
        payload.email = values.email.trim();
      }

      // CORRECTION : conversion de Client.id en string
      if (isEdit && client) {
        return clientsService.update(String(client.id), payload);
      }

      return clientsService.create(payload);
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.clients.all,
      });

      qc.invalidateQueries({
        queryKey: ['clients'],
      });

      // CORRECTION : conversion de Client.id en string
      if (isEdit && client) {
        qc.invalidateQueries({
          queryKey: queryKeys.clients.detail(String(client.id)),
        });
      }

      toast.success(
        isEdit ? 'Client mis à jour' : 'Client créé',
      );

      router.push('/crm/clients');
    },

    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const onSubmit = (values: FormValues) => {
    if (values.budget?.trim()) {
      const budget = Number(values.budget);

      if (!Number.isFinite(budget) || budget < 0) {
        toast.error('Le budget doit être un montant positif.');
        return;
      }
    }

    if (values.nextFollowUpAt?.trim()) {
      const date = new Date(values.nextFollowUpAt);

      if (Number.isNaN(date.getTime())) {
        toast.error('Date de relance invalide.');
        return;
      }
    }

    mutation.mutate(values);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">

          {/* Personal information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Coordonnées et informations de contact du client
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Prénom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder="Prénom"
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Nom"
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="client@example.com"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Téléphone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="+216 XX XXX XXX"
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  {...register('whatsapp')}
                  placeholder="+216 XX XXX XXX"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cinOrPassport">
                  CNI / Passeport <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cinOrPassport"
                  {...register('cinOrPassport')}
                  placeholder="Numéro de CNI ou passeport"
                  aria-invalid={!!errors.cinOrPassport}
                />
                {errors.cinOrPassport && (
                  <p className="text-xs text-destructive">
                    {errors.cinOrPassport.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="Tunis"
                />
              </div>

            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
              <CardDescription>
                Adresse personnelle et professionnelle
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresse personnelle</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="Adresse du client"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="professionalAddress">
                  Adresse professionnelle{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="professionalAddress"
                  {...register('professionalAddress')}
                  placeholder="Adresse professionnelle"
                  aria-invalid={!!errors.professionalAddress}
                />
                {errors.professionalAddress && (
                  <p className="text-xs text-destructive">
                    {errors.professionalAddress.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">Code postal</Label>
                <Input
                  id="zipCode"
                  {...register('zipCode')}
                  placeholder="1000"
                />
              </div>

            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes et besoins</CardTitle>
              <CardDescription>
                Informations utiles pour le suivi immobilier
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="needDescription">
                  Besoin exact du client
                </Label>
                <textarea
                  id="needDescription"
                  {...register('needDescription')}
                  rows={4}
                  maxLength={2000}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Ex : terrain 300 m² en zone villa à la Soukra, proche de l'école..."
                />
                {errors.needDescription && (
                  <p className="text-xs text-destructive">
                    {errors.needDescription.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes internes</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Préférences, remarques, historique..."
                />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Client type */}
          <Card>
            <CardHeader>
              <CardTitle>Type de client</CardTitle>
              <CardDescription>
                Gestion commerciale et suivi
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="clientType">
                  Type <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={clientType}
                  onValueChange={(value) =>
                    setValue('clientType', value as ClientType, selectOptions)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUYER">Acheteur</SelectItem>
                    <SelectItem value="SELLER">Vendeur</SelectItem>
                    <SelectItem value="RENTER">Locataire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={status || 'PROSPECT'}
                    onValueChange={(value) =>
                      setValue(
                        'status',
                        value as 'PROSPECT' | 'CLIENT',
                        selectOptions,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROSPECT">Prospect</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="followUpStatus">Statut de suivi</Label>
                <Select
                  value={followUpStatusVal || 'TO_CONTACT'}
                  onValueChange={(value) =>
                    setValue(
                      'followUpStatus',
                      value as FormValues['followUpStatus'],
                      selectOptions,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TO_CONTACT">À contacter</SelectItem>
                    <SelectItem value="CONTACTED">Contacté</SelectItem>
                    <SelectItem value="NEGOTIATION">En négociation</SelectItem>
                    <SelectItem value="WON">Gagné</SelectItem>
                    <SelectItem value="LOST">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextFollowUpAt">
                  Prochaine relance
                </Label>
                <Input
                  id="nextFollowUpAt"
                  type="datetime-local"
                  {...register('nextFollowUpAt')}
                />
                {errors.nextFollowUpAt && (
                  <p className="text-xs text-destructive">
                    {errors.nextFollowUpAt.message}
                  </p>
                )}
              </div>

              {/* Responsible agent */}
              {canPickAgent && (
                <div className="space-y-2">
                  <Label htmlFor="agentId">Agent responsable</Label>

                  <Select
                    value={agentId || NONE}
                    onValueChange={(value) =>
                      setValue(
                        'agentId',
                        value === NONE ? '' : value,
                        selectOptions,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un agent" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={NONE}>
                        Aucun agent
                      </SelectItem>

                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {fullName(a.user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-muted-foreground">
                    Si aucun agent n&apos;est sélectionné, l&apos;assignation par défaut
                    du backend sera appliquée.
                  </p>
                </div>
              )}

              {/* Financing */}
              <div className="space-y-2">
                <Label htmlFor="financing">Mode de paiement</Label>

                <Select
                  value={financing || NONE}
                  onValueChange={(value) =>
                    setValue(
                      'financing',
                      value === NONE ? '' : (value as Financing),
                      selectOptions,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Non précisé" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={NONE}>
                      Non précisé
                    </SelectItem>

                    {(Object.keys(FINANCING_LABELS) as Financing[]).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FINANCING_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field agent */}
              <div className="space-y-2">
                <Label htmlFor="fieldAgentId">Agent terrain</Label>

                <Select
                  value={fieldAgentId || NONE}
                  onValueChange={(value) =>
                    setValue(
                      'fieldAgentId',
                      value === NONE ? '' : value,
                      selectOptions,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un agent" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={NONE}>
                      Aucun agent
                    </SelectItem>

                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {fullName(a.user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  Agent qui effectue les visites avec ce client.
                </p>
              </div>

              {isLoadingAgents && (
                <p className="text-xs text-muted-foreground">
                  Chargement des agents...
                </p>
              )}

              {/* Budget */}
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (optionnel)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="any"
                  {...register('budget')}
                  placeholder="150000"
                />
                {errors.budget && (
                  <p className="text-xs text-destructive">
                    {errors.budget.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Budget maximum en dinars (DT)
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Information */}
          {isEdit && client && (
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Référence</p>
                  <p className="font-medium">#{client.id}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Ajouté le</p>
                  <p className="font-medium">
                    {new Date(String(client.createdAt)).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Mis à jour le
                  </p>
                  <p className="font-medium">
                    {new Date(String(client.updatedAt)).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          asChild
          disabled={mutation.isPending}
        >
          <Link href="/crm/clients">
            Annuler
          </Link>
        </Button>

        <Button
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? 'Enregistrer les modifications' : 'Créer le client'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}