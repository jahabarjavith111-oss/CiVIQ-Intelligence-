import { api } from './api';
import type { Conflict, ConflictSummary, ClashDetectionResult, ConflictComment, ConflictAttachment } from '@/types/conflict';

export const coordinationApi = {
  getConflicts: (projectId: string, params?: { type?: string; severity?: string; status?: string; page?: number; limit?: number }) =>
    api.get<{ data: Conflict[]; total: number }>(`/projects/${projectId}/coordination/conflicts`, { params }),

  getConflict: (id: string) => api.get<Conflict>(`/coordination/conflicts/${id}`),

  createConflict: (projectId: string, data: Omit<Conflict, 'id' | 'projectId' | 'reportedBy' | 'reportedAt' | 'reviewedAt' | 'resolvedAt' | 'attachments' | 'comments'>) =>
    api.post<Conflict>(`/projects/${projectId}/coordination/conflicts`, data),

  updateConflict: (id: string, data: Partial<Conflict>) => api.patch<Conflict>(`/coordination/conflicts/${id}`, data),

  deleteConflict: (id: string) => api.delete(`/coordination/conflicts/${id}`),

  assignConflict: (id: string, userId: string) => api.post(`/coordination/conflicts/${id}/assign`, { userId }),

  updateConflictStatus: (id: string, status: Conflict['status'], resolution?: string) =>
    api.patch<Conflict>(`/coordination/conflicts/${id}/status`, { status, resolution }),

  addComment: (conflictId: string, content: string) => api.post<ConflictComment>(`/coordination/conflicts/${conflictId}/comments`, { content }),

  updateComment: (commentId: string, content: string) => api.patch<ConflictComment>(`/coordination/comments/${commentId}`, { content }),

  deleteComment: (commentId: string) => api.delete(`/coordination/comments/${commentId}`),

  addAttachment: (conflictId: string, file: File, type: ConflictAttachment['type']) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.upload<ConflictAttachment>(`/coordination/conflicts/${conflictId}/attachments`, formData);
  },

  deleteAttachment: (attachmentId: string) => api.delete(`/coordination/attachments/${attachmentId}`),

  getSummary: (projectId: string) => api.get<ConflictSummary>(`/projects/${projectId}/coordination/summary`),

  runClashDetection: (projectId: string, params: { modelId: string; tolerance?: number; categories?: string[] }) =>
    api.post<ClashDetectionResult>(`/projects/${projectId}/coordination/clash-detection`, params),

  getClashRuns: (projectId: string) => api.get<{ id: string; modelId: string; runAt: string; statistics: ClashDetectionResult['statistics'] }[]>(`/projects/${projectId}/coordination/clash-runs`),

  getClashRun: (runId: string) => api.get<ClashDetectionResult>(`/coordination/clash-runs/${runId}`),

  exportConflicts: (projectId: string, format: 'csv' | 'xlsx' | 'pdf' | 'bcf') =>
    api.get(`/projects/${projectId}/coordination/export`, { params: { format }, responseType: 'blob' }),

  importBCF: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload(`/projects/${projectId}/coordination/import-bcf`, formData);
  },

  getMatrix: (projectId: string) => api.get<{ categories: string[]; matrix: number[][] }>(`/projects/${projectId}/coordination/matrix`),

  getTrends: (projectId: string, params?: { period?: string; interval?: 'day' | 'week' | 'month' }) =>
    api.get<{ date: string; total: number; bySeverity: Record<string, number>; byStatus: Record<string, number> }[]>(`/projects/${projectId}/coordination/trends`, { params }),
};