'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ClipboardCopy, FileText, Loader2, MessageCircle, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  aiService,
  AI_LANGUAGE_LABELS,
  whatsappLink,
  type AiLanguage,
  type VisitReport,
} from '@/services/ai.service';
import { visitsService } from '@/services/visits.service';
import { settingsService, AGENCY_SETTINGS_KEY } from '@/services/settings.service';
import { clientsService, type FollowUpStatus } from '@/services/clients.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';
import { VoiceInputButton } from './voice-input-button';

const textareaClass =
  'min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

const FOLLOW_UP_LABELS: Record<FollowUpStatus, string> = {
  TO_CONTACT: 'À contacter',
  CONTACTED: 'Contacté',
  NEGOTIATION: 'Négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
};
const INTEREST_LABELS: Record<VisitReport['interest'], string> = {
  HIGH: 'Très intéressé',
  MEDIUM: 'Intéressé',
  LOW: 'Peu intéressé',
  NONE: 'Pas intéressé',
};

/** Message WhatsApp de confirmation (date, bien, frais de visite, localisation de l'agence). */
export function AiVisitMessageButton({ visitId, autoOpen = false }: { visitId: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<AiLanguage>('fr');
  const [message, setMessage] = useState('');
  const [number, setNumber] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: () => aiService.visitMessage(visitId, language),
    onSuccess: (r) => {
      setMessage(r.message);
      setNumber(r.whatsappNumber);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Ouverture automatique juste après la planification de la visite
  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      m.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const { data: agency } = useQuery({
    queryKey: AGENCY_SETTINGS_KEY,
    queryFn: settingsService.getAgency,
    enabled: open,
  });
  const missingLocation = !!agency && !agency.address && !agency.mapsUrl;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Message copié');
    } catch {
      toast.error('Copie impossible : sélectionnez le texte manuellement');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
          if (!message) m.mutate();
        }}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Message de confirmation
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Confirmation de visite
            </DialogTitle>
            <DialogDescription>
              Message prêt à envoyer : date, bien, frais de visite et adresse de l&apos;agence. Modifiable avant envoi.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Langue</Label>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value as AiLanguage)}
            >
              {(Object.keys(AI_LANGUAGE_LABELS) as AiLanguage[]).map((l) => (
                <option key={l} value={l}>
                  {AI_LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              Régénérer
            </Button>
          </div>
          {missingLocation && (
            <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                L&apos;adresse de l&apos;agence n&apos;est pas renseignée : le message ne contient pas la localisation.{' '}
                <Link href="/crm/settings" className="font-medium underline">
                  La renseigner dans Paramètres
                </Link>
              </span>
            </p>
          )}
          {m.isPending && !message ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Rédaction du message…
            </p>
          ) : (
            <textarea className={textareaClass} value={message} onChange={(e) => setMessage(e.target.value)} />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={copy} disabled={!message}>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copier
            </Button>
            <Button asChild disabled={!message}>
              <a href={whatsappLink(number, message)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Ouvrir WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Compte rendu de visite : notes brèves (ou dictées) → compte rendu + suivi du client. */
export function AiVisitReportButton({ visitId, clientName }: { visitId: string; clientName: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<VisitReport | null>(null);
  const [report, setReport] = useState('');

  const generate = useMutation({
    mutationFn: () => aiService.visitReport(visitId, notes),
    onSuccess: (r) => {
      setResult(r);
      setReport(r.report);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!result) return;
      const body = `${report}\n\nProchaine étape : ${result.nextStep}`;
      await visitsService.update(visitId, { feedback: body });
      // Historique du client + statut de suivi et date de relance en un appel
      await clientsService.createInteraction(result.clientId, {
        type: 'VISIT',
        title: `Compte rendu de visite – ${INTEREST_LABELS[result.interest]}`,
        body,
        followUpStatus: result.followUpStatus,
        ...(result.nextFollowUpAt && { nextFollowUpAt: result.nextFollowUpAt }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit', visitId] });
      qc.invalidateQueries({ queryKey: queryKeys.visits.all });
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Compte rendu enregistré sur la visite et la fiche client');
      setOpen(false);
      setNotes('');
      setResult(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="mr-2 h-4 w-4" />
        Compte rendu IA
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Compte rendu de visite
            </DialogTitle>
            <DialogDescription>
              Notez ou dictez quelques mots sur la visite de {clientName} : l&apos;IA rédige le compte rendu et
              propose le suivi.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-3">
              <textarea
                className={textareaClass}
                placeholder="Ex : a aimé la cuisine et la vue, trouve le prix trop élevé, veut revenir samedi avec sa femme"
                value={notes}
                maxLength={3000}
                onChange={(e) => setNotes(e.target.value)}
              />
              <VoiceInputButton onText={(t) => setNotes((p) => (p ? `${p} ${t}` : t))} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{INTEREST_LABELS[result.interest]}</Badge>
                <Badge variant="outline">Suivi : {FOLLOW_UP_LABELS[result.followUpStatus]}</Badge>
                {result.nextFollowUpAt && (
                  <Badge variant="outline">
                    Relance le {new Date(result.nextFollowUpAt).toLocaleDateString('fr-FR')}
                  </Badge>
                )}
              </div>
              <textarea className={textareaClass} value={report} onChange={(e) => setReport(e.target.value)} />
              <p className="text-sm">
                <span className="font-medium">Prochaine étape :</span> {result.nextStep}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {!result ? (
              <Button onClick={() => generate.mutate()} disabled={!notes.trim() || generate.isPending}>
                {generate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Rédiger le compte rendu
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setResult(null)} disabled={save.isPending}>
                  Modifier les notes
                </Button>
                <Button onClick={() => save.mutate()} disabled={!report.trim() || save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
