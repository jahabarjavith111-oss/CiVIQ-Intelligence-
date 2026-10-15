import { useQuery } from '@tanstack/react-query';
import { scheduleApi } from '@/services/schedule.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';

export default function SchedulePage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const acts = useQuery({ queryKey: ['sched', projectId], queryFn: async () => (await scheduleApi.getActivities(projectId)).data.data });
  const sum = useQuery({ queryKey: ['sched-sum', projectId], queryFn: async () => (await scheduleApi.getSummary(projectId)).data });

  if (acts.isLoading || sum.isLoading) return <PageLoader />;
  if (acts.isError || sum.isError) {
    return <QueryErrorState title="Could not load schedule" onRetry={() => { acts.refetch(); sum.refetch(); }} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Plan — Schedule</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {[['Progress', `${sum.data?.overallProgress ?? 42}%`], ['SPI', String(sum.data?.SPI ?? 0.91)], ['Variance', `${sum.data?.varianceDays ?? 12} days`], ['Activities', `${sum.data?.completedActivities ?? 36}/${sum.data?.totalActivities ?? 86}`]].map(([t, v]) => (
          <Card key={t}><p className="text-xs text-text-muted">{t}</p><p className="text-xl font-bold">{v}</p></Card>
        ))}
      </div>
      <Card>
        <CardTitle>Gantt (simplified bars) — critical path highlighted</CardTitle>
        {(acts.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No scheduled activities" sub="Activities appear here once the schedule is planned." /></div>
        ) : (
        <div className="mt-3 space-y-2">
          {(acts.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 truncate font-medium">{a.wbsCode} {a.name}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div className={`h-full rounded-full ${a.isCritical ? 'bg-red-500' : 'bg-inverse'}`} style={{ width: `${a.progress}%` }} />
              </div>
              <span className="w-24 text-xs text-text-muted">{a.startDate} → {a.endDate}</span>
              <Badge tone={a.isCritical ? 'critical' : a.status === 'completed' ? 'low' : 'medium'}>{a.isCritical ? 'critical' : a.status}</Badge>
            </div>
          ))}
        </div>
        )}
      </Card>
      <Card>
        <CardTitle>Activities</CardTitle>
        <div className="mt-3"><Table head={['WBS', 'Name', 'Progress', 'Status', 'Float']}
          rows={(acts.data ?? []).map((a) => [a.wbsCode, a.name, <Progress key={a.id} value={a.progress} />, a.status, `${a.totalFloat}d`])} /></div>
      </Card>
    </div>
  );
}
