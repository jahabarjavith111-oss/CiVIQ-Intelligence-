import { api } from './api';
import type { TakeoffItem, TakeoffSummary, TakeoffTemplate, ExportTakeoffOptions, TradeCategory } from '@/types/takeoff';

export const takeoffApi = {
  list: (projectId: string, params?: { trade?: TradeCategory; status?: string; page?: number; limit?: number }) =>
    api.get<{ data: TakeoffItem[]; total: number }>(`/projects/${projectId}/takeoff`, { params }),

  get: (id: string) => api.get<TakeoffItem>(`/takeoff/${id}`),

  create: (projectId: string, data: Omit<TakeoffItem, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>) =>
    api.post<TakeoffItem>(`/projects/${projectId}/takeoff`, data),

  update: (id: string, data: Partial<TakeoffItem>) => api.patch<TakeoffItem>(`/takeoff/${id}`, data),

  delete: (id: string) => api.delete(`/takeoff/${id}`),

  bulkCreate: (projectId: string, items: Omit<TakeoffItem, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>[]) =>
    api.post<TakeoffItem[]>(`/projects/${projectId}/takeoff/bulk`, { items }),

  bulkUpdate: (projectId: string, updates: { id: string; data: Partial<TakeoffItem> }[]) =>
    api.patch<TakeoffItem[]>(`/projects/${projectId}/takeoff/bulk`, { updates }),

  getSummary: (projectId: string) => api.get<TakeoffSummary[]>(`/projects/${projectId}/takeoff/summary`),

  getByTrade: (projectId: string, trade: TradeCategory) => api.get<TakeoffItem[]>(`/projects/${projectId}/takeoff/trade/${trade}`),

  getTemplates: () => api.get<TakeoffTemplate[]>('/takeoff/templates'),

  createTemplate: (data: Omit<TakeoffTemplate, 'id'>) => api.post<TakeoffTemplate>('/takeoff/templates', data),

  applyTemplate: (projectId: string, templateId: string) =>
    api.post<TakeoffItem[]>(`/projects/${projectId}/takeoff/apply-template`, { templateId }),

  linkDrawing: (takeoffId: string, drawingId: string, bbox?: { x: number; y: number; width: number; height: number; page: number }) =>
    api.post(`/takeoff/${takeoffId}/drawing-links`, { drawingId, bbox }),

  unlinkDrawing: (takeoffId: string, drawingId: string) => api.delete(`/takeoff/${takeoffId}/drawing-links/${drawingId}`),

  linkModelElement: (takeoffId: string, modelElementId: string) =>
    api.post(`/takeoff/${takeoffId}/model-links`, { modelElementId }),

  unlinkModelElement: (takeoffId: string, modelElementId: string) =>
    api.delete(`/takeoff/${takeoffId}/model-links/${modelElementId}`),

  export: (projectId: string, options: ExportTakeoffOptions) =>
    api.get(`/projects/${projectId}/takeoff/export`, { params: options, responseType: 'blob' }),

  import: (projectId: string, file: File, format: 'csv' | 'xlsx') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    return api.upload<TakeoffItem[]>(`/projects/${projectId}/takeoff/import`, formData);
  },

  getFormulas: (trade: TradeCategory) => api.get<Record<string, string>>(`/takeoff/formulas/${trade}`),

  saveFormula: (trade: TradeCategory, itemCode: string, formula: string) =>
    api.post(`/takeoff/formulas/${trade}/${itemCode}`, { formula }),
};