import { api } from './api';

export type ReportType =
  | 'project' | 'drawing-analysis' | 'takeoff' | 'boq' | 'cost'
  | 'schedule' | 'conflict' | 'revision' | 'risk' | 'ai-insights' | 'complete';

export interface Report {
  id: string;
  projectId: string;
  name: string;
  type: ReportType;
  status: 'generating' | 'ready' | 'failed';
  fileUrl?: string;
  config: { template: string; sections: string[]; dateRange?: { start: string; end: string } };
  createdBy: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  projectId: string;
  name: string;
  type: string;
  fileUrl: string;
  fileSize: number;
  version: number;
  folder?: string;
  uploadedBy: string;
  createdAt: string;
}

export const reportsApi = {
  list: (projectId: string) => api.get<Report[]>(`/projects/${projectId}/reports`),
  generate: (projectId: string, data: { name: string; type: ReportType; config?: Report['config'] }) =>
    api.post<Report>(`/projects/${projectId}/reports`, data),
  get: (id: string) => api.get<Report>(`/reports/${id}`),
  download: (id: string) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  delete: (id: string) => api.delete(`/reports/${id}`),
};

export const documentsApi = {
  list: (projectId: string, params?: { folder?: string; search?: string }) =>
    api.get<DocumentItem[]>(`/projects/${projectId}/documents`, { params }),
  upload: (projectId: string, file: File, folder?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (folder) fd.append('folder', folder);
    return api.upload<DocumentItem>(`/projects/${projectId}/documents`, fd);
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
};
