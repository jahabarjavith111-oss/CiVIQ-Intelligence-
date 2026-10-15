import { api } from './api';
import type { Model3D, Floor, ModelElement, ModelConflict, ModelViewState, RevisionComparison, Measurement, SectionPlane } from '@/types/model3d';

export const model3dApi = {
  list: (projectId: string) => api.get<Model3D[]>(`/projects/${projectId}/models`),

  get: (id: string) => api.get<Model3D>(`/models/${id}`),

  upload: (projectId: string, file: File, name: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    return api.upload<Model3D>(`/projects/${projectId}/models`, formData);
  },

  update: (id: string, data: Partial<Model3D>) => api.patch<Model3D>(`/models/${id}`, data),

  delete: (id: string) => api.delete(`/models/${id}`),

  getFloors: (modelId: string) => api.get<Floor[]>(`/models/${modelId}/floors`),

  getFloor: (modelId: string, floorId: string) => api.get<Floor>(`/models/${modelId}/floors/${floorId}`),

  getElements: (modelId: string, params?: { floorId?: string; category?: string; visible?: boolean }) =>
    api.get<ModelElement[]>(`/models/${modelId}/elements`, { params }),

  getElement: (modelId: string, elementId: string) => api.get<ModelElement>(`/models/${modelId}/elements/${elementId}`),

  getConflicts: (modelId: string, params?: { severity?: string; status?: string }) =>
    api.get<ModelConflict[]>(`/models/${modelId}/conflicts`, { params }),

  runClashDetection: (modelId: string, params?: { tolerance?: number; categories?: string[] }) =>
    api.post<{ runId: string; conflicts: ModelConflict[] }>(`/models/${modelId}/clash-detection`, params),

  getViewState: (modelId: string) => api.get<ModelViewState>(`/models/${modelId}/view-state`),

  saveViewState: (modelId: string, state: ModelViewState) => api.put<ModelViewState>(`/models/${modelId}/view-state`, state),

  compareRevisions: (modelId: string, fromVersion: number, toVersion: number) =>
    api.get<RevisionComparison>(`/models/${modelId}/compare`, { params: { fromVersion, toVersion } }),

  getMeasurements: (modelId: string) => api.get<Measurement[]>(`/models/${modelId}/measurements`),

  saveMeasurement: (modelId: string, measurement: Measurement) =>
    api.post<Measurement>(`/models/${modelId}/measurements`, measurement),

  deleteMeasurement: (modelId: string, measurementId: string) =>
    api.delete(`/models/${modelId}/measurements/${measurementId}`),

  getSectionPlanes: (modelId: string) => api.get<SectionPlane[]>(`/models/${modelId}/section-planes`),

  saveSectionPlane: (modelId: string, plane: SectionPlane) =>
    api.post<SectionPlane>(`/models/${modelId}/section-planes`, plane),

  updateSectionPlane: (modelId: string, planeId: string, plane: Partial<SectionPlane>) =>
    api.patch<SectionPlane>(`/models/${modelId}/section-planes/${planeId}`, plane),

  deleteSectionPlane: (modelId: string, planeId: string) =>
    api.delete(`/models/${modelId}/section-planes/${planeId}`),

  export: (modelId: string, format: 'gltf' | 'glb' | 'ifc' | 'obj') =>
    api.get(`/models/${modelId}/export`, { params: { format }, responseType: 'blob' }),

  getElementQuantity: (modelId: string, elementId: string) =>
    api.get(`/models/${modelId}/elements/${elementId}/quantity`),

  getElementCost: (modelId: string, elementId: string) =>
    api.get(`/models/${modelId}/elements/${elementId}/cost`),

  getElementSchedule: (modelId: string, elementId: string) =>
    api.get(`/models/${modelId}/elements/${elementId}/schedule`),

  linkToBOQ: (modelId: string, elementId: string, boqItemId: string) =>
    api.post(`/models/${modelId}/elements/${elementId}/boq-links`, { boqItemId }),

  unlinkFromBOQ: (modelId: string, elementId: string, boqItemId: string) =>
    api.delete(`/models/${modelId}/elements/${elementId}/boq-links/${boqItemId}`),
};