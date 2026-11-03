'use client';

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

// ── Validation Schema ────────────────────────────────────────────────
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
  followUpStatus: z.enum(['TO_CONTACT', 'CONTACTED', 'NEGOTIATION', 'WON', 'LOST']).optional(),
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

export function ClientForm({ mode, client }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = mode === 'edit';
  const canPickAgent = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', 'options'],
    queryFn: agentsService.getOptions,
    // Liste aussi utile aux agents pour choisir l'agent terrain
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: client?.firstName || '',
      lastName: client?.lastName || '',
      email: client?.email || '',
      phone: client?.phone || '',
      whatsapp: client?.whatsapp || '',
      cinOrPassport: client?.cinOrPassport ?? '',
      address: client?.address || '',
      city: client?.city || '',
      zipCode: client?.zipCode || '',
      professionalAddress: client?.professionalAddress || '',
      clientType: client?.clientType || 'BUYER',
      status: client?.status || 'PROSPECT',
      followUpStatus: client?.followUpStatus || 'TO_CONTACT',
      nextFollowUpAt: client?.nextFollowUpAt || '',
      budget: client?.budget ? String(client.budget) : '',
      notes: client?.notes || '',
      agentId: client?.agent?.id ?? client?.agentId ?? '',
      financing: client?.financing ?? '',
      needDescription: client?.needDescription ?? '',
      fieldAgentId: client?.fieldAgent?.id ?? client?.fieldAgentId ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Partial<CreateClientDto> = {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        clientType: values.clientType,
        status: values.status,
        followUpStatus: values.followUpStatus,
        nextFollowUpAt: values.nextFollowUpAt || undefined,
        budget: values.budget ? Number(values.budget) : undefined,
        notes: values.notes,
        whatsapp: values.whatsapp,
        cinOrPassport: values.cinOrPassport,
        address: values.address,
        city: values.city,
        zipCode: values.zipCode,
        professionalAddress: values.professionalAddress,
        ...(canPickAgent && values.agentId ? { agentId: values.agentId } : {}),
        financing: values.financing || undefined,
        needDescription: values.needDescription,
        fieldAgentId: values.fieldAgentId || undefined,
      };
      // email optionnel : supprimer si vide
      if (values.email) {
        payload.email = values.email;
      }

      if (isEdit && client) {
        return clientsService.update(client.id, payload);
      }
      return clientsService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success(isEdit ? 'Client mis à jour' : 'Client créé');
      router.push('/crm/clients');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const clientType = watch('clientType');
  const status = watch('status');
  const followUpStatusVal = watch('followUpStatus');
  const agentId = watch('agentId');

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Informations personnelles */}
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
                  placeholder="Jean"
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
                  placeholder="Dupont"
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="jean.dupont@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
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
                  placeholder="+33 6 12 34 56 78"
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  {...register('whatsapp')}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cinOrPassport">
                  CNI / Passeport <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cinOrPassport"
                  {...register('cinOrPassport')}
                  placeholder="CNI ou numéro de passeport"
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
                  placeholder="Paris"
                />
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="12 rue de la Paix"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="professionalAddress">
                  Adresse professionnelle <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="professionalAddress"
                  {...register('professionalAddress')}
                  placeholder="10 avenue des Champs-Élysées, 75008 Paris"
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
                  placeholder="75001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="needDescription">Besoin exact du client</Label>
                <textarea
                  id="needDescription"
                  {...register('needDescription')}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Ex : terrain 300 m² en zone villa à la Soukra, proche de l'école"
                />
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

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Type de client */}
          <Card>
            <CardHeader>
              <CardTitle>Type de client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientType">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={clientType}
                  onValueChange={(value) =>
                    setValue('clientType', value as ClientType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
                    value={status}
                    onValueChange={(value) =>
                      setValue('status', value as 'PROSPECT' | 'CLIENT')
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
                    setValue('followUpStatus', value as 'TO_CONTACT' | 'CONTACTED' | 'NEGOTIATION' | 'WON' | 'LOST')
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
                <Label htmlFor="nextFollowUpAt">Prochaine relance</Label>
                <Input
                  id="nextFollowUpAt"
                  type="datetime-local"
                  {...register('nextFollowUpAt')}
                />
              </div>

              {canPickAgent && agents.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="agentId">Agent responsable</Label>
                  <Select
                    value={agentId || '__none__'}
                    onValueChange={(value) =>
                      setValue('agentId', value === '__none__' ? '' : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Sélectionner —</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {fullName(a.user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Chaque client est rattaché à un agent. Si vide, vous serez assigné par défaut.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="financing">Mode de paiement</Label>
                <Select
                  value={watch('financing') || '__none__'}
                  onValueChange={(v) => setValue('financing', v === '__none__' ? '' : (v as Financing))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Non précisé —</SelectItem>
                    {(Object.keys(FINANCING_LABELS) as Financing[]).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FINANCING_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {agents.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="fieldAgentId">Agent terrain</Label>
                  <Select
                    value={watch('fieldAgentId') || '__none__'}
                    onValueChange={(v) => setValue('fieldAgentId', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Aucun —</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {fullName(a.user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Agent qui fait les visites avec ce client.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (optionnel)</Label>
                <Input
                  id="budget"
                  type="number"
                  {...register('budget')}
                  placeholder="150000"
                />
                <p className="text-xs text-muted-foreground">
                  Budget maximum en dinars (DT)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informations */}
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
                    {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mis à jour le</p>
                  <p className="font-medium">
                    {new Date(client.updatedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" asChild>
          <Link href="/crm/clients">Annuler</Link>
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isEdit ? 'Enregistrer' : 'Créer le client'}
        </Button>
      </div>
    </form>
  );
}