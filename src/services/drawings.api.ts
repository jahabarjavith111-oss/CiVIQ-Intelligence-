import { api } from './api';
import type { Drawing, DrawingAnalysis, UploadDrawingData, AnalyzeDrawingRequest, DetectedElement, OCRResult } from '@/types/drawing';

export const drawingsApi = {
  list: (projectId: string, params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }) =>
    api.get<{ data: Drawing[]; total: number; page: number; limit: number }>(`/projects/${projectId}/drawings`, { params }),

  get: (id: string) => api.get<Drawing>(`/drawings/${id}`),

  upload: (projectId: string, data: UploadDrawingData) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('type', data.type);
    if (data.discipline) formData.append('discipline', data.discipline);
    return api.upload<Drawing>(`/projects/${projectId}/drawings`, formData);
  },

  update: (id: string, data: Partial<Drawing>) => api.patch<Drawing>(`/drawings/${id}`, data),

  delete: (id: string) => api.delete(`/drawings/${id}`),

  analyze: (id: string, options?: AnalyzeDrawingRequest['options']) =>
    api.post<DrawingAnalysis>(`/drawings/${id}/analyze`, { options }),

  getAnalysis: (id: string) => api.get<DrawingAnalysis>(`/drawings/${id}/analysis`),

  getElements: (id: string) => api.get<DetectedElement[]>(`/drawings/${id}/elements`),

  getOCR: (id: string) => api.get<OCRResult[]>(`/drawings/${id}/ocr`),

  getThumbnail: (id: string, page: number = 1) =>
    api.get(`/drawings/${id}/thumbnail`, { params: { page }, responseType: 'blob' }),

  getPage: (id: string, page: number, scale?: number) =>
    api.get(`/drawings/${id}/pages/${page}`, { params: { scale }, responseType: 'blob' }),

  download: (id: string) => api.get(`/drawings/${id}/download`, { responseType: 'blob' }),

  duplicate: (id: string, projectId: string) => api.post<Drawing>(`/drawings/${id}/duplicate`, { projectId }),

  batchAnalyze: (projectId: string, drawingIds: string[], options?: AnalyzeDrawingRequest['options']) =>
    api.post(`/projects/${projectId}/drawings/batch-analyze`, { drawingIds, options }),

  getStats: (projectId: string) =>
    api.get(`/projects/${projectId}/drawings/stats`),
};