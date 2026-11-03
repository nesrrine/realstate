'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ownersService, type Owner } from '@/services/owners.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(100),
  lastName: z.string().trim().min(1, 'Nom requis').max(100),
  phone: z.string().trim().min(1, 'Téléphone requis'),
  whatsapp: z.string().optional(),
  email: z.union([z.literal(''), z.string().trim().email('Email invalide')]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface OwnerFormProps {
  owner?: Owner;
}

export function OwnerForm({ owner }: OwnerFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = !!owner;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: owner?.firstName ?? '',
      lastName: owner?.lastName ?? '',
      phone: owner?.phone ?? '',
      whatsapp: owner?.whatsapp ?? '',
      email: owner?.email ?? '',
      address: owner?.address ?? '',
      city: owner?.city ?? '',
      zipCode: owner?.zipCode ?? '',
      notes: owner?.notes ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const text = (x?: string) => (x?.trim() ? x.trim() : undefined);
      const payload = {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        phone: v.phone.trim(),
        whatsapp: text(v.whatsapp),
        email: text(v.email),
        address: text(v.address),
        city: text(v.city),
        zipCode: text(v.zipCode),
        notes: text(v.notes),
      };
      if (!isEdit) return ownersService.create({ ...payload, country: 'TN' });
      // En modification, un champ vidé doit être effacé (null), pas ignoré
      const cleared = Object.fromEntries(
        Object.entries(payload).map(([k, val]) => [k, val ?? null]),
      );
      return ownersService.update(owner.id, cleared);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: queryKeys.owners.all });
      toast.success(isEdit ? 'Propriétaire mis à jour' : 'Propriétaire créé');
      router.push(`/crm/owners/${saved.id}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const field = (
    name: keyof FormValues,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
    required = false,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input id={name} {...props} {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identité et contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field('firstName', 'Prénom', {}, true)}
          {field('lastName', 'Nom', {}, true)}
          {field('phone', 'Téléphone', { type: 'tel', placeholder: '+216 ...' }, true)}
          {field('whatsapp', 'WhatsApp', { type: 'tel' })}
          {field('email', 'Email', { type: 'email' })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">{field('address', 'Adresse')}</div>
          {field('city', 'Ville')}
          {field('zipCode', 'Code postal')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Disponibilités, préférences de contact, conditions du mandat..."
            {...register('notes')}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Enregistrer' : 'Créer le propriétaire'}
        </Button>
      </div>
    </form>
  );
}
