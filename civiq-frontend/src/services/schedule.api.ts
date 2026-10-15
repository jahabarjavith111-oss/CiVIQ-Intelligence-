import { api } from './api';
import type { ScheduleActivity, ScheduleCalendar, ScheduleBaseline, CriticalPath, ScheduleSummary, ActivityDependency, ActivityConstraint, ActivityResource, CalendarException } from '@/types/schedule';

export const scheduleApi = {
  getActivities: (projectId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: ScheduleActivity[]; total: number }>(`/projects/${projectId}/schedule/activities`, { params }),

  getActivity: (id: string) => api.get<ScheduleActivity>(`/schedule/activities/${id}`),

  createActivity: (projectId: string, data: Omit<ScheduleActivity, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) =>
    api.post<ScheduleActivity>(`/projects/${projectId}/schedule/activities`, data),

  updateActivity: (id: string, data: Partial<ScheduleActivity>) => api.patch<ScheduleActivity>(`/schedule/activities/${id}`, data),

  deleteActivity: (id: string) => api.delete(`/schedule/activities/${id}`),

  bulkUpdateActivities: (projectId: string, updates: { id: string; data: Partial<ScheduleActivity> }[]) =>
    api.patch<ScheduleActivity[]>(`/projects/${projectId}/schedule/activities/bulk`, { updates }),

  getDependencies: (projectId: string) => api.get<ActivityDependency[]>(`/projects/${projectId}/schedule/dependencies`),

  createDependency: (projectId: string, data: Omit<ActivityDependency, 'id'>) =>
    api.post<ActivityDependency>(`/projects/${projectId}/schedule/dependencies`, data),

  updateDependency: (id: string, data: Partial<ActivityDependency>) => api.patch<ActivityDependency>(`/schedule/dependencies/${id}`, data),

  deleteDependency: (id: string) => api.delete(`/schedule/dependencies/${id}`),

  getConstraints: (projectId: string) => api.get<ActivityConstraint[]>(`/projects/${projectId}/schedule/constraints`),

  createConstraint: (projectId: string, data: Omit<ActivityConstraint, 'id'>) =>
    api.post<ActivityConstraint>(`/projects/${projectId}/schedule/constraints`, data),

  updateConstraint: (id: string, data: Partial<ActivityConstraint>) => api.patch<ActivityConstraint>(`/schedule/constraints/${id}`, data),

  deleteConstraint: (id: string) => api.delete(`/schedule/constraints/${id}`),

  getResources: (activityId: string) => api.get<ActivityResource[]>(`/schedule/activities/${activityId}/resources`),

  addResource: (activityId: string, data: Omit<ActivityResource, 'id' | 'activityId'>) =>
    api.post<ActivityResource>(`/schedule/activities/${activityId}/resources`, data),

  updateResource: (resourceId: string, data: Partial<ActivityResource>) => api.patch<ActivityResource>(`/schedule/resources/${resourceId}`, data),

  deleteResource: (resourceId: string) => api.delete(`/schedule/resources/${resourceId}`),

  getCalendars: (projectId: string) => api.get<ScheduleCalendar[]>(`/projects/${projectId}/schedule/calendars`),

  getCalendar: (id: string) => api.get<ScheduleCalendar>(`/schedule/calendars/${id}`),

  createCalendar: (projectId: string, data: Omit<ScheduleCalendar, 'id' | 'projectId'>) =>
    api.post<ScheduleCalendar>(`/projects/${projectId}/schedule/calendars`, data),

  updateCalendar: (id: string, data: Partial<ScheduleCalendar>) => api.patch<ScheduleCalendar>(`/schedule/calendars/${id}`, data),

  addCalendarException: (calendarId: string, exception: Omit<CalendarException, 'id' | 'calendarId'>) =>
    api.post<CalendarException>(`/schedule/calendars/${calendarId}/exceptions`, exception),

  updateCalendarException: (calendarId: string, exceptionId: string, data: Partial<CalendarException>) =>
    api.patch<CalendarException>(`/schedule/calendars/${calendarId}/exceptions/${exceptionId}`, data),

  deleteCalendarException: (calendarId: string, exceptionId: string) =>
    api.delete(`/schedule/calendars/${calendarId}/exceptions/${exceptionId}`),

  calculateSchedule: (projectId: string) => api.post<{ criticalPath: CriticalPath; activities: ScheduleActivity[] }>(`/projects/${projectId}/schedule/calculate`),

  getCriticalPath: (projectId: string) => api.get<CriticalPath>(`/projects/${projectId}/schedule/critical-path`),

  getSummary: (projectId: string) => api.get<ScheduleSummary>(`/projects/${projectId}/schedule/summary`),

  getBaselines: (projectId: string) => api.get<ScheduleBaseline[]>(`/projects/${projectId}/schedule/baselines`),

  createBaseline: (projectId: string, data: Omit<ScheduleBaseline, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'isCurrent'>) =>
    api.post<ScheduleBaseline>(`/projects/${projectId}/schedule/baselines`, data),

  setCurrentBaseline: (projectId: string, baselineId: string) =>
    api.post(`/projects/${projectId}/schedule/baselines/${baselineId}/set-current`),

  compareBaselines: (projectId: string, baselineId1: string, baselineId2: string) =>
    api.get(`/projects/${projectId}/schedule/baselines/compare`, { params: { baselineId1, baselineId2 } }),

  export: (projectId: string, format: 'csv' | 'xlsx' | 'pdf' | 'xml') =>
    api.get(`/projects/${projectId}/schedule/export`, { params: { format }, responseType: 'blob' }),

  import: (projectId: string, file: File, format: 'csv' | 'xlsx' | 'xml') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    return api.upload(`/projects/${projectId}/schedule/import`, formData);
  },

  getGanttData: (projectId: string, params?: { startDate?: string; endDate?: string; zoom?: string }) =>
    api.get(`/projects/${projectId}/schedule/gantt`, { params }),
};