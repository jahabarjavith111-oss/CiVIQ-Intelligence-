import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/services/projects.api';
import { costApi } from '@/services/cost.api';
import { scheduleApi } from '@/services/schedule.api';
import { risksApi } from '@/services/risks.api';
import { coordinationApi } from '@/services/coordination.api';

export function useDashboard(projectId?: string) {
  const health = useQuery({
    queryKey: ['dashboard', projectId, 'health'],
    queryFn: async () => (await projectsApi.getHealth(projectId!)).data,
    enabled: !!projectId,
  });
  const budget = useQuery({
    queryKey: ['dashboard', projectId, 'budget'],
    queryFn: async () => (await costApi.getBudgetSummary(projectId!)).data,
    enabled: !!projectId,
  });
  const schedule = useQuery({
    queryKey: ['dashboard', projectId, 'schedule'],
    queryFn: async () => (await scheduleApi.getSummary(projectId!)).data,
    enabled: !!projectId,
  });
  const risks = useQuery({
    queryKey: ['dashboard', projectId, 'risks'],
    queryFn: async () => (await risksApi.getSummary(projectId!)).data,
    enabled: !!projectId,
  });
  const conflicts = useQuery({
    queryKey: ['dashboard', projectId, 'conflicts'],
    queryFn: async () => (await coordinationApi.getSummary(projectId!)).data,
    enabled: !!projectId,
  });
  return { health, budget, schedule, risks, conflicts };
}
