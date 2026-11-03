import apiClient from '@/lib/api-client';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
  agentId?: string | null;
  clientId?: string | null;
  agent?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface NotificationMeta {
  total: number;
  unreadCount: number;
  limit: number;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  meta: NotificationMeta;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationsService = {
  /**
   * Get all notifications for current user
   */
  getNotifications: async (params?: {
    limit?: number;
    unreadOnly?: boolean;
    /** team : notifications de toute l'équipe (gérant/admin, lecture seule) */
    scope?: 'mine' | 'team';
  }): Promise<PaginatedNotifications> => {
    const { data } = await apiClient.get<PaginatedNotifications>('/notifications', {
      params,
    });
    return data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const { data } = await apiClient.get<UnreadCountResponse>(
      '/notifications/unread-count',
    );
    return data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/mark-all-read');
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<AppNotification> => {
    const { data } = await apiClient.patch<AppNotification>(
      `/notifications/${id}/read`,
    );
    return data;
  },
};
