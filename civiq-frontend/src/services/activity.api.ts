import { api } from './api';

export interface ActivityItem {
  id: string;
  projectId: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: 'project' | 'drawing' | 'model' | 'boq' | 'cost' | 'schedule' | 'conflict' | 'revision' | 'risk' | 'report' | 'team';
  entityId?: string;
  entityName?: string;
  details?: string;
  createdAt: string;
}

export const activityApi = {
  list: (projectId: string, params?: { page?: number; limit?: number; entityType?: string }) =>
    api.get<{ data: ActivityItem[]; total: number }>(`/projects/${projectId}/activity`, { params }),
  feed: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: ActivityItem[]; total: number }>('/activity/feed', { params }),
};
