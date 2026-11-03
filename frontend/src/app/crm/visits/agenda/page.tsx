'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, List, Loader2, Plus } from 'lucide-react';

import { visitsService, type Visit, type VisitFilters } from '@/services/visits.service';
import { agentsService } from '@/services/agents.service';
import { useAuth } from '@/providers/AuthProvider';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { queryKeys } from '@/lib/query-keys';
import { isManagement } from '@/lib/permissions';
import { VISIT_STATUS_LABELS, VISIT_STATUS_STYLES } from '@/lib/visit-status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExportExcelButton } from '@/components/shared/export-excel-button';

type View = 'week' | 'month';

// Plage horaire affichée en vue semaine (les visites hors plage sont collées aux bords)
const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_PX = 56;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ── Dates (heure locale de l'agence) ─────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7)); // lundi
const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', opts).format(d);

/** Lien « nouvelle visite » pré-rempli avec le créneau cliqué. */
const newVisitHref = (day: Date, hour = 9) => `/crm/visits/new?date=${dayKey(day)}T${pad(hour)}:00`;

const clientName = (v: Visit) => (v.client ? `${v.client.firstName} ${v.client.lastName}`.trim() : 'Client');

export default function AgendaPage() {
  const { user } = useAuth();
  const canFilterAgent = isManagement(user);

  const [view, setView] = usePersistentState<View>('agenda-vue', 'week');
  const [anchor, setAnchor] = usePersistentState('agenda-date', dayKey(new Date()));
  const [agentId, setAgentId] = usePersistentState('agenda-agent', '');
  const anchorDate = parseDay(anchor);

  // Période affichée : la semaine, ou les 6 semaines qui couvrent le mois
  const { start, end, days } = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(anchorDate);
      return { start: s, end: addDays(s, 7), days: Array.from({ length: 7 }, (_, i) => addDays(s, i)) };
    }
    const s = startOfWeek(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
    return { start: s, end: addDays(s, 42), days: Array.from({ length: 42 }, (_, i) => addDays(s, i)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor]);

  const filters: VisitFilters = {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
    limit: 500,
    sortOrder: 'asc',
    ...(agentId && { fieldAgentId: agentId }),
  };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.visits.list({ agenda: true, ...filters }),
    queryFn: () => visitsService.getAll(filters),
    enabled: !!user,
  });
  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    enabled: canFilterAgent,
    staleTime: 5 * 60_000,
  });

  const visits: Visit[] = data?.data ?? [];
  const byDay = useMemo(() => {
    const map = new Map<string, Visit[]>();
    for (const v of visits) {
      const k = dayKey(new Date(v.scheduledAt));
      map.set(k, [...(map.get(k) ?? []), v]);
    }
    return map;
  }, [visits]);

  const move = (dir: -1 | 1) => {
    const d =
      view === 'week'
        ? addDays(anchorDate, dir * 7)
        : new Date(anchorDate.getFullYear(), anchorDate.getMonth() + dir, 1);
    setAnchor(dayKey(d));
  };

  const title =
    view === 'week'
      ? `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(addDays(end, -1), { day: 'numeric', month: 'short', year: 'numeric' })}`
      : fmt(anchorDate, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda des visites</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Chargement…' : `${visits.length} visite${visits.length > 1 ? 's' : ''} sur la période`}
            {isFetching && !isLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/crm/visits">
            <Button variant="outline">
              <List className="mr-2 h-4 w-4" />
              Liste
            </Button>
          </Link>
          <ExportExcelButton type="visites" from={dayKey(start)} to={dayKey(addDays(end, -1))} />
          <Link href="/crm/visits/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle visite
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAnchor(dayKey(new Date()))}>
              Aujourd&apos;hui
            </Button>
            <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label="Période précédente">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label="Période suivante">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="ml-1 text-lg font-semibold capitalize">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canFilterAgent && (
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Filtrer par agent terrain"
              >
                <option value="">Tous les agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.user.firstName} {a.user.lastName}
                  </option>
                ))}
              </select>
            )}
            <div className="flex rounded-lg border border-border p-1" role="group" aria-label="Affichage">
              {(['week', 'month'] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                    view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {v === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {view === 'week' ? (
            <WeekView days={days} byDay={byDay} />
          ) : (
            <MonthView
              days={days}
              month={anchorDate.getMonth()}
              byDay={byDay}
              onOpenDay={(d) => {
                setAnchor(dayKey(d));
                setView('week');
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Légende */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(VISIT_STATUS_LABELS) as (keyof typeof VISIT_STATUS_LABELS)[]).map((s) => (
          <span key={s} className={cn('rounded-full border px-2.5 py-0.5', VISIT_STATUS_STYLES[s])}>
            {VISIT_STATUS_LABELS[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Vue semaine ──────────────────────────────────────────────────────
function WeekView({ days, byDay }: { days: Date[]; byDay: Map<string, Visit[]> }) {
  const todayKey = dayKey(new Date());
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const gridHeight = HOURS.length * HOUR_PX;
  const nowTop = (now.getHours() + now.getMinutes() / 60 - HOUR_START) * HOUR_PX;

  return (
    <div className="min-w-[760px]">
      {/* Jours */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
        <div />
        {days.map((d) => {
          const isToday = dayKey(d) === todayKey;
          return (
            <div key={dayKey(d)} className="border-l border-border px-2 py-2 text-center">
              <div className="text-xs uppercase text-muted-foreground">{WEEKDAYS[(d.getDay() + 6) % 7]}</div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grille horaire */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)]">
        <div className="relative" style={{ height: gridHeight }}>
          {HOURS.map((h, i) => (
            <div key={h} className="absolute right-2 -translate-y-2 text-xs text-muted-foreground" style={{ top: i * HOUR_PX }}>
              {i === 0 ? '' : `${pad(h)}:00`}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const k = dayKey(d);
          const dayVisits = layoutDay(byDay.get(k) ?? []);
          return (
            <div key={k} className="relative border-l border-border" style={{ height: gridHeight }}>
              {/* Créneaux cliquables : nouvelle visite à cette heure */}
              {HOURS.map((h, i) => (
                <Link
                  key={h}
                  href={newVisitHref(d, h)}
                  title={`Nouvelle visite le ${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })} à ${pad(h)}:00`}
                  className="group absolute inset-x-0 border-t border-border/60 transition-colors hover:bg-primary/5"
                  style={{ top: i * HOUR_PX, height: HOUR_PX }}
                >
                  <Plus className="m-1 h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
              {/* Heure actuelle */}
              {k === todayKey && nowTop >= 0 && nowTop <= gridHeight && (
                <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowTop }}>
                  <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                  <span className="h-px flex-1 bg-red-500" />
                </div>
              )}
              {dayVisits.map(({ visit, top, height, lane, lanes }) => (
                <Link
                  key={visit.id}
                  href={`/crm/visits/${visit.id}`}
                  className={cn(
                    'absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-tight shadow-sm transition-shadow hover:z-30 hover:shadow-md',
                    VISIT_STATUS_STYLES[visit.status],
                    visit.status === 'CANCELLED' && 'line-through opacity-70',
                  )}
                  style={{
                    top,
                    height,
                    left: `calc(${(lane / lanes) * 100}% + 2px)`,
                    width: `calc(${100 / lanes}% - 4px)`,
                  }}
                  title={`${time(new Date(visit.scheduledAt))} · ${clientName(visit)} · ${VISIT_STATUS_LABELS[visit.status]}`}
                >
                  <div className="font-semibold">{time(new Date(visit.scheduledAt))}</div>
                  <div className="truncate font-medium">{clientName(visit)}</div>
                  {visit.properties?.[0] && <div className="truncate opacity-80">{visit.properties[0].property.title}</div>}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Position des visites d'un jour ; les visites qui se chevauchent sont placées côte à côte. */
function layoutDay(visits: Visit[]) {
  const items = visits
    .map((visit) => {
      const s = new Date(visit.scheduledAt);
      const startH = s.getHours() + s.getMinutes() / 60;
      const endH = startH + (visit.duration || 60) / 60;
      return { visit, startH, endH };
    })
    .sort((a, b) => a.startH - b.startH);

  const laneEnds: number[] = [];
  const placed = items.map((it) => {
    let lane = laneEnds.findIndex((e) => e <= it.startH);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = it.endH;
    return { ...it, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  const max = HOURS.length * HOUR_PX;
  return placed.map(({ visit, startH, endH, lane }) => {
    const top = Math.min(Math.max(0, (startH - HOUR_START) * HOUR_PX), max - 28);
    const height = Math.max(28, Math.min((endH - startH) * HOUR_PX, max - top));
    return { visit, top, height, lane, lanes };
  });
}

// ── Vue mois ─────────────────────────────────────────────────────────
function MonthView({
  days,
  month,
  byDay,
  onOpenDay,
}: {
  days: Date[];
  month: number;
  byDay: Map<string, Visit[]>;
  onOpenDay: (d: Date) => void;
}) {
  const todayKey = dayKey(new Date());
  return (
    <div className="min-w-[760px]">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2 text-center text-xs font-medium uppercase text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const k = dayKey(d);
          const list = byDay.get(k) ?? [];
          const outside = d.getMonth() !== month;
          return (
            <div
              key={k}
              className={cn('group min-h-28 border-b border-l border-border p-1.5', outside && 'bg-muted/40')}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenDay(d)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium hover:bg-muted',
                    outside && 'text-muted-foreground',
                    k === todayKey && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                  title="Voir la semaine"
                >
                  {d.getDate()}
                </button>
                <Link
                  href={newVisitHref(d)}
                  className="rounded p-1 text-primary opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
                  aria-label={`Nouvelle visite le ${fmt(d, { day: 'numeric', month: 'long' })}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-1 space-y-1">
                {list.slice(0, 3).map((v) => (
                  <Link
                    key={v.id}
                    href={`/crm/visits/${v.id}`}
                    className={cn(
                      'block truncate rounded border px-1.5 py-0.5 text-[11px]',
                      VISIT_STATUS_STYLES[v.status],
                      v.status === 'CANCELLED' && 'line-through opacity-70',
                    )}
                    title={`${time(new Date(v.scheduledAt))} · ${clientName(v)}`}
                  >
                    <span className="font-semibold">{time(new Date(v.scheduledAt))}</span> {clientName(v)}
                  </Link>
                ))}
                {list.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(d)}
                    className="flex items-center gap-1 px-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <CalendarDays className="h-3 w-3" />+{list.length - 3} autre{list.length - 3 > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
