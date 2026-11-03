'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  UserPlus,
  Calendar,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import React from 'react';

import { leadsService, type LeadStatus } from '@/services/leads.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const STATUS_OPTIONS: LeadStatus[] = ['NEW', 'CONTACTED', 'A_CONTACT', 'QUALIFIED', 'VISIT_SCHEDULED', 'NEGOTIATION', 'WON', 'LOST'];

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  A_CONTACT: 'A contacté',
  QUALIFIED: 'Qualifié',
  VISIT_SCHEDULED: 'Visite programmée',
  NEGOTIATION: 'Négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const leadId = resolvedParams.id;

  const { data: lead, isLoading } = useQuery({
    queryKey: queryKeys.leads.detail(leadId),
    queryFn: () => leadsService.getById(leadId),
    enabled: !!leadId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { status?: LeadStatus; notes?: string; budget?: number }) =>
      leadsService.update(leadId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      toast.success('Lead mis à jour');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded mb-2"></div>
        <div className="h-4 w-64 bg-slate-200 animate-pulse rounded mb-6"></div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-64 bg-slate-200 animate-pulse rounded lg:col-span-2"></div>
          <div className="h-64 bg-slate-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead introuvable.</p>
        <Button variant="link" onClick={() => router.push('/crm/leads')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retour aux leads
        </Button>
      </div>
    );
  }

  const statusColor = leadsService.statusColors[lead.status] ?? 'bg-gray-500';
  const primaryProperty = lead.properties?.[0]?.property;

  return (
    <>
      <PageHeader
        title={lead.client ? `${lead.client.firstName} ${lead.client.lastName}` : `Lead #${lead.id.slice(0, 8)}`}
        description={primaryProperty
          ? `Prospect ${primaryProperty.title} — ${primaryProperty.city}`
          : 'Aucun bien associé'}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <a href={`/crm/clients/${lead.clientId}`}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Voir le client
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Informations du lead */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du lead</CardTitle>
              <CardDescription>
                Statut, source et notes associées à ce prospect.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <div className="pt-2 mb-2">
                  <Badge className={statusColor}>
                    {leadsService.statusLabels[lead.status]}
                  </Badge>
                </div>
                <Select
                  value={lead.status}
                  onValueChange={(val) => updateMutation.mutate({ status: val as LeadStatus })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${leadsService.statusColors[s]}`} />
                          {LEAD_STATUS_LABELS[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <div className="pt-2">
                  <Badge variant="outline">
                    {leadsService.sourceLabels[lead.source]}
                  </Badge>
                </div>
              </div>

              {lead.budget !== null && lead.budget !== undefined && (
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <div className="pt-2 text-lg font-semibold">
                    {Number(lead.budget).toLocaleString('fr-FR')} DT
                  </div>
                </div>
              )}

              {lead.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Créé {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: fr })}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lead.activities && lead.activities.length > 0 ? (
                <ul className="space-y-4">
                  {lead.activities.map((activity) => (
                    <li key={activity.id} className="border-l-2 border-slate-200 pl-4 py-2">
                      <p className="font-medium text-sm">{activity.type}</p>
                      <p className="text-sm text-muted-foreground">{activity.notes}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Client */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.client ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <UserPlus className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">{lead.client.firstName} {lead.client.lastName}</p>
                    {lead.client.email && <p className="text-sm text-muted-foreground">{lead.client.email}</p>}
                    {lead.client.phone && <p className="text-sm text-muted-foreground">{lead.client.phone}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun client associé.</p>
              )}
            </CardContent>
          </Card>

          {/* Bien */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bien immobilier</CardTitle>
            </CardHeader>
            <CardContent>
              {primaryProperty ? (
                <>
                  <p className="font-medium">{primaryProperty.title}</p>
                  <p className="text-sm text-muted-foreground">{primaryProperty.city}</p>
                  {primaryProperty.price && (
                    <p className="text-sm font-semibold mt-2">
                      {Number(primaryProperty.price).toLocaleString('fr-FR')} DT
                    </p>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {primaryProperty.status}
                  </Badge>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun bien associé.</p>
              )}
            </CardContent>
          </Card>

          {/* Agent */}
          {lead.agent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {lead.agent.user.firstName} {lead.agent.user.lastName}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
