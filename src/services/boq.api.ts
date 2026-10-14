import { api } from './api';
import type { WorkPackage, BOQItem, RateAnalysis, BOQSummary, CreateWorkPackageData, CreateBOQItemData, RateComponent } from '@/types/boq';

export const boqApi = {
  getWorkPackages: (projectId: string) => api.get<WorkPackage[]>(`/projects/${projectId}/boq/work-packages`),

  getWorkPackage: (id: string) => api.get<WorkPackage>(`/boq/work-packages/${id}`),

  createWorkPackage: (projectId: string, data: CreateWorkPackageData) =>
    api.post<WorkPackage>(`/projects/${projectId}/boq/work-packages`, data),

  updateWorkPackage: (id: string, data: Partial<WorkPackage>) => api.patch<WorkPackage>(`/boq/work-packages/${id}`, data),

  deleteWorkPackage: (id: string) => api.delete(`/boq/work-packages/${id}`),

  reorderWorkPackages: (projectId: string, packageIds: string[]) =>
    api.post(`/projects/${projectId}/boq/work-packages/reorder`, { packageIds }),

  getItems: (workPackageId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: BOQItem[]; total: number }>(`/boq/work-packages/${workPackageId}/items`, { params }),

  getItem: (id: string) => api.get<BOQItem>(`/boq/items/${id}`),

  createItem: (workPackageId: string, data: CreateBOQItemData) =>
    api.post<BOQItem>(`/boq/work-packages/${workPackageId}/items`, data),

  updateItem: (id: string, data: Partial<BOQItem>) => api.patch<BOQItem>(`/boq/items/${id}`, data),

  deleteItem: (id: string) => api.delete(`/boq/items/${id}`),

  bulkUpdateItems: (workPackageId: string, updates: { id: string; data: Partial<BOQItem> }[]) =>
    api.patch<BOQItem[]>(`/boq/work-packages/${workPackageId}/items/bulk`, { updates }),

  getRateAnalysis: (boqItemId: string) => api.get<RateAnalysis>(`/boq/items/${boqItemId}/rate-analysis`),

  createRateAnalysis: (boqItemId: string, data: Omit<RateAnalysis, 'id' | 'boqItemId' | 'version' | 'createdAt' | 'updatedAt'>) =>
    api.post<RateAnalysis>(`/boq/items/${boqItemId}/rate-analysis`, data),

  updateRateAnalysis: (id: string, data: Partial<RateAnalysis>) => api.patch<RateAnalysis>(`/boq/rate-analysis/${id}`, data),

  addRateComponent: (rateAnalysisId: string, component: Omit<RateComponent, 'id'>) =>
    api.post<RateComponent>(`/boq/rate-analysis/${rateAnalysisId}/components`, component),

  updateRateComponent: (rateAnalysisId: string, componentId: string, data: Partial<RateComponent>) =>
    api.patch<RateComponent>(`/boq/rate-analysis/${rateAnalysisId}/components/${componentId}`, data),

  deleteRateComponent: (rateAnalysisId: string, componentId: string) =>
    api.delete(`/boq/rate-analysis/${rateAnalysisId}/components/${componentId}`),

  approveRateAnalysis: (id: string) => api.post(`/boq/rate-analysis/${id}/approve`),

  getSummary: (projectId: string) => api.get<BOQSummary>(`/projects/${projectId}/boq/summary`),

  export: (projectId: string, format: 'csv' | 'xlsx' | 'pdf') =>
    api.get(`/projects/${projectId}/boq/export`, { params: { format }, responseType: 'blob' }),

  import: (projectId: string, file: File, format: 'csv' | 'xlsx') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    return api.upload(`/projects/${projectId}/boq/import`, formData);
  },

  version: (projectId: string, name: string) =>
    api.post(`/projects/${projectId}/boq/versions`, { name }),

  getVersions: (projectId: string) => api.get<{ id: string; name: string; createdAt: string; createdBy: string }[]>(`/projects/${projectId}/boq/versions`),

  restoreVersion: (projectId: string, versionId: string) =>
    api.post(`/projects/${projectId}/boq/versions/${versionId}/restore`),

  linkTakeoff: (boqItemId: string, takeoffItemId: string) =>
    api.post(`/boq/items/${boqItemId}/takeoff-links`, { takeoffItemId }),

  unlinkTakeoff: (boqItemId: string, takeoffItemId: string) =>
    api.delete(`/boq/items/${boqItemId}/takeoff-links/${takeoffItemId}`),

  linkModelElement: (boqItemId: string, modelElementId: string) =>
    api.post(`/boq/items/${boqItemId}/model-links`, { modelElementId }),

  unlinkModelElement: (boqItemId: string, modelElementId: string) =>
    api.delete(`/boq/items/${boqItemId}/model-links/${modelElementId}`),
};