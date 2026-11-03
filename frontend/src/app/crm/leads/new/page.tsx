'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, Search, X, UserPlus, Mail, Phone } from 'lucide-react';

import { leadsService, type LeadStatus, type LeadSource, type CreateLeadDto } from '@/services/leads.service';
import { clientsService, type Client } from '@/services/clients.service';
import { propertiesService, type Property } from '@/services/properties.service';
import { agentsService } from '@/services/agents.service';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';
import { useDebounce } from '@/hooks/use-debounce';

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
import { PageHeader } from '@/components/shared/page-header';
import { MultiPropertySelect } from '@/components/clients/multi-property-select';

const schema = z.object({
  clientId: z.string().min(1, 'Contact requis'),
  agentId: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'A_CONTACT', 'QUALIFIED', 'VISIT_SCHEDULED', 'NEGOTIATION', 'WON', 'LOST']),
  source: z.enum(['WEBSITE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'PHONE', 'WALK_IN', 'REFERRAL', 'OTHER']),
  budget: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS: LeadStatus[] = ['NEW', 'CONTACTED', 'A_CONTACT', 'QUALIFIED', 'VISIT_SCHEDULED', 'NEGOTIATION', 'WON', 'LOST'];
const SOURCE_OPTIONS: LeadSource[] = ['WEBSITE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'PHONE', 'WALK_IN', 'REFERRAL', 'OTHER'];

const newContactSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 caractères'),
  lastName: z.string().min(2, 'Minimum 2 caractères'),
  phone: z.string().min(8, 'Numéro invalide'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
});

type NewContactForm = z.infer<typeof newContactSchema>;

function ContactStatusBadge({ status }: { status?: 'PROSPECT' | 'CLIENT' }) {
  if (!status) return null;
  if (status === 'CLIENT') {
    return <span className="text-xs text-green-600 font-medium">Client</span>;
  }
  return <span className="text-xs text-blue-600 font-medium">Prospect</span>;
}

export default function NewLeadPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const canPickAgent = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: clientListResp } = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => clientsService.getAll({ limit: 500 }),
    enabled: !authLoading && !!user,
    staleTime: 5 * 60_000,
  });

  const { data: propertyOptionsResp } = useQuery({
    queryKey: queryKeys.properties.all,
    queryFn: () => propertiesService.getAll({ limit: 500 }),
    enabled: !authLoading && !!user,
    staleTime: 5 * 60_000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    enabled: !authLoading && canPickAgent,
    staleTime: 5 * 60_000,
  });

  const allClients = useMemo(() => clientListResp?.data ?? [], [clientListResp?.data]);
  const filteredClients = useMemo(() => {
    if (!debouncedSearch) return allClients;
    const q = debouncedSearch.toLowerCase();
    return allClients.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    );
  }, [allClients, debouncedSearch]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '',
      status: 'NEW',
      source: 'OTHER',
      notes: '',
    },
  });

  const selectedClientId = watch('clientId');
  const selectedClient = allClients.find((c) => String(c.id) === selectedClientId);

  const { register: registerNew, handleSubmit: handleNewSubmit, formState: { errors: newErrors } } = useForm<NewContactForm>({
    resolver: zodResolver(newContactSchema),
  });

  const createContactMutation = useMutation({
    mutationFn: (data: NewContactForm) => clientsService.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      setValue('clientId', String(created.id));
      setShowNewContactForm(false);
      setSearchQuery('');
      toast.success('Prospect créé et lié au lead');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createContact = handleNewSubmit(
    async (data: NewContactForm) => {
      await createContactMutation.mutateAsync(data);
    },
  );

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreateLeadDto = {
        clientId: values.clientId,
        status: values.status as LeadStatus,
        source: values.source as LeadSource,
        budget: values.budget ? Number(values.budget) : undefined,
        notes: values.notes,
        propertyIds: selectedPropertyIds.length > 0 ? selectedPropertyIds : undefined,
      };
      if (canPickAgent && values.agentId) payload.agentId = values.agentId;

      return leadsService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      toast.success('Lead créé');
      router.push('/crm/leads');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const propertyList: Property[] = propertyOptionsResp?.data ?? [];

  const handleSelectContact = (id: string) => {
    setValue('clientId', id);
    setSearchQuery('');
  };

  const handleRemoveContact = () => {
    setValue('clientId', '');
    setSearchQuery('');
  };

  return (
    <>
      <PageHeader
        title="Nouveau lead"
        description="Créer une nouvelle opportunité commerciale"
      />

      <form
        onSubmit={handleSubmit((v: FormValues) => mutation.mutate(v))}
        className="space-y-6"
        noValidate
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Contact Section */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
                <CardDescription>
                  Recherchez un contact existant ou créez un nouveau prospect.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedClient ? (
                  <div className="rounded-lg border border-border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <ContactStatusBadge status={selectedClient.status as 'PROSPECT' | 'CLIENT'} />
                        {selectedClient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedClient.phone}
                          </span>
                        )}
                        {selectedClient.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {selectedClient.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveContact}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Changer de contact"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom, téléphone ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {searchQuery && (
                      <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                        {filteredClients.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground">
                            Aucun contact trouvé.
                          </p>
                        ) : (
                          filteredClients.map((c: Client) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectContact(String(c.id))}
                              className="w-full text-left p-3 hover:bg-slate-50 border-b last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {c.firstName} {c.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {c.phone}
                                  </p>
                                </div>
                                <ContactStatusBadge status={c.status as 'PROSPECT' | 'CLIENT'} />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewContactForm(!showNewContactForm)}
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {showNewContactForm ? 'Annuler' : 'Créer un nouveau prospect'}
                    </Button>

                    {showNewContactForm && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                        }}
                        className="border border-border rounded-lg p-4 space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Input
                              placeholder="Prénom"
                              {...registerNew('firstName')}
                              aria-invalid={!!newErrors.firstName}
                            />
                            {newErrors.firstName && <p className="text-xs text-destructive">{newErrors.firstName.message}</p>}
                          </div>
                          <div>
                            <Input
                              placeholder="Nom"
                              {...registerNew('lastName')}
                              aria-invalid={!!newErrors.lastName}
                            />
                            {newErrors.lastName && <p className="text-xs text-destructive">{newErrors.lastName.message}</p>}
                          </div>
                        </div>
                        <div>
                          <Input
                            placeholder="Téléphone *"
                            {...registerNew('phone')}
                            aria-invalid={!!newErrors.phone}
                          />
                          {newErrors.phone && <p className="text-xs text-destructive">{newErrors.phone.message}</p>}
                        </div>
                        <div>
                          <Input
                            placeholder="Email (facultatif)"
                            {...registerNew('email')}
                            aria-invalid={!!newErrors.email}
                          />
                          {newErrors.email && <p className="text-xs text-destructive">{newErrors.email.message}</p>}
                        </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={createContactMutation.isPending}
                        onClick={() => createContact()}
                      >
                          {createContactMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...
                            </>
                          ) : (
                            'Créer le prospect'
                          )}
                        </Button>
                      </form>
                    )}

                    {errors.clientId && (
                      <p className="text-sm text-destructive">{errors.clientId.message}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Property Section (optional) */}
            <Card>
              <CardHeader>
                <CardTitle>Bien(x) immobilier(s) (facultatif)</CardTitle>
                <CardDescription>
                  Associez ce lead à un ou plusieurs biens ou laissez vide pour plus tard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultiPropertySelect
                  options={propertyList.map((p: Property) => ({
                    id: String(p.id),
                    title: p.title,
                    city: p.city,
                    price: p.price,
                    status: p.status,
                  }))}
                  selected={selectedPropertyIds}
                  onChange={setSelectedPropertyIds}
                  placeholder="Sélectionner un ou plusieurs biens"
                  searchPlaceholder="Rechercher un bien..."
                />
              </CardContent>
            </Card>

            {/* Lead Details */}
            <Card>
              <CardHeader>
                <CardTitle>Détails du lead</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={watch('status') || 'NEW'}
                    onValueChange={(val) => setValue('status', val as LeadStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{leadsService.statusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={watch('source') || 'OTHER'}
                    onValueChange={(val) => setValue('source', val as LeadSource)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{leadsService.sourceLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="budget">Budget (DT)</Label>
                  <Input
                    id="budget"
                    type="number"
                    {...register('budget')}
                    placeholder="300000"
                  />
                  {errors.budget && <p className="text-sm text-destructive">{errors.budget.message}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes internes</Label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="Préférences du client, remarques, historique..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {canPickAgent && agents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent responsable</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="agentId">Agent</Label>
                    <Select
                      value={watch('agentId') || ''}
                      onValueChange={(val) => setValue('agentId', val || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Laisser à l'agent courant" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((a: { id: string; user: { firstName: string; lastName: string } }) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.user.firstName} {a.user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending || !selectedClientId}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Créer le lead
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </>
  );
}
