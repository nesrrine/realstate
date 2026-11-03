'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { aiService, type PropertyDraft } from '@/services/ai.service';
import { getErrorMessage } from '@/lib/errors';
import { VoiceInputButton } from './voice-input-button';

interface Props {
  onApply: (draft: PropertyDraft) => void;
}

/** Remplit le formulaire de bien à partir d'un message WhatsApp collé ou d'une note dictée. */
export function AiPropertyFiller({ onApply }: Props) {
  const [text, setText] = useState('');
  const [missing, setMissing] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () => aiService.propertyFromText(text),
    onSuccess: (draft) => {
      onApply(draft);
      setMissing(draft.missing ?? []);
      toast.success('Formulaire pré-rempli : vérifiez les champs avant d’enregistrer');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Remplir avec l&apos;IA
        </CardTitle>
        <CardDescription>
          Collez un message WhatsApp ou dictez la description du bien : l&apos;IA remplit le formulaire.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Ex : Appart S+3 Aouina 140 m², 3e étage avec ascenseur, parking, titre bleu, 320 mille. Propriétaire Ahmed 98 123 456"
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <VoiceInputButton onText={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))} />
          <Button type="button" onClick={() => mutation.mutate()} disabled={!text.trim() || mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Analyser et remplir
          </Button>
        </div>
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Informations manquantes :</span> {missing.join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
