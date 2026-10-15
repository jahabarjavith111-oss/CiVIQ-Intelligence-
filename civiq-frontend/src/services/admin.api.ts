import { api } from './api';
import type { AdminOverview, AdminUser, AdminProjectStat, AiAnalysisRow, AiUsage, SystemHealth, PlatformSetting, AuditEntry, Page } from '@/types/admin';

export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview'),

  users: (params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) =>
    api.get<Page<AdminUser>>('/admin/users', { params }),
  updateUser: (id: string, data: { name?: string; role?: string; isActive?: boolean }) =>
    api.patch<AdminUser>(`/admin/users/${id}`, data),
  suspend: (id: string) => api.post<AdminUser>(`/admin/users/${id}/suspend`),
  activate: (id: string) => api.post<AdminUser>(`/admin/users/${id}/activate`),

  projects: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<Page<AdminProjectStat>>('/admin/projects', { params }),
  archiveProject: (id: string) => api.post<{ id: string; status: string }>(`/admin/projects/${id}/archive`),

  aiAnalyses: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<Page<AiAnalysisRow>>('/admin/ai/analyses', { params }),
  aiUsage: (days = 14) => api.get<AiUsage>('/admin/ai/usage', { params: { days } }),

  health: () => api.get<SystemHealth>('/admin/health'),

  settings: () => api.get<PlatformSetting[]>('/admin/settings'),
  updateSetting: (key: string, value: unknown) =>
    api.put<PlatformSetting>('/admin/settings', { key, value }),

  audit: (params?: { actor?: string; action?: string; page?: number; limit?: number }) =>
    api.get<Page<AuditEntry>>('/admin/audit', { params }),

  billing: () => api.get<{ enabled: boolean; message: string }>('/admin/billing'),
};
