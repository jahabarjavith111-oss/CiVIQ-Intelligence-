import { api } from './api';

export interface NotificationItem {
  id: string;
  userId: string;
  projectId?: string;
  type: 'conflict' | 'risk' | 'revision' | 'schedule' | 'cost' | 'mention' | 'assignment' | 'system';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
    api.get<{ data: NotificationItem[]; total: number; unread: number }>('/notifications', { params }),
  markRead: (id: string) => api.post<NotificationItem>(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  preferences: () => api.get<{ email: boolean; push: boolean; inApp: boolean }>('/notifications/preferences'),
  updatePreferences: (p: { email?: boolean; push?: boolean; inApp?: boolean }) =>
    api.patch('/notifications/preferences', p),
};
