import { api } from './api';
import type { Project, CreateProjectData, UpdateProjectData, ProjectSummary, ProjectHealth, ProjectMember, ProjectSettings } from '@/types/project';

export const projectsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get<{ data: ProjectSummary[]; total: number; page: number; limit: number }>('/projects', { params }),

  get: (id: string) => api.get<Project>(`/projects/${id}`),

  create: (data: CreateProjectData) => api.post<Project>('/projects', data),

  update: (id: string, data: UpdateProjectData) => api.patch<Project>(`/projects/${id}`, data),

  delete: (id: string) => api.delete(`/projects/${id}`),

  getHealth: (id: string) => api.get<ProjectHealth>(`/projects/${id}/health`),

  getSummary: (id: string) => api.get<ProjectSummary>(`/projects/${id}/summary`),

  getMembers: (id: string) => api.get<ProjectMember[]>(`/projects/${id}/members`),

  addMember: (id: string, userId: string, role: ProjectMember['role']) =>
    api.post<ProjectMember>(`/projects/${id}/members`, { userId, role }),

  updateMember: (id: string, userId: string, role: ProjectMember['role']) =>
    api.patch<ProjectMember>(`/projects/${id}/members/${userId}`, { role }),

  removeMember: (id: string, userId: string) => api.delete(`/projects/${id}/members/${userId}`),

  getSettings: (id: string) => api.get<ProjectSettings>(`/projects/${id}/settings`),

  updateSettings: (id: string, settings: Partial<ProjectSettings>) =>
    api.patch<ProjectSettings>(`/projects/${id}/settings`, settings),

  archive: (id: string) => api.post(`/projects/${id}/archive`),

  duplicate: (id: string, name: string) => api.post<Project>(`/projects/${id}/duplicate`, { name }),

  export: (id: string, format: 'pdf' | 'xlsx') => api.get(`/projects/${id}/export`, { params: { format }, responseType: 'blob' }),
};