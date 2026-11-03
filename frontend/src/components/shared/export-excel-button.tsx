'use client';

import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { downloadBlob } from '@/utils/download';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';

export type ExportType = 'visites' | 'clients' | 'biens' | 'frais' | 'transactions';

interface Props {
  type: ExportType;
  /** Période (AAAA-MM-JJ) : visites, frais, transactions */
  from?: string;
  to?: string;
  label?: string;
  size?: 'sm' | 'default';
}

/** Télécharge un fichier Excel généré par l'API (mêmes droits que l'écran). */
export function ExportExcelButton({ type, from, to, label = 'Exporter Excel', size = 'default' }: Props) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/exports/${type}`, {
        params: { from, to },
        responseType: 'blob',
      });
      const disposition = String(res.headers['content-disposition'] ?? '');
      const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? `${type}.xlsx`;
      downloadBlob(res.data as Blob, filename);
    } catch (e) {
      // Erreur renvoyée en JSON dans un Blob : on relit le message
      let message = getErrorMessage(e);
      const data = (e as { response?: { data?: unknown } }).response?.data;
      if (data instanceof Blob) {
        try {
          message = JSON.parse(await data.text()).message ?? message;
        } catch {
          // message générique conservé
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={download} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />}
      {label}
    </Button>
  );
}

/** Date ISO (ou Date) → AAAA-MM-JJ à l'heure locale, pour les paramètres d'export. */
export const toDay = (d?: string | Date | null) => {
  if (!d) return undefined;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
