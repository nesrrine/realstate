'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Percent, TrendingUp } from 'lucide-react';

import { commissionsService } from '@/services/commissions.service';
import { useAuth } from '@/providers/AuthProvider';
import { getErrorMessage } from '@/lib/errors';

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
import { AgencySettingsCard } from '@/components/settings/agency-settings-card';

export default function SettingsPage() {
  const { user } = useAuth();
  const canManageConfig = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const qc = useQueryClient();
  const router = useRouter();

  // Réservé au gérant / admin (menu masqué pour les agents ; protège aussi l'adresse tapée)
  useEffect(() => {
    if (user && !canManageConfig) router.replace('/crm/dashboard');
  }, [user, canManageConfig, router]);

  const [commissionRateInput, setCommissionRateInput] = useState('');
  const [fieldShareInput, setFieldShareInput] = useState('');
  const [officeShareInput, setOfficeShareInput] = useState('');

  const { data: config } = useQuery({
    queryKey: ['commissions', 'config'],
    queryFn: () => commissionsService.getConfig(),
  });

  const saveConfig = useMutation({
    mutationFn: () =>
      commissionsService.updateConfig({
        commissionRate: commissionRateInput
          ? parseFloat(commissionRateInput) / 100
          : undefined,
        fieldAgentShareRate: fieldShareInput
          ? parseFloat(fieldShareInput) / 100
          : undefined,
        officeAgentShareRate: officeShareInput
          ? parseFloat(officeShareInput) / 100
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Configuration enregistrée');
      qc.invalidateQueries({ queryKey: ['commissions', 'config'] });
      setCommissionRateInput('');
      setFieldShareInput('');
      setOfficeShareInput('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currentRate = Number(config?.commissionRate ?? 0.02);
  const currentFieldShare = Number(config?.fieldAgentShareRate ?? 0.3);
  const currentOfficeShare = Number(config?.officeAgentShareRate ?? 0.2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configuration de l'agence et des taux de commission"
      />

      <AgencySettingsCard canEdit={canManageConfig} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Taux de commission
          </CardTitle>
          <CardDescription>
            Taux appliqué au montant des transactions pour calculer les
            commissions. Exemple : 250 000 DT × {currentRate * 100}% ={' '}
            {(250000 * currentRate).toFixed(0)} DT de commission totale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Commission globale (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={String((currentRate * 100).toFixed(2))}
                value={commissionRateInput}
                onChange={(e) => setCommissionRateInput(e.target.value)}
                disabled={!canManageConfig || saveConfig.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Actuel : {(currentRate * 100).toFixed(2)} %
              </p>
            </div>
            <div className="space-y-2">
              <Label>Part agent terrain (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={String((currentFieldShare * 100).toFixed(2))}
                value={fieldShareInput}
                onChange={(e) => setFieldShareInput(e.target.value)}
                disabled={!canManageConfig || saveConfig.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Actuel : {(currentFieldShare * 100).toFixed(2)} %
              </p>
            </div>
            <div className="space-y-2">
              <Label>Part agent bureau (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={String((currentOfficeShare * 100).toFixed(2))}
                value={officeShareInput}
                onChange={(e) => setOfficeShareInput(e.target.value)}
                disabled={!canManageConfig || saveConfig.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Actuel : {(currentOfficeShare * 100).toFixed(2)} %
              </p>
            </div>
          </div>
        </CardContent>
        {canManageConfig && (
          <CardContent className="border-t border-border pt-4">
            <Button
              onClick={() => saveConfig.mutate()}
              disabled={
                saveConfig.isPending ||
                (!commissionRateInput && !fieldShareInput && !officeShareInput)
              }
            >
              Enregistrer les taux
            </Button>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aperçu du calcul
          </CardTitle>
          <CardDescription>
            Sur une transaction de 100 000 DT :
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Commission totale ({(currentRate * 100).toFixed(2)} %)
            </span>
            <span className="font-medium">
              {(100000 * currentRate).toFixed(0)} DT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Part agent terrain ({(currentFieldShare * 100).toFixed(2)} %)
            </span>
            <span className="font-medium text-blue-600">
              {(100000 * currentRate * currentFieldShare).toFixed(0)} DT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Part agent bureau ({(currentOfficeShare * 100).toFixed(2)} %)
            </span>
            <span className="font-medium text-teal-600">
              {(100000 * currentRate * currentOfficeShare).toFixed(0)} DT
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-sm text-muted-foreground">
              Part agence
            </span>
            <span className="font-bold text-green-600">
              {(
                100000 *
                currentRate *
                (1 - currentFieldShare - currentOfficeShare)
              ).toFixed(0)}{' '}
              DT
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
