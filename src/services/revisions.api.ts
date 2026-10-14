import { api } from './api';
import type { Revision, RevisionComparison, RevisionChange, VisualEvidence, EvidenceAnnotation } from '@/types/revision';

export const revisionsApi = {
  list: (projectId: string, params?: { type?: string; status?: string; page?: number; limit?: number }) =>
    api.get<{ data: Revision[]; total: number }>(`/projects/${projectId}/revisions`, { params }),

  get: (id: string) => api.get<Revision>(`/revisions/${id}`),

  create: (projectId: string, data: Omit<Revision, 'id' | 'projectId' | 'submittedBy' | 'submittedAt' | 'reviewedAt' | 'approvedAt' | 'implementedAt' | 'impacts'>) =>
    api.post<Revision>(`/projects/${projectId}/revisions`, data),

  update: (id: string, data: Partial<Revision>) => api.patch<Revision>(`/revisions/${id}`, data),

  delete: (id: string) => api.delete(`/revisions/${id}`),

  submit: (id: string) => api.post<Revision>(`/revisions/${id}/submit`),

  review: (id: string, data: { status: 'approved' | 'rejected'; comments?: string }) =>
    api.post<Revision>(`/revisions/${id}/review`, data),

  implement: (id: string) => api.post<Revision>(`/revisions/${id}/implement`),

  getComparison: (projectId: string, fromVersion: number, toVersion: number) =>
    api.get<RevisionComparison>(`/projects/${projectId}/revisions/compare`, { params: { fromVersion, toVersion } }),

  getChanges: (revisionId: string) => api.get<RevisionChange[]>(`/revisions/${revisionId}/changes`),

  addChange: (revisionId: string, data: Omit<RevisionChange, 'id' | 'revisionId'>) =>
    api.post<RevisionChange>(`/revisions/${revisionId}/changes`, data),

  updateChange: (changeId: string, data: Partial<RevisionChange>) => api.patch<RevisionChange>(`/revisions/changes/${changeId}`, data),

  deleteChange: (changeId: string) => api.delete(`/revisions/changes/${changeId}`),

  addVisualEvidence: (changeId: string, evidence: Omit<VisualEvidence, 'annotations'> & { annotations: Omit<EvidenceAnnotation, 'id'>[] }) =>
    api.post<VisualEvidence>(`/revisions/changes/${changeId}/evidence`, evidence),

  updateVisualEvidence: (evidenceId: string, data: Partial<VisualEvidence>) => api.patch<VisualEvidence>(`/revisions/evidence/${evidenceId}`, data),

  addAnnotation: (evidenceId: string, annotation: Omit<EvidenceAnnotation, 'id'>) =>
    api.post<EvidenceAnnotation>(`/revisions/evidence/${evidenceId}/annotations`, annotation),

  updateAnnotation: (annotationId: string, data: Partial<EvidenceAnnotation>) => api.patch<EvidenceAnnotation>(`/revisions/annotations/${annotationId}`, data),

  deleteAnnotation: (annotationId: string) => api.delete(`/revisions/annotations/${annotationId}`),

  getImpacts: (revisionId: string) => api.get<Revision['impacts']>(`/revisions/${revisionId}/impacts`),

  export: (projectId: string, format: 'csv' | 'xlsx' | 'pdf') =>
    api.get(`/projects/${projectId}/revisions/export`, { params: { format }, responseType: 'blob' }),

  getVersions: (projectId: string) => api.get<{ version: number; name: string; date: string; revisionCount: number }[]>(`/projects/${projectId}/revisions/versions`),
};