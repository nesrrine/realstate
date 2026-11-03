'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, UserPlus, Calendar, TrendingUp, DollarSign, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { dashboardService } from '@/services/dashboard.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

function formatDt(value: number) {
  return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(value);
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

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

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
    return <p className="text-muted-foreground">Chargement du dashboard…</p>;
  }

  const s = summary ?? SUMMARY_PLACEHOLDER;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d&apos;ensemble de l&apos;agence</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Biens disponibles" value={s.availableProperties} icon={Building2} />
        <StatCard title="Clients actifs" value={s.totalClients} icon={Users} />
        <StatCard title="Nouveaux leads (7 j)" value={s.newLeads} icon={UserPlus} />
        <StatCard
          title="Visites du jour"
          value={s.visitsToday}
          hint={`${s.upcomingVisits} à venir (7 j)`}
          icon={Calendar}
        />
        <StatCard title="Ventes" value={s.sales} icon={TrendingUp} />
        <StatCard title="Locations" value={s.rentals} icon={TrendingUp} />
        <StatCard title="Chiffre d'affaires" value={`${formatDt(s.revenue)} DT`} icon={DollarSign} />
        <StatCard
          title="Commissions"
          value={`${formatDt(s.commissions)} DT`}
          hint={`Agence ${formatDt(s.commissionBreakdown.agency)} / Terrain ${formatDt(s.commissionBreakdown.fieldAgent)} / Bureau ${formatDt(s.commissionBreakdown.officeAgent)}`}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveaux leads (7 j)</CardTitle>
          <CardDescription>Les 7 dernières demandes de contact reçues</CardDescription>
        </CardHeader>
        <CardContent>
          {!s.recentLeads?.length ? (
            <p className="text-sm text-muted-foreground">Aucun lead cette semaine.</p>
          ) : (
            <div className="space-y-3">
              {s.recentLeads.map((lead) => {
                const prop = lead.properties?.[0]?.property;
                return (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {lead.client.firstName} {lead.client.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {prop ? `${prop.title} — ${prop.city}` : 'Aucun bien associé'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {lead.status.toLowerCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`/crm/leads/${lead.id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Voir ${lead.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventes & locations par mois</CardTitle>
            <CardDescription>12 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            {!sales?.salesByMonth?.length ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Locations</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.salesByMonth.slice(-6).map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right">{row.sales}</TableCell>
                      <TableCell className="text-right">{row.rentals}</TableCell>
                      <TableCell className="text-right">{formatDt(row.revenue)} DT</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads par source</CardTitle>
          </CardHeader>
          <CardContent>
            {!leads?.leadsBySource?.length ? (
              <p className="text-sm text-muted-foreground">Aucun lead.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {leads.leadsBySource.map((item) => (
                  <li key={item.source} className="flex justify-between">
                    <span>{item.source}</span>
                    <span className="font-medium">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biens par type</CardTitle>
          </CardHeader>
          <CardContent>
            {!sales?.propertiesByType?.length ? (
              <p className="text-sm text-muted-foreground">Aucun bien.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {sales.propertiesByType.map((item) => (
                  <li key={item.type} className="flex justify-between">
                    <span>{TYPE_LABELS[item.type as PropertyType] ?? item.type}</span>
                    <span className="font-medium">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance des agents</CardTitle>
            <CardDescription>Top agents (CA)</CardDescription>
          </CardHeader>
          <CardContent>
            {!s.agentPerformance?.length ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Biens</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                    <TableHead className="text-right">Comm.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.agentPerformance.map((a) => (
                    <TableRow key={a.agentId}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell className="text-right">{a.properties?.total ?? 0} ({a.properties?.available ?? 0} dispo)</TableCell>
                      <TableCell className="text-right">{a.sales}</TableCell>
                      <TableCell className="text-right">{formatDt(a.revenue)} DT</TableCell>
                      <TableCell className="text-right">{formatDt(a.commissions)} DT</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
