'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';

import {
  cashService,
  DEFAULT_VISIT_FEE,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  type CashEntry,
  type CashEntryType,
  type CashVisitOption,
  type ExpenseCategory,
  type PaymentMethod,
} from '@/services/cash.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { ExportExcelButton } from '@/components/shared/export-excel-button';

/** « 2026-11-03 » → « 2026-11-30 » */
const lastDayOfMonth = (day: string) => {
  const [y, m] = day.split('-').map(Number);
  return `${day.slice(0, 7)}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

const NONE = '__none__';

/** Jour local au format YYYY-MM-DD (pas UTC, sinon décalage après minuit). */
function toDay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const shiftDay = (day: string, delta: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toDay(d);
};
const formatDayLong = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${day}T12:00:00`));
const formatDayShort = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${day}T12:00:00`));

export default function CashPage() {
  const { user, isManager, isAdmin, isLoading: authLoading } = useAuth();
  const canManageAll = isManager || isAdmin;
  const today = toDay(new Date());
  const [day, setDay] = useState(today);
  const [dialogType, setDialogType] = useState<CashEntryType | null>(null);

  const { data: allowed, isLoading: accessLoading } = useQuery({
    queryKey: queryKeys.cash.access,
    queryFn: cashService.getAccess,
    enabled: !!user,
  });

  const { data: dayData, isLoading: dayLoading } = useQuery({
    queryKey: queryKeys.cash.day(day),
    queryFn: () => cashService.getDay(day),
    enabled: !!allowed,
  });

  const from = shiftDay(today, -29);
  const { data: summary } = useQuery({
    queryKey: queryKeys.cash.summary(from, today),
    queryFn: () => cashService.getSummary(from, today),
    enabled: !!allowed,
  });

  const qc = useQueryClient();
  const removeMutation = useMutation({
    mutationFn: (id: string) => cashService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cash.all });
      toast.success('Ligne supprimée');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (authLoading || accessLoading) {
    return <div className="py-12 text-center">Chargement...</div>;
  }

  if (!allowed) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-12 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Accès non autorisé</h2>
          <p className="text-muted-foreground">
            Les frais de visite et les dépenses sont réservés au gérant et aux agents qu&apos;il
            autorise. Demandez l&apos;accès à votre gérant.
          </p>
        </CardContent>
      </Card>
    );
  }

  const entries = dayData?.entries ?? [];
  const fees = entries.filter((e) => e.type === 'VISIT_FEE');
  const expenses = entries.filter((e) => e.type === 'EXPENSE');
  const totals = dayData?.totals ?? { visitFees: 0, expenses: 0, balance: 0 };
  const canDelete = (e: CashEntry) => canManageAll || e.createdBy.id === user?.id;

  const confirmRemove = (e: CashEntry) => {
    if (window.confirm(`Supprimer « ${e.label} » ?`)) removeMutation.mutate(e.id);
  };

  return (
    <div className="space-y-6">
      {/* En-tête + navigation par jour */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Frais &amp; dépenses</h1>
          <p className="capitalize text-muted-foreground">{formatDayLong(day)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDay(shiftDay(day, -1))} aria-label="Jour précédent">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            className="w-[160px]"
            value={day}
            max={today}
            onChange={(e) => e.target.value && setDay(e.target.value)}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDay(shiftDay(day, 1))}
            disabled={day >= today}
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* Export du mois du jour affiché (comptabilité) */}
          <ExportExcelButton
            type="frais"
            label="Exporter le mois"
            from={`${day.slice(0, 7)}-01`}
            to={lastDayOfMonth(day)}
          />
          {day !== today && (
            <Button variant="ghost" onClick={() => setDay(today)}>
              Aujourd&apos;hui
            </Button>
          )}
        </div>
      </div>

      {/* Totaux du jour */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label="Frais de visite" value={totals.visitFees} icon={ArrowDownCircle} tone="green" />
        <TotalCard label="Dépenses" value={totals.expenses} icon={ArrowUpCircle} tone="red" />
        <TotalCard label="Solde du jour" value={totals.balance} icon={Wallet} tone={totals.balance < 0 ? 'red' : 'default'} />
      </div>

      {/* Visites terminées : frais payé ou non */}
      <VisitFeesCard day={day} canManageAll={canManageAll} />

      {/* Listes du jour */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EntriesCard
          title="Frais de visite"
          emptyText="Aucun frais de visite ce jour."
          entries={fees}
          loading={dayLoading}
          onAdd={() => setDialogType('VISIT_FEE')}
          canDelete={canDelete}
          onDelete={confirmRemove}
        />
        <EntriesCard
          title="Dépenses"
          emptyText="Aucune dépense ce jour."
          entries={expenses}
          loading={dayLoading}
          onAdd={() => setDialogType('EXPENSE')}
          canDelete={canDelete}
          onDelete={confirmRemove}
        />
      </div>

      {/* Résumé 30 jours */}
      <Card>
        <CardHeader>
          <CardTitle>30 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          {summary && summary.days.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jour</TableHead>
                  <TableHead className="text-right">Frais de visite</TableHead>
                  <TableHead className="text-right">Dépenses</TableHead>
                  <TableHead className="text-right">Solde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.days.map((d) => (
                  <TableRow
                    key={d.date}
                    className={cn('cursor-pointer', d.date === day && 'bg-muted')}
                    onClick={() => setDay(d.date)}
                  >
                    <TableCell className="capitalize">{formatDayShort(d.date)}</TableCell>
                    <TableCell className="text-right text-green-700">{formatPrice(d.visitFees)}</TableCell>
                    <TableCell className="text-right text-red-700">{formatPrice(d.expenses)}</TableCell>
                    <TableCell className={cn('text-right font-medium', d.balance < 0 && 'text-red-700')}>
                      {formatPrice(d.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-green-700">{formatPrice(summary.totals.visitFees)}</TableCell>
                  <TableCell className="text-right text-red-700">{formatPrice(summary.totals.expenses)}</TableCell>
                  <TableCell className={cn('text-right', summary.totals.balance < 0 && 'text-red-700')}>
                    {formatPrice(summary.totals.balance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-muted-foreground">Aucune opération sur les 30 derniers jours.</p>
          )}
        </CardContent>
      </Card>

      {dialogType && (
        <EntryDialog type={dialogType} day={day} onClose={() => setDialogType(null)} />
      )}
    </div>
  );
}

// ── Composants ────────────────────────────────────────────────────────

function TotalCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'green' | 'red' | 'default';
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              'text-2xl font-bold',
              tone === 'green' && 'text-green-700',
              tone === 'red' && 'text-red-700',
            )}
          >
            {formatPrice(value)}
          </p>
        </div>
        <Icon
          className={cn(
            'h-8 w-8 text-muted-foreground',
            tone === 'green' && 'text-green-600',
            tone === 'red' && 'text-red-600',
          )}
        />
      </CardContent>
    </Card>
  );
}

function EntriesCard({
  title,
  emptyText,
  entries,
  loading,
  onAdd,
  canDelete,
  onDelete,
}: {
  title: string;
  emptyText: string;
  entries: CashEntry[];
  loading: boolean;
  onAdd: () => void;
  canDelete: (e: CashEntry) => boolean;
  onDelete: (e: CashEntry) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-muted-foreground">Chargement...</p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => {
              const visitTitle = e.visit?.properties?.[0]?.property?.title;
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{e.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {e.category && (
                        <Badge variant="secondary">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                      )}
                      {e.paymentMethod && <span>{PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod}</span>}
                      {e.visit?.client && (
                        <span>
                          Visite : {e.visit.client.firstName} {e.visit.client.lastName}
                          {visitTitle ? ` · ${visitTitle}` : ''}
                        </span>
                      )}
                      <span>par {e.createdBy.firstName} {e.createdBy.lastName}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="font-semibold">{formatPrice(Number(e.amount))}</span>
                    {canDelete(e) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(e)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function VisitFeesCard({ day, canManageAll }: { day: string; canManageAll: boolean }) {
  const qc = useQueryClient();
  const { data: visits = [], isLoading } = useQuery({
    queryKey: queryKeys.cash.visits(day),
    queryFn: () => cashService.getVisitsOfDay(day),
  });

  const toggle = useMutation({
    mutationFn: ({ visit, paid }: { visit: CashVisitOption; paid: boolean }) =>
      cashService.setVisitFee(visit.id, { paid, date: day }),
    onSuccess: ({ feePaid }) => {
      qc.invalidateQueries({ queryKey: queryKeys.cash.all });
      toast.success(feePaid ? 'Frais de visite encaissé' : 'Frais de visite annulé');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const completed = visits.filter((v) => v.status === 'COMPLETED');
  const others = visits.length - completed.length;
  const paid = completed.filter((v) => v.feePaid);
  const unpaid = completed.length - paid.length;
  const collected = paid.reduce((s, v) => s + v.feeAmount, 0);
  const expected = completed.length * DEFAULT_VISIT_FEE;
  const missing = unpaid * DEFAULT_VISIT_FEE;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          Visites terminées du jour
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cochez « Payé » quand le client a réglé les {DEFAULT_VISIT_FEE} DT de frais de visite : le montant
          est ajouté automatiquement aux frais du jour.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Terminées" value={String(completed.length)} />
          <Stat label="Payées" value={String(paid.length)} tone="green" />
          <Stat label="Non payées" value={String(unpaid)} tone={unpaid > 0 ? 'red' : 'default'} />
          <Stat label="Encaissé / attendu" value={`${formatPrice(collected)} / ${formatPrice(expected)}`} />
          <Stat label="Reste à encaisser" value={formatPrice(missing)} tone={missing > 0 ? 'red' : 'default'} />
        </div>

        {isLoading ? (
          <p className="py-4 text-center text-muted-foreground">Chargement...</p>
        ) : completed.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            Aucune visite terminée ce jour.
            {others > 0 && ` ${others} visite(s) prévue(s) pas encore terminée(s).`}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {completed.map((v) => {
              const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(v.scheduledAt));
              const title = v.properties?.[0]?.property?.title;
              return (
                <li key={v.id} className={cn('flex items-center justify-between gap-3 px-4 py-3', !v.feePaid && 'bg-red-50/50')}>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {v.client.firstName} {v.client.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {time}
                      {title ? ` · ${title}` : ''}
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-green-600"
                      checked={v.feePaid}
                      disabled={toggle.isPending}
                      onChange={(e) => {
                        const paidNow = e.target.checked;
                        if (!paidNow && !window.confirm('Annuler le paiement de ce frais de visite ?')) return;
                        toggle.mutate({ visit: v, paid: paidNow });
                      }}
                    />
                    <span className={cn('w-28', v.feePaid ? 'font-medium text-green-700' : 'text-red-700')}>
                      {v.feePaid ? `Payé ${formatPrice(v.feeAmount)}` : 'Non payé'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {others > 0 && completed.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {others} autre(s) visite(s) ce jour pas encore terminée(s) : marquez-les « Terminée » dans Visites pour
            pouvoir encaisser leur frais.
          </p>
        )}
        {!canManageAll && (
          <p className="text-xs text-muted-foreground">
            Vous ne pouvez annuler que les paiements que vous avez saisis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'green' | 'red' | 'default' }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-semibold',
          tone === 'green' && 'text-green-700',
          tone === 'red' && 'text-red-700',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EntryDialog({
  type,
  day,
  onClose,
}: {
  type: CashEntryType;
  day: string;
  onClose: () => void;
}) {
  const isFee = type === 'VISIT_FEE';
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('OTHER');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [visitId, setVisitId] = useState(NONE);

  const { data: visits = [] } = useQuery({
    queryKey: queryKeys.cash.visits(day),
    queryFn: () => cashService.getVisitsOfDay(day),
    enabled: isFee,
  });

  const visitOptions = useMemo(
    () =>
      visits.filter((v) => !v.feePaid).map((v) => {
        const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(v.scheduledAt));
        const title = v.properties?.[0]?.property?.title;
        return {
          id: v.id,
          text: `${time} · ${v.client.firstName} ${v.client.lastName}${title ? ` · ${title}` : ''}`,
          label: `Frais de visite – ${v.client.firstName} ${v.client.lastName}${title ? ` (${title})` : ''}`,
        };
      }),
    [visits],
  );

  const mutation = useMutation({
    mutationFn: () =>
      cashService.create({
        type,
        date: day,
        amount: Number(amount),
        label: label.trim(),
        paymentMethod,
        category: isFee ? undefined : category,
        visitId: isFee && visitId !== NONE ? visitId : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cash.all });
      toast.success(isFee ? 'Frais de visite ajouté' : 'Dépense ajoutée');
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const valid = Number(amount) > 0 && label.trim().length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isFee ? 'Nouveau frais de visite' : 'Nouvelle dépense'}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
        >
          {isFee && (
            <div className="space-y-1.5">
              <Label>Visite concernée (facultatif)</Label>
              <Select
                value={visitId}
                onValueChange={(v) => {
                  setVisitId(v);
                  // Libellé proposé automatiquement à partir de la visite
                  const opt = visitOptions.find((o) => o.id === v);
                  if (opt && !label.trim()) setLabel(opt.label);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    {visitOptions.length ? 'Aucune' : 'Aucune visite ce jour'}
                  </SelectItem>
                  {visitOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Libellé <span className="text-destructive">*</span>
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isFee ? 'Frais de visite – client' : 'ex. Carburant visite Ariana'}
              maxLength={200}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Montant (DT) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paiement</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isFee && (
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {EXPENSE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!valid || mutation.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
