'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';

import { settingsService, AGENCY_SETTINGS_KEY, type AgencySettings } from '@/services/settings.service';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EMPTY: AgencySettings = { name: '', address: '', mapsUrl: '', phone: '', visitFee: 20 };

/** Coordonnées de l'agence et frais de visite, repris dans le message de confirmation envoyé au client. */
export function AgencySettingsCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: AGENCY_SETTINGS_KEY, queryFn: settingsService.getAgency });
  const [form, setForm] = useState<AgencySettings>(EMPTY);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => settingsService.updateAgency({ ...form, visitFee: Number(form.visitFee) || 0 }),
    onSuccess: (saved) => {
      qc.setQueryData(AGENCY_SETTINGS_KEY, saved);
      toast.success("Coordonnées de l'agence enregistrées");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const set = (k: keyof AgencySettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const disabled = !canEdit || save.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Agence et frais de visite
        </CardTitle>
        <CardDescription>
          Repris dans le message de confirmation envoyé au client lors de la planification d&apos;une visite
          (localisation, téléphone, frais de visite).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nom de l&apos;agence</Label>
          <Input value={form.name} onChange={set('name')} disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label>Téléphone de l&apos;agence</Label>
          <Input value={form.phone} onChange={set('phone')} placeholder="71 000 000" disabled={disabled} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Adresse</Label>
          <Input
            value={form.address}
            onChange={set('address')}
            placeholder="Ex. 12 avenue Habib Bourguiba, La Soukra"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Lien Google Maps</Label>
          <Input
            value={form.mapsUrl}
            onChange={set('mapsUrl')}
            placeholder="https://maps.app.goo.gl/…"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">Google Maps → votre agence → Partager → Copier le lien.</p>
        </div>
        <div className="space-y-2">
          <Label>Frais de visite (DT)</Label>
          <Input
            type="number"
            min={0}
            value={form.visitFee}
            onChange={(e) => setForm((f) => ({ ...f, visitFee: e.target.value as unknown as number }))}
            disabled={disabled}
          />
        </div>
      </CardContent>
      {canEdit && (
        <CardContent className="border-t border-border pt-4">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
