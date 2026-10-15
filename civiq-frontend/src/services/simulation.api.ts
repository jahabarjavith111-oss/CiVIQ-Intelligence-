import { api } from './api';

export interface SimulationScenario {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  inputs: {
    steelPercent?: number;
    labourPercent?: number;
    durationDays?: number;
    concretePercent?: number;
    [key: string]: number | undefined;
  };
  results?: {
    costImpact: { value: number; percent: number; breakdown: { category: string; delta: number }[] };
    scheduleImpact: { days: number; criticalPathChanged: boolean; newFinish?: string };
    riskImpact: { scoreDelta: number; newRisks: string[] };
    materialImpact: { items: { trade: string; delta: number; unit: string }[] };
  };
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdBy: string;
  createdAt: string;
}

export const simulationApi = {
  list: (projectId: string) => api.get<SimulationScenario[]>(`/projects/${projectId}/simulations`),
  get: (id: string) => api.get<SimulationScenario>(`/simulations/${id}`),
  create: (projectId: string, data: Omit<SimulationScenario, 'id' | 'projectId' | 'results' | 'status' | 'createdBy' | 'createdAt'>) =>
    api.post<SimulationScenario>(`/projects/${projectId}/simulations`, data),
  run: (id: string) => api.post<SimulationScenario>(`/simulations/${id}/run`),
  delete: (id: string) => api.delete(`/simulations/${id}`),
  compare: (projectId: string, ids: string[]) =>
    api.post(`/projects/${projectId}/simulations/compare`, { ids }),
};
