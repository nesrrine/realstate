'use client';

import { useRouter } from 'next/navigation';
import { Bell, Check, Clock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  notificationsService,
  type AppNotification,
} from '@/services/notifications.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const RECENT_LIMIT = 8;
const POLL_MS = 60_000;

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

export function NotificationsDropdown() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: notificationsData } = useQuery({
    queryKey: queryKeys.notifications.list({ limit: RECENT_LIMIT }),
    queryFn: () =>
      notificationsService.getNotifications({ limit: RECENT_LIMIT }),
    staleTime: 30_000,
    refetchInterval: POLL_MS,
  });

  const { data: unreadData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsService.getUnreadCount,
    staleTime: 30_000,
    // Nouvelles notifications visibles sans recharger la page
    refetchInterval: POLL_MS,
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

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const recentNotifications = notificationsData?.data ?? [];
  const unreadCount = unreadData?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-medium"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Tout lire
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="h-80 max-h-80 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <DropdownMenuGroup>
              {recentNotifications.map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className="flex flex-col items-start gap-1 cursor-pointer p-3"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                        !notif.isRead ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notif.body}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="ml-2 h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(notif.createdAt)}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer justify-center text-sm font-medium"
          onClick={() => router.push('/crm/notifications')}
        >
          <Check className="mr-2 h-4 w-4" />
          Voir toutes les notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
