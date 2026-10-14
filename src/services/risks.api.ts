import { api } from './api';
import type { Risk, RiskSummary, RiskHeatmapData, Mitigation, RiskTrigger, RelatedEntity, MonteCarloResult, RiskCategory } from '@/types/risk';

export const risksApi = {
  list: (projectId: string, params?: { category?: RiskCategory; status?: string; rating?: string; page?: number; limit?: number }) =>
    api.get<{ data: Risk[]; total: number }>(`/projects/${projectId}/risks`, { params }),

  get: (id: string) => api.get<Risk>(`/risks/${id}`),

  create: (projectId: string, data: Omit<Risk, 'id' | 'projectId' | 'score' | 'rating' | 'identifiedBy' | 'identifiedAt' | 'assessedAt' | 'mitigations' | 'triggers' | 'relatedEntities' | 'monteCarlo' | 'createdAt' | 'updatedAt'>) =>
    api.post<Risk>(`/projects/${projectId}/risks`, data),

  update: (id: string, data: Partial<Risk>) => api.patch<Risk>(`/risks/${id}`, data),

  delete: (id: string) => api.delete(`/risks/${id}`),

  assess: (id: string, data: { probability: Risk['probability']; impact: Risk['impact']; assessedBy: string }) =>
    api.post<Risk>(`/risks/${id}/assess`, data),

  getSummary: (projectId: string) => api.get<RiskSummary>(`/projects/${projectId}/risks/summary`),

  getHeatmap: (projectId: string) => api.get<RiskHeatmapData[][]>(`/projects/${projectId}/risks/heatmap`),

  getTrends: (projectId: string, params?: { period?: string; interval?: 'week' | 'month' }) =>
    api.get<{ date: string; totalScore: number; count: number; byCategory: Record<string, number> }[]>(`/projects/${projectId}/risks/trends`, { params }),

  getMitigations: (riskId: string) => api.get<Mitigation[]>(`/risks/${riskId}/mitigations`),

  addMitigation: (riskId: string, data: Omit<Mitigation, 'id' | 'riskId' | 'residualScore' | 'completedAt'>) =>
    api.post<Mitigation>(`/risks/${riskId}/mitigations`, data),

  updateMitigation: (mitigationId: string, data: Partial<Mitigation>) => api.patch<Mitigation>(`/risks/mitigations/${mitigationId}`, data),

  completeMitigation: (mitigationId: string, residualScore?: number) =>
    api.post(`/risks/mitigations/${mitigationId}/complete`, { residualScore }),

  getTriggers: (riskId: string) => api.get<RiskTrigger[]>(`/risks/${riskId}/triggers`),

  addTrigger: (riskId: string, data: Omit<RiskTrigger, 'id' | 'riskId' | 'detectedAt'>) =>
    api.post<RiskTrigger>(`/risks/${riskId}/triggers`, data),

  updateTrigger: (triggerId: string, data: Partial<RiskTrigger>) => api.patch<RiskTrigger>(`/risks/triggers/${triggerId}`, data),

  activateTrigger: (triggerId: string) => api.post(`/risks/triggers/${triggerId}/activate`),

  getRelatedEntities: (riskId: string) => api.get<RelatedEntity[]>(`/risks/${riskId}/related-entities`),

  addRelatedEntity: (riskId: string, data: Omit<RelatedEntity, 'id'>) =>
    api.post<RelatedEntity>(`/risks/${riskId}/related-entities`, data),

  removeRelatedEntity: (riskId: string, entityId: string) => api.delete(`/risks/${riskId}/related-entities/${entityId}`),

  runMonteCarlo: (projectId: string, params?: { runs?: number; seed?: number }) =>
    api.post<MonteCarloResult>(`/projects/${projectId}/risks/monte-carlo`, params),

  getMonteCarloResults: (projectId: string) => api.get<MonteCarloResult[]>(`/projects/${projectId}/risks/monte-carlo/results`),

  export: (projectId: string, format: 'csv' | 'xlsx' | 'pdf') =>
    api.get(`/projects/${projectId}/risks/export`, { params: { format }, responseType: 'blob' }),

  import: (projectId: string, file: File, format: 'csv' | 'xlsx') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    return api.upload(`/projects/${projectId}/risks/import`, formData);
  },

  getCategories: () => api.get<{ category: RiskCategory; label: string; color: string }[]>('/risks/categories'),
};