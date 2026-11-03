'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { aiService } from '@/services/ai.service';
import { formatPrice } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const CONFIDENCE = {
  HIGH: { label: 'Confiance élevée', className: 'bg-green-100 text-green-700' },
  MEDIUM: { label: 'Confiance moyenne', className: 'bg-amber-100 text-amber-700' },
  LOW: { label: 'Confiance faible', className: 'bg-slate-100 text-slate-700' },
} as const;

/** Estimation de prix à partir des biens comparables de l'agence. */
export function AiPriceEstimateCard({ propertyId, isRental }: { propertyId: string; isRental: boolean }) {
  const m = useMutation({
    mutationFn: () => aiService.priceEstimate(propertyId),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const e = m.data;
  const suffix = isRental ? '/mois' : '';
  // Écart du prix affiché par rapport au prix conseillé
  const gap = e && e.recommended > 0 ? Math.round(((e.currentPrice - e.recommended) / e.recommended) * 100) : 0;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Estimation de prix (IA)
        </CardTitle>
        <CardDescription>À partir des biens comparables de l&apos;agence.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!e ? (
          <Button size="sm" variant="outline" className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Estimer le prix
          </Button>
        ) : (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Fourchette estimée</p>
              <p className="text-lg font-semibold">
                {formatPrice(e.low)} – {formatPrice(e.high)}
                <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
              </p>
              <p className="text-sm">
                Prix conseillé : <span className="font-semibold">{formatPrice(e.recommended)}{suffix}</span>
              </p>
            </div>
            {gap !== 0 && (
              <p className={`flex items-center gap-1 text-sm ${Math.abs(gap) > 10 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                {gap > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                Prix affiché {gap > 0 ? `${gap} % au-dessus` : `${-gap} % en dessous`} du prix conseillé
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge className={`border-0 ${CONFIDENCE[e.confidence].className}`}>{CONFIDENCE[e.confidence].label}</Badge>
              <Badge variant="outline">{e.comparablesCount} comparable(s)</Badge>
              {e.medianPricePerSqm && <Badge variant="outline">Médiane {formatPrice(e.medianPricePerSqm)}/m²</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{e.explanation}</p>
            <Button size="sm" variant="ghost" className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Relancer l&apos;estimation
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
