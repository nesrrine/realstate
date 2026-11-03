'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Loader2, MapPin, Save } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

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
  agentsService,
  AGENT_TYPE_LABELS,
  type AgentDetail,
  type CreateAgentDto,
  type AgentType,
} from '@/services/agents.service';
import { getErrorMessage } from '@/lib/errors';
import { fullName } from '@/lib/property-constants';

const AGENT_TYPE_OPTIONS: { value: AgentType; label: string; description: string; icon: typeof MapPin }[] = [
  {
    value: 'FIELD',
    label: AGENT_TYPE_LABELS.FIELD,
    description: 'Accompagne les clients sur place pendant les visites.',
    icon: MapPin,
  },
  {
    value: 'OFFICE',
    label: AGENT_TYPE_LABELS.OFFICE,
    description: "Reçoit les clients à l'agence et planifie les visites.",
    icon: Building2,
  },
];

const createSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 caractères'),
  lastName: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(10, 'Minimum 10 caractères').regex(/^(?=.*\p{L})(?=.*\d)/u, 'Lettres et chiffres obligatoires'),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  bio: z.string().optional(),
  role: z.enum(['AGENT', 'ADMIN']).optional().default('AGENT'),
  agentType: z.enum(['FIELD', 'OFFICE']).optional().default('FIELD'),
});

const editSchema = createSchema.omit({ email: true, password: true, role: true }).extend({
  isActive: z.boolean().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type FormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  password?: string;
  phone?: string;
  licenseNumber?: string;
  bio?: string;
  isActive?: boolean;
  role?: 'AGENT' | 'ADMIN';
  agentType?: 'FIELD' | 'OFFICE';
};

const createResolver = zodResolver(createSchema as never) as unknown as Resolver<FormValues>;
const editResolver = zodResolver(editSchema as never) as unknown as Resolver<FormValues>;

interface Props {
  mode: 'create' | 'edit';
  agent?: AgentDetail;
};

export function AgentForm({ mode, agent }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = mode === 'edit';
  const { user } = useAuth();

  const canChooseRole = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: isEdit ? editResolver : createResolver,
    defaultValues: isEdit
      ? {
          firstName: agent?.user.firstName ?? '',
          lastName: agent?.user.lastName ?? '',
          phone: agent?.user.phone ?? '',
          licenseNumber: agent?.licenseNumber ?? '',
          bio: agent?.bio ?? '',
          isActive: agent?.user.isActive ?? true,
          agentType: agent?.agentType ?? 'FIELD',
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          licenseNumber: '',
          bio: '',
          isActive: false,
          role: 'AGENT',
          agentType: 'FIELD',
        },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && agent) {
        return agentsService.update(agent.id, values as EditFormValues);
      }
      return agentsService.create(values as CreateAgentDto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast.success(isEdit ? 'Agent mis à jour' : 'Agent créé');
      router.push('/crm/agents');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
              <CardDescription>Compte utilisateur et coordonnées</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Prénom <span className="text-destructive">*</span>
                </Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
              {!isEdit && (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="password">
                      Mot de passe <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      {...register('password')}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">N° carte professionnelle</Label>
                <Input id="licenseNumber" {...register('licenseNumber')} />
              </div>
              {canChooseRole && !isEdit && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="role">Rôle</Label>
                  <select
                    id="role"
                    {...register('role')}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                  {errors.role && (
                    <p className="text-xs text-destructive">{errors.role.message}</p>
                  )}
                </div>
              )}
              {/* Type d'agent : modifiable à l'ajout comme à la modification */}
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium">
                  Type d&apos;agent <span className="text-destructive">*</span>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AGENT_TYPE_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-1 has-[:checked]:ring-primary"
                    >
                      <input type="radio" value={value} {...register('agentType')} className="mt-1 accent-primary" />
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.agentType && (
                  <p className="text-xs text-destructive">{errors.agentType.message}</p>
                )}
              </fieldset>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Présentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  {...register('bio')}
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {isEdit && agent && (
            <Card>
              <CardHeader>
                <CardTitle>Compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{agent.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nom affiché</p>
                  <p className="font-medium">{fullName(agent.user)}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register('isActive')} className="rounded border" />
                  Compte actif
                </label>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" asChild>
          <Link href="/crm/agents">Annuler</Link>
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isEdit ? 'Enregistrer' : "Créer l'agent"}
        </Button>
      </div>
    </form>
  );
}