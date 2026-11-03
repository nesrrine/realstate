'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, Check, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import {
  notificationsService,
  type AppNotification,
} from '@/services/notifications.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuth } from '@/providers/AuthProvider';

function timeAgo(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return '';
  }
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const canSeeTeam = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  // « Équipe » : le gérant consulte les notifications des agents sans les marquer comme lues
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const isTeam = scope === 'team';

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.notifications.list({ limit: 50, unreadOnly: filter === 'unread', scope }),
    queryFn: () =>
      notificationsService.getNotifications({
        limit: 50,
        unreadOnly: filter === 'unread',
        scope,
      }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: unreadCountData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsService.getUnreadCount,
    staleTime: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      toast.success('Toutes les notifications sont marquées comme lues');
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const notifications: AppNotification[] = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const unreadCount = unreadCountData?.count ?? 0;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  // Ouvrir une notification la marque comme lue (seulement les siennes)
  const handleOpen = (notif: AppNotification) => {
    if (!isTeam && !notif.isRead) markAsReadMutation.mutate(notif.id);
    if (notif.link) router.push(notif.link);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Restez informé de l'activité de votre agence"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canSeeTeam && (
              <Select value={scope} onValueChange={(v) => setScope(v as 'mine' | 'team')}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mine">Mes notifications</SelectItem>
                  <SelectItem value="team">Toute l&apos;équipe</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="unread">
                  Non lues{isTeam ? '' : ` (${unreadCount})`}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {!isTeam && unreadCount > 0 && (
              <Button
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Tout lire
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Bell className="mb-2 h-5 w-5" />
            {isTeam ? "Notifications de l'équipe" : 'Mes notifications'} ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Aucune notification"
              description={
                filter === 'unread'
                  ? 'Toutes vos notifications sont lues.'
                  : 'Vous n\'avez aucune notification pour le moment.'
              }
            />
          ) : (
            <div className="space-y-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
className={`group flex items-start justify-between rounded-lg border border-border p-4 transition-colors ${
  !notif.isRead
    ? 'bg-primary/5 border-primary/20'
    : 'hover:bg-muted/50'
}`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          !notif.isRead ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <Badge variant="default" className="text-xs">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notif.body}
                    </p>
                    {isTeam && notif.agent && (
                      <p className="text-xs text-muted-foreground">
                        Pour : {notif.agent.user.firstName} {notif.agent.user.lastName}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo(notif.createdAt)}
                      </div>
                      {notif.link && (
                        <button
                          type="button"
                          onClick={() => handleOpen(notif)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ouvrir
                        </button>
                      )}
                    </div>
                  </div>

                  {!isTeam && !notif.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleMarkAsRead(notif.id)}
                      disabled={markAsReadMutation.isPending}
                      aria-label="Marquer comme lue"
                      title="Marquer comme lue"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
