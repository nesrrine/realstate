
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, Lock, Calendar, Shield } from 'lucide-react';

import { authService } from '@/services/auth.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';
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
import { PageHeader } from '@/components/shared/page-header';

const profileSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 caractères'),
  lastName: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  phone: z
    .string()
    .refine(
      (value) => value === '' || value.length >= 8,
      'Numéro de téléphone invalide',
    )
    .optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z
      .string()
      .min(10, 'Minimum 10 caractères')
      .regex(
        /^(?=.*\p{L})(?=.*\d)/u,
        'Lettres et chiffres obligatoires',
      ),
    confirmPassword: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const qc = useQueryClient();

  const {
    user: authUser,
    isLoading: authLoading,
    logout,
  } = useAuth();

  const [activeSection, setActiveSection] = useState<
    'profile' | 'password'
  >('profile');

  const {
    data: profile,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: authService.getProfile,
    enabled: !authLoading && !!authUser,
    staleTime: 30_000,
  });

  // Un agent ne peut pas changer son propre mot de passe.
  const canChangePassword = profile?.role !== 'AGENT';

  const {
    register,
    handleSubmit,
    reset: resetProfile,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  // Actualiser les champs lorsque le profil arrive depuis l'API.
  useEffect(() => {
    if (!profile) return;

    resetProfile({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
    });

    if (profile.role === 'AGENT') {
      setActiveSection('profile');
      resetPassword();
    }
  }, [profile, resetProfile, resetPassword]);

  const updateMutation = useMutation({
    mutationFn: authService.updateProfile,

    onSuccess: () => {
      toast.success('Profil mis à jour');

      qc.invalidateQueries({
        queryKey: queryKeys.auth.user,
      });
    },

    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: authService.changePassword,

    onSuccess: () => {
      toast.success(
        'Mot de passe modifié : reconnectez-vous',
      );

      resetPassword();
      logout();
    },

    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const onSubmitProfile = (data: ProfileFormValues) => {
    updateMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordFormValues) => {
    // Protection supplémentaire côté interface.
    if (!canChangePassword) {
      toast.error(
        'Vous ne pouvez pas modifier votre mot de passe. Contactez votre manager.',
      );
      setActiveSection('profile');
      return;
    }

    const { currentPassword, newPassword } = data;

    passwordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="py-12 text-center">
        Chargement…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        Profil introuvable
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrateur',
    MANAGER: 'Manager',
    AGENT: 'Agent',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et votre compte"
      />

      {/* Navigation */}
      <div className="flex gap-3 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveSection('profile')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Informations personnelles
        </button>

        {canChangePassword && (
          <button
            type="button"
            onClick={() => setActiveSection('password')}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === 'password'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mot de passe
          </button>
        )}
      </div>

      {/* Informations personnelles */}
      {activeSection === 'profile' || !canChangePassword ? (
        <form
          onSubmit={handleSubmit(onSubmitProfile)}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Coordonnées et informations de contact
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
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
                    Email <span className="text-destructive">*</span>
                  </Label>

                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="jean.dupont@example.com"
                  />

                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Téléphone
                  </Label>

                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="+216 20 000 000"
                  />

                  {errors.phone && (
                    <p className="text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails du compte</CardTitle>
              <CardDescription>
                Informations sur votre compte (non modifiables)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">Rôle</p>
                  <p className="text-sm text-muted-foreground">
                    {roleLabel[profile.role] ?? profile.role}
                  </p>
                </div>
              </div>

              {profile.agent?.licenseNumber && (
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="text-sm font-medium">
                      Numéro de licence
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.agent.licenseNumber}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">
                    Compte créé le
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('fr-FR')
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">
                    Dernière modification
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile.updatedAt
                      ? new Date(profile.updatedAt).toLocaleDateString('fr-FR')
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {profile.role === 'AGENT' && (
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <Lock className="mt-1 h-5 w-5 text-muted-foreground" />

                <div>
                  <p className="font-medium">
                    Mot de passe géré par votre manager
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pour modifier ou réinitialiser votre mot de passe,
                    veuillez contacter votre manager.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              Enregistrer
            </Button>
          </div>
        </form>
      ) : (
        /* Modification du mot de passe pour ADMIN / MANAGER */
        <form
          onSubmit={handleSubmitPassword(onSubmitPassword)}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Mot de passe</CardTitle>
              <CardDescription>
                Changez votre mot de passe personnel
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  Mot de passe actuel
                  <span className="text-destructive"> *</span>
                </Label>

                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...registerPassword('currentPassword')}
                  placeholder="••••••••"
                />

                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  Nouveau mot de passe
                  <span className="text-destructive"> *</span>
                </Label>

                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...registerPassword('newPassword')}
                  placeholder="••••••••"
                />

                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirmer le mot de passe
                  <span className="text-destructive"> *</span>
                </Label>

                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...registerPassword('confirmPassword')}
                  placeholder="••••••••"
                />

                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={passwordMutation.isPending}
            >
              {passwordMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}

              Changer le mot de passe
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
