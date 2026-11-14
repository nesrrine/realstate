'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  Building2,
  CalendarDays,
  ExternalLink,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { dashboardService } from '@/services/dashboard.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TYPE_LABELS } from '@/lib/property-constants';
import type { PropertyType } from '@/services/properties.service';
import { queryKeys } from '@/lib/query-keys';
import type {
  DashboardSummary,
  DashboardSalesStats,
  DashboardLeadsStats,
  AgentPerformanceRow,
  LeadBrief,
} from '@/services/dashboard.service';

const DASHBOARD_STALE_TIME = 5 * 60_000;

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatDt(value: number) {
  return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(value);
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function monthLabel(m: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(m);
  if (!match) return m;
  return MONTHS[Number(match[2]) - 1] ?? m;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

// placeholderData évite un rendu brutal lors du refetch (keepPreviousData).
const SUMMARY_PLACEHOLDER: DashboardSummary = {
  availableProperties: 0,
  totalClients: 0,
  newLeads: 0,
  visitsToday: 0,
  upcomingVisits: 0,
  sales: 0,
  rentals: 0,
  revenue: 0,
  commissions: 0,
  commissionBreakdown: { agency: 0, fieldAgent: 0, officeAgent: 0 },
  agentPerformance: [] as AgentPerformanceRow[],
  properties: { available: 0 },
  clients: { total: 0 },
  leads: { new: 0 },
  visits: { today: 0, upcoming: 0 },
  transactions: { sales: 0, rentals: 0, total: 0 },
  revenueDetail: { total: 0 },
  commissionsDetail: { total: 0 },
  recentLeads: [] as LeadBrief[],
};

const SALES_PLACEHOLDER: DashboardSalesStats = {
  salesByMonth: [],
  salesPerMonth: [],
  rentalsPerMonth: [],
  propertiesByType: [],
  transactionsByPropertyType: [],
  byPropertyType: [],
  priceDistribution: [],
};

const LEADS_PLACEHOLDER: DashboardLeadsStats = {
  leadsBySource: [],
  byStatus: [],
  conversion: { total: 0, won: 0, lost: 0, rate: 0 },
  leadsByMonth: [],
};

// ── Couleurs des statuts de lead ─────────────────────────────────
const LEAD_STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  CONTACTED:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  QUALIFIED:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  WON: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  LOST: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
};

// ── Petits composants ────────────────────────────────────────────

type Tone = 'sky' | 'violet' | 'amber' | 'emerald';

const TONES: Record<Tone, string> = {
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
};

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="flex items-start gap-4 p-5">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Meter({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{label}</span>
        <span className="font-semibold tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed py-10 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-16 w-72 rounded-xl bg-muted" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="h-56 rounded-2xl bg-muted lg:col-span-5" />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-26 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
      <div className="h-72 rounded-2xl bg-muted" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => dashboardService.getSummary(),
    staleTime: DASHBOARD_STALE_TIME,
    placeholderData: SUMMARY_PLACEHOLDER,
  });

  const { data: sales } = useQuery({
    queryKey: queryKeys.dashboard.sales(),
    queryFn: () => dashboardService.getSales(),
    staleTime: DASHBOARD_STALE_TIME,
    placeholderData: SALES_PLACEHOLDER,
  });

  const { data: leads } = useQuery({
    queryKey: queryKeys.dashboard.leads(),
    queryFn: () => dashboardService.getLeads(),
    staleTime: DASHBOARD_STALE_TIME,
    placeholderData: LEADS_PLACEHOLDER,
  });

  if (loadingSummary) {
    return <DashboardSkeleton />;
  }

  const s = summary ?? SUMMARY_PLACEHOLDER;

  // Répartition des commissions (barre empilée dans la carte CA)
  const commissionTotal =
    s.commissionBreakdown.agency + s.commissionBreakdown.fieldAgent + s.commissionBreakdown.officeAgent;
  const pctOf = (v: number) => (commissionTotal > 0 ? (v / commissionTotal) * 100 : 0);

  // Graphique ventes / locations (12 derniers mois)
  const months = (sales?.salesByMonth ?? []).slice(-12);
  const maxMonth = Math.max(1, ...months.map((m) => m.sales + m.rentals));

  const sources = leads?.leadsBySource ?? [];
  const maxSource = Math.max(1, ...sources.map((i) => i.count));

  const types = sales?.propertiesByType ?? [];
  const maxType = Math.max(1, ...types.map((i) => i.count));

  const agents = s.agentPerformance ?? [];
  const maxAgentRevenue = Math.max(1, ...agents.map((a) => a.revenue));

  return (
    <div className="space-y-8">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d&apos;ensemble de l&apos;agence</p>
      </div>

      {/* ── Carte CA + KPI ─────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="overflow-hidden rounded-2xl border-0 bg-primary text-primary-foreground shadow-md lg:col-span-5">
          <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-primary-foreground/70">Chiffre d&apos;affaires</p>
                <p className="mt-1 text-4xl font-bold tracking-tight">{formatDt(s.revenue)} DT</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
                <Banknote className="h-5 w-5" />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary-foreground/10 p-3">
                <p className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
                  <TrendingUp className="h-3.5 w-3.5" /> Ventes
                </p>
                <p className="text-2xl font-bold">{s.sales}</p>
              </div>
              <div className="rounded-xl bg-primary-foreground/10 p-3">
                <p className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
                  <TrendingUp className="h-3.5 w-3.5" /> Locations
                </p>
                <p className="text-2xl font-bold">{s.rentals}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-primary-foreground/70">Commissions</p>
                <p className="text-lg font-semibold">{formatDt(s.commissions)} DT</p>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-primary-foreground/15">
                <div className="bg-primary-foreground" style={{ width: `${pctOf(s.commissionBreakdown.agency)}%` }} />
                <div className="bg-primary-foreground/60" style={{ width: `${pctOf(s.commissionBreakdown.fieldAgent)}%` }} />
                <div className="bg-primary-foreground/30" style={{ width: `${pctOf(s.commissionBreakdown.officeAgent)}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-foreground/80">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                  Agence {formatDt(s.commissionBreakdown.agency)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary-foreground/60" />
                  Terrain {formatDt(s.commissionBreakdown.fieldAgent)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary-foreground/30" />
                  Bureau {formatDt(s.commissionBreakdown.officeAgent)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <KpiCard title="Biens disponibles" value={s.availableProperties} icon={Building2} tone="sky" />
          <KpiCard title="Clients actifs" value={s.totalClients} icon={Users} tone="violet" />
          <KpiCard title="Nouveaux leads (7 j)" value={s.newLeads} icon={UserPlus} tone="amber" />
          <KpiCard
            title="Visites du jour"
            value={s.visitsToday}
            hint={`${s.upcomingVisits} à venir (7 j)`}
            icon={CalendarDays}
            tone="emerald"
          />
        </div>
      </div>

      {/* ── Ventes & locations par mois ────────────────────────── */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Ventes &amp; locations par mois</CardTitle>
            <CardDescription>12 derniers mois</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Ventes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary/35" /> Locations
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {!months.length ? (
            <EmptyState>Aucune donnée.</EmptyState>
          ) : (
            <div className="space-y-4">
              <div className="flex h-48 items-end gap-2 sm:gap-3">
                {months.map((row) => {
                  const total = row.sales + row.rentals;
                  const heightPct = total > 0 ? Math.max(6, (total / maxMonth) * 100) : 0;
                  return (
                    <div
                      key={row.month}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                      title={`${row.month} — ${row.sales} vente(s), ${row.rentals} location(s), ${formatDt(row.revenue)} DT`}
                    >
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {total > 0 ? total : ''}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        {total > 0 ? (
                          <div
                            className="flex w-full flex-col overflow-hidden rounded-t-lg transition-opacity group-hover:opacity-80"
                            style={{ height: `${heightPct}%` }}
                          >
                            <div className="bg-primary/35" style={{ flexGrow: row.rentals }} />
                            <div className="bg-primary" style={{ flexGrow: row.sales }} />
                          </div>
                        ) : (
                          <div className="h-0.5 w-full rounded bg-muted" />
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{monthLabel(row.month)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 border-t pt-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Ventes</p>
                  <p className="text-lg font-bold tabular-nums">{months.reduce((a, m) => a + m.sales, 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Locations</p>
                  <p className="text-lg font-bold tabular-nums">{months.reduce((a, m) => a + m.rentals, 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CA sur la période</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatDt(months.reduce((a, m) => a + m.revenue, 0))} DT
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Leads récents + Performance agents ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle>Nouveaux leads (7 j)</CardTitle>
            <CardDescription>Les 7 dernières demandes de contact reçues</CardDescription>
          </CardHeader>
          <CardContent>
            {!s.recentLeads?.length ? (
              <EmptyState>Aucun lead cette semaine.</EmptyState>
            ) : (
              <div className="space-y-2">
                {s.recentLeads.map((lead) => {
                  const prop = lead.properties?.[0]?.property;
                  const fullName = `${lead.client.firstName} ${lead.client.lastName}`;
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-border hover:bg-accent/50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initials(fullName)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium">{fullName}</p>
                          <span
                            className={cn(
                              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none capitalize',
                              LEAD_STATUS_STYLES[lead.status.toUpperCase()] ??
                                'bg-muted text-muted-foreground border-border',
                            )}
                          >
                            {lead.status.toLowerCase()}
                          </span>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {prop ? `${prop.title} — ${prop.city}` : 'Aucun bien associé'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>

                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={`Voir ${lead.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle>Performance des agents</CardTitle>
            <CardDescription>Top agents (CA)</CardDescription>
          </CardHeader>
          <CardContent>
            {!agents.length ? (
              <EmptyState>Aucune donnée.</EmptyState>
            ) : (
              <ol className="space-y-4">
                {agents.map((a, index) => (
                  <li key={a.agentId} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          index === 0
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        {initials(a.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="shrink-0 font-bold tabular-nums">{formatDt(a.revenue)} DT</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {a.sales} vente{a.sales > 1 ? 's' : ''} · {a.properties?.total ?? 0} biens (
                          {a.properties?.available ?? 0} dispo) · Comm. {formatDt(a.commissions)} DT
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(3, (a.revenue / maxAgentRevenue) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sources de leads + Biens par type ──────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle>Leads par source</CardTitle>
          </CardHeader>
          <CardContent>
            {!sources.length ? (
              <EmptyState>Aucun lead.</EmptyState>
            ) : (
              <ul className="space-y-4">
                {sources.map((item) => (
                  <Meter key={item.source} label={item.source} value={item.count} max={maxSource} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle>Biens par type</CardTitle>
          </CardHeader>
          <CardContent>
            {!types.length ? (
              <EmptyState>Aucun bien.</EmptyState>
            ) : (
              <ul className="space-y-4">
                {types.map((item) => (
                  <Meter
                    key={item.type}
                    label={TYPE_LABELS[item.type as PropertyType] ?? item.type}
                    value={item.count}
                    max={maxType}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}