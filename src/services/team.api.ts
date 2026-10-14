import { api } from './api';
import type { User } from '@/types/auth';

export interface TeamMember extends User {
  projectRole?: 'owner' | 'manager' | 'engineer' | 'viewer';
  joinedAt?: string;
  lastActive?: string;
}

export interface InviteData {
  email: string;
  role: 'manager' | 'engineer' | 'viewer';
  message?: string;
}

export const teamApi = {
  list: (projectId: string) => api.get<TeamMember[]>(`/projects/${projectId}/team`),
  invite: (projectId: string, data: InviteData) => api.post<{ invited: boolean; email: string }>(`/projects/${projectId}/team/invite`, data),
  updateRole: (projectId: string, userId: string, role: TeamMember['projectRole']) =>
    api.patch<TeamMember>(`/projects/${projectId}/team/${userId}`, { role }),
  remove: (projectId: string, userId: string) => api.delete(`/projects/${projectId}/team/${userId}`),
  orgMembers: () => api.get<TeamMember[]>('/team/members'),
};
