'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

import { agentsService } from '@/services/agents.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PORTFOLIO_LABELS: Record<string, string> = {
  clients: 'clients',
  properties: 'biens',
  leads: 'leads',
  visits: 'visites',
  transactions: 'transactions',
  cashEntries: 'saisies de caisse',
};

/**
 * Suppression complète d'un agent par le gérant : son portefeuille est d'abord
 * transféré à un autre agent (rien n'est perdu), puis son compte est supprimé.
 */
export function DeleteAgentButton({
  agentId,
  agentName,
  myAgentId,
}: {
  agentId: string;
  agentName: string;
  myAgentId?: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [heirId, setHeirId] = useState(myAgentId ?? '');
  const [confirmText, setConfirmText] = useState('');

  const { data: portfolio } = useQuery({
    queryKey: ['agents', 'portfolio', agentId],
    queryFn: () => agentsService.portfolio(agentId),
    enabled: open,
  });
  const { data: options = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: () => agentsService.getOptions(),
    enabled: open,
  });
  const heirs = options.filter((a) => a.id !== agentId);

  const remove = useMutation({
    mutationFn: () => agentsService.delete(agentId, heirId || undefined),
    onSuccess: (r) => {
      toast.success(`${r.message} — portefeuille transféré à ${r.transferredTo.name}`);
      qc.invalidateQueries({ queryKey: queryKeys.agents.all });
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      router.push('/crm/agents');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items = portfolio ? Object.entries(portfolio).filter(([, n]) => n > 0) : [];
  const canConfirm = confirmText.trim().toUpperCase() === 'SUPPRIMER' && !!heirId;

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Supprimer le compte
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirmText('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le compte de {agentName}</DialogTitle>
            <DialogDescription>
              Le compte et l&apos;accès de l&apos;agent seront supprimés définitivement. Son travail n&apos;est pas
              perdu : tout est transféré à l&apos;agent choisi ci-dessous.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              {!portfolio ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calcul du portefeuille…
                </span>
              ) : items.length === 0 ? (
                <span className="text-muted-foreground">Aucun dossier à transférer.</span>
              ) : (
                <>
                  <p className="mb-1 font-medium">À transférer :</p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {items.map(([k, n]) => (
                      <li key={k}>
                        {n} {PORTFOLIO_LABELS[k] ?? k}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Transférer à</Label>
              <Select value={heirId} onValueChange={setHeirId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un agent" />
                </SelectTrigger>
                <SelectContent>
                  {heirs.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.user.firstName} {a.user.lastName}
                      {a.id === myAgentId ? ' (moi)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Tapez <span className="font-mono font-semibold">SUPPRIMER</span> pour confirmer
              </Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => remove.mutate()} disabled={!canConfirm || remove.isPending}>
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
