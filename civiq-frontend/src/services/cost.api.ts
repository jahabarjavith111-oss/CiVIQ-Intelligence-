import { api } from './api';
import type { CostBreakdown, BudgetSummary, CostVariance, ForecastScenario, ForecastAssumption, CostCategory } from '@/types/cost';

export const costApi = {
  getBreakdown: (projectId: string, params?: { category?: CostCategory; period?: string }) =>
    api.get<CostBreakdown[]>(`/projects/${projectId}/cost/breakdown`, { params }),

  getBudgetSummary: (projectId: string) => api.get<BudgetSummary>(`/projects/${projectId}/cost/budget`),

  getVariances: (projectId: string, params?: { category?: CostCategory; period?: string; status?: string }) =>
    api.get<CostVariance[]>(`/projects/${projectId}/cost/variances`, { params }),

  createVariance: (projectId: string, data: Omit<CostVariance, 'id' | 'projectId' | 'createdAt' | 'resolvedAt'>) =>
    api.post<CostVariance>(`/projects/${projectId}/cost/variances`, data),

  updateVariance: (id: string, data: Partial<CostVariance>) => api.patch<CostVariance>(`/cost/variances/${id}`, data),

  resolveVariance: (id: string, explanation: string) => api.post(`/cost/variances/${id}/resolve`, { explanation }),

  getForecastScenarios: (projectId: string) => api.get<ForecastScenario[]>(`/projects/${projectId}/cost/forecasts`),

  createForecastScenario: (projectId: string, data: Omit<ForecastScenario, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'results'>) =>
    api.post<ForecastScenario>(`/projects/${projectId}/cost/forecasts`, data),

  runForecast: (scenarioId: string) => api.post<{ results: ForecastScenario['results'] }>(`/cost/forecasts/${scenarioId}/run`),

  updateForecastAssumptions: (scenarioId: string, assumptions: ForecastAssumption[]) =>
    api.patch<ForecastScenario>(`/cost/forecasts/${scenarioId}`, { assumptions }),

  deleteForecastScenario: (id: string) => api.delete(`/cost/forecasts/${id}`),

  setBaselineForecast: (id: string) => api.post(`/cost/forecasts/${id}/set-baseline`),

  getSCurve: (projectId: string, params?: { baselineId?: string; forecastId?: string }) =>
    api.get<{ planned: { period: string; value: number }[]; actual: { period: string; value: number }[]; forecast: { period: string; value: number }[] }>(`/projects/${projectId}/cost/s-curve`, { params }),

  getCashFlow: (projectId: string, params?: { period?: string }) =>
    api.get<{ period: string; inflow: number; outflow: number; net: number }[]>(`/projects/${projectId}/cost/cash-flow`, { params }),

  export: (projectId: string, format: 'csv' | 'xlsx' | 'pdf', params?: { category?: CostCategory; period?: string }) =>
    api.get(`/projects/${projectId}/cost/export`, { params: { format, ...params }, responseType: 'blob' }),

  getCategories: () => api.get<{ category: CostCategory; label: string; color: string }[]>('/cost/categories'),
};