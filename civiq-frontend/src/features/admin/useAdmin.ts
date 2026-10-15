import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/admin.api';
import { useUiStore } from '@/store/uiStore';
import { apiErrorMessage } from '@/utils/errors';

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin', 'overview'], queryFn: async () => (await adminApi.overview()).data });
}

export function useAdminUsers(params?: { search?: string; role?: string; status?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => (await adminApi.users({ ...params, limit: 20 })).data,
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  return useMutation({
    mutationFn: (id: string) => adminApi.suspend(id).then((r) => r.data),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
      toast({ title: `${u.email} suspended`, variant: 'success' });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, 'Suspend failed'), variant: 'error' }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  return useMutation({
    mutationFn: (id: string) => adminApi.activate(id).then((r) => r.data),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
      toast({ title: `${u.email} activated`, variant: 'success' });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, 'Activate failed'), variant: 'error' }),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUser(id, { role }).then((r) => r.data),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: `${u.email} is now ${u.role}`, variant: 'success' });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, 'Role change failed'), variant: 'error' }),
  });
}

export function useAdminProjects(status?: string) {
  return useQuery({
    queryKey: ['admin', 'projects', status],
    queryFn: async () => (await adminApi.projects({ status: status || undefined, limit: 20 })).data,
  });
}

export function useAdminAi(status?: string) {
  const analyses = useQuery({
    queryKey: ['admin', 'ai-analyses', status],
    queryFn: async () => (await adminApi.aiAnalyses({ status: status || undefined, limit: 20 })).data,
  });
  const usage = useQuery({
    queryKey: ['admin', 'ai-usage'],
    queryFn: async () => (await adminApi.aiUsage(14)).data,
  });
  return { analyses, usage };
}

export function useAdminHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => (await adminApi.health()).data,
    refetchInterval: 30000,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await adminApi.settings()).data,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      adminApi.updateSetting(key, value).then((r) => r.data),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast({ title: `${s.key} updated`, variant: 'success' });
    },
    onError: (e) => toast({ title: apiErrorMessage(e, 'Setting update failed'), variant: 'error' }),
  });
}

export function useAdminAudit(params?: { actor?: string; action?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: async () => (await adminApi.audit({ ...params, limit: 20 })).data,
  });
}

export function useAdminBilling() {
  return useQuery({
    queryKey: ['admin', 'billing'],
    queryFn: async () => (await adminApi.billing()).data,
  });
}
