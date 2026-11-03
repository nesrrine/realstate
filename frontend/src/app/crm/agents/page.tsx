'use client';


import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, UserCircle } from 'lucide-react';

import { agentsService, type AgentFilters, type AgentType } from '@/services/agents.service';
import { AgentTypeBadge } from '@/components/agents/agent-type-badge';

const TYPE_FILTERS: { type: AgentType | undefined; label: string }[] = [
  { type: undefined, label: 'Tous' },
  { type: 'FIELD', label: 'Terrain' },
  { type: 'OFFICE', label: 'Bureau' },
];
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fullName } from '@/lib/property-constants';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { useAuth } from '@/providers/AuthProvider';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AgentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = usePersistentState<AgentFilters>('agents', { page: 1, limit: 20 });

  useEffect(() => {
    if (user && user.role === 'AGENT') {
      router.replace('/crm/dashboard');
    }
  }, [user, router]);

  const { data: list, isLoading } = useQuery({
    queryKey: ['agents', 'list', filters],
    queryFn: () => agentsService.getList(filters),
    enabled: !!user && user.role !== 'AGENT',
  });

  const agents = list?.data ?? [];
  const total = list?.meta?.total ?? 0;

  if (!user || user.role === 'AGENT') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Gérez les collaborateurs et leurs portefeuilles clients
          </p>
        </div>
        <Link href="/crm/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel agent
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un agent..."
              className="pl-9"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, page: 1 })
              }
            />
          </div>
          {/* Filtre terrain / bureau */}
          <div className="flex gap-1 rounded-lg border border-border p-1" role="group" aria-label="Type d'agent">
            {TYPE_FILTERS.map(({ type, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setFilters({ ...filters, agentType: type, page: 1 })}
                aria-pressed={filters.agentType === type}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filters.agentType === type
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-12 text-center">Chargement...</div>
          ) : agents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Biens</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{fullName(agent.user)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{agent.user.email}</div>
                      {agent.user.phone && (
                        <div className="text-xs text-muted-foreground">{agent.user.phone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <AgentTypeBadge type={agent.agentType} />
                    </TableCell>
                    <TableCell>{agent._count?.clients ?? 0}</TableCell>
                    <TableCell>{agent._count?.properties ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={agent.user.isActive ? 'default' : 'secondary'}>
                        {agent.user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/crm/agents/${agent.id}`}>
                        <Button variant="outline" size="sm">
                          Voir
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <UserCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Aucun agent</h3>
              <p className="mb-4 text-muted-foreground">{total} agent(s) au total</p>
              <Link href="/crm/agents/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel agent
                </Button>
              </Link>
            </div>
          )}
          {list?.meta && list.meta.total > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <DataTablePagination
                meta={list.meta}
                onPage={(page) => setFilters((f) => ({ ...f, page }))}
                onLimit={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
