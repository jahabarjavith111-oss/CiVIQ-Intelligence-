import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/services/projects.api';
import { useProjectStore } from '@/store/projectStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { CreateProjectData } from '@/types/project';

export function useProject(projectId?: string) {
  const store = useProjectStore();
  const workspace = useWorkspaceStore();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: async () => (await projectsApi.list()).data.data,
  });

  const detailQuery = useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => (await projectsApi.get(projectId!)).data,
    enabled: !!projectId,
  });

  const healthQuery = useQuery({
    queryKey: ['projects', projectId, 'health'],
    queryFn: async () => (await projectsApi.getHealth(projectId!)).data,
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: (data: CreateProjectData) => projectsApi.create(data).then((r) => r.data),
    onSuccess: (p) => {
      store.upsertProject(p);
      workspace.setActiveProject(p.id);
      workspace.pushRecentProject(p.id);
      qc.invalidateQueries({ queryKey: ['projects', 'list'] });
    },
  });

  return { ...store, listQuery, detailQuery, healthQuery, create };
}
