
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
  const canManageConfig =
    user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (user && !canManageConfig) {
      router.replace('/crm/dashboard');
    }
  }, [user, canManageConfig, router]);

  const [buyerRateInput, setBuyerRateInput] = useState('');
  const [sellerRateInput, setSellerRateInput] = useState('');
  const [fieldShareInput, setFieldShareInput] = useState('');
  const [officeShareInput, setOfficeShareInput] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['commissions', 'config'],
    queryFn: () => commissionsService.getConfig(),
  });

  const saveConfig = useMutation({
    mutationFn: () =>
      commissionsService.updateConfig({
        buyerCommissionRate:
          buyerRateInput.trim() !== ''
            ? Number(buyerRateInput) / 100
            : undefined,

        sellerCommissionRate:
          sellerRateInput.trim() !== ''
            ? Number(sellerRateInput) / 100
            : undefined,

        fieldAgentShareRate:
          fieldShareInput.trim() !== ''
            ? Number(fieldShareInput) / 100
            : undefined,

        officeAgentShareRate:
          officeShareInput.trim() !== ''
            ? Number(officeShareInput) / 100
            : undefined,
      }),

    onSuccess: () => {
      toast.success('Configuration enregistrée');

      setBuyerRateInput('');
      setSellerRateInput('');
      setFieldShareInput('');
      setOfficeShareInput('');

      qc.invalidateQueries({ queryKey: ['commissions', 'config'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
    },

    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currentBuyerRate = Number(config?.buyerCommissionRate ?? 0.02);
  const currentSellerRate = Number(config?.sellerCommissionRate ?? 0);
  const currentFieldShare = Number(config?.fieldAgentShareRate ?? 0.3);
  const currentOfficeShare = Number(config?.officeAgentShareRate ?? 0.2);

  const validInputs = [
    buyerRateInput,
    sellerRateInput,
    fieldShareInput,
    officeShareInput,
  ].every((value) => {
    if (value.trim() === '') return true;

    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100;
  });

  const hasChanges =
    buyerRateInput !== '' ||
    sellerRateInput !== '' ||
    fieldShareInput !== '' ||
    officeShareInput !== '';

  const exampleAmount = 100000;
  const buyerAmount = exampleAmount * currentBuyerRate;
  const sellerAmount = exampleAmount * currentSellerRate;
  const totalCommission = buyerAmount + sellerAmount;

  const fieldAmount = totalCommission * currentFieldShare;
  const officeAmount = totalCommission * currentOfficeShare;
  const agencyAmount = totalCommission - fieldAmount - officeAmount;

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
            Configuration des commissions
          </CardTitle>

          <CardDescription>
            Les commissions acheteur et vendeur sont calculées séparément
            sur le montant de la transaction. Les parts des agents sont
            ensuite réparties sur la commission totale.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Chargement de la configuration...
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Commission acheteur (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder={(currentBuyerRate * 100).toFixed(2)}
                    value={buyerRateInput}
                    onChange={(e) => setBuyerRateInput(e.target.value)}
                    disabled={!canManageConfig || saveConfig.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Actuel : {(currentBuyerRate * 100).toFixed(2)} %
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Commission vendeur (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder={(currentSellerRate * 100).toFixed(2)}
                    value={sellerRateInput}
                    onChange={(e) => setSellerRateInput(e.target.value)}
                    disabled={!canManageConfig || saveConfig.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Actuel : {(currentSellerRate * 100).toFixed(2)} %
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Part agent terrain (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder={(currentFieldShare * 100).toFixed(2)}
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
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder={(currentOfficeShare * 100).toFixed(2)}
                    value={officeShareInput}
                    onChange={(e) => setOfficeShareInput(e.target.value)}
                    disabled={!canManageConfig || saveConfig.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Actuel : {(currentOfficeShare * 100).toFixed(2)} %
                  </p>
                </div>
              </div>

              {!validInputs && (
                <p className="text-sm text-destructive">
                  Tous les taux doivent être compris entre 0 et 100 %.
                </p>
              )}

              {currentFieldShare + currentOfficeShare > 1 && (
                <p className="text-sm text-destructive">
                  La somme des parts des agents ne peut pas dépasser 100 %.
                </p>
              )}

              {canManageConfig && (
                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    onClick={() => saveConfig.mutate()}
                    disabled={
                      saveConfig.isPending ||
                      !hasChanges ||
                      !validInputs ||
                      currentFieldShare + currentOfficeShare > 1
                    }
                  >
                    {saveConfig.isPending
                      ? 'Enregistrement...'
                      : 'Enregistrer les taux'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aperçu du calcul
          </CardTitle>

          <CardDescription>
            Exemple pour une transaction de 100 000 DT.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Commission acheteur ({(currentBuyerRate * 100).toFixed(2)} %)
            </span>
            <span className="font-medium">
              {buyerAmount.toFixed(2)} DT
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Commission vendeur ({(currentSellerRate * 100).toFixed(2)} %)
            </span>
            <span className="font-medium">
              {sellerAmount.toFixed(2)} DT
            </span>
          </div>

          <div className="flex justify-between border-t border-border pt-3">
            <span className="font-semibold">
              Commission totale
            </span>
            <span className="font-bold">
              {totalCommission.toFixed(2)} DT
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Agent terrain ({(currentFieldShare * 100).toFixed(2)} %)
            </span>
            <span className="font-medium text-blue-600">
              {fieldAmount.toFixed(2)} DT
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Agent bureau ({(currentOfficeShare * 100).toFixed(2)} %)
            </span>
            <span className="font-medium text-teal-600">
              {officeAmount.toFixed(2)} DT
            </span>
          </div>

          <div className="flex justify-between border-t border-border pt-3">
            <span className="font-semibold">
              Part agence
            </span>
            <span className="font-bold text-green-600">
              {agencyAmount.toFixed(2)} DT
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
