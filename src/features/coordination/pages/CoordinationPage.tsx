import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coordinationApi } from '@/services/coordination.api';
import { teamApi } from '@/services/team.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { downloadCsv } from '@/utils/export';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Download } from 'lucide-react';

export default function CoordinationPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.pushToast);
  const list = useQuery({ queryKey: ['conf', projectId], queryFn: async () => (await coordinationApi.getConflicts(projectId)).data.data });
  const sum = useQuery({ queryKey: ['conf-sum', projectId], queryFn: async () => (await coordinationApi.getSummary(projectId)).data });
  const team = useQuery({ queryKey: ['team', projectId], queryFn: async () => (await teamApi.list(projectId)).data });

  const run = useMutation({
    mutationFn: () => coordinationApi.runClashDetection(projectId, { modelId: 'mdl-1', tolerance: 0.05 }).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['conf', projectId] });
      toast({ title: `Clash run ${res.runId}`, description: `${res.statistics.totalClashes} total • ${res.statistics.newClashes} new`, variant: 'success' });
    },
    onError: () => toast({ title: 'Clash detection failed', variant: 'error' }),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => coordinationApi.updateConflictStatus(id, 'resolved', 'Resolved from coordination board').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conf', projectId] });
      qc.invalidateQueries({ queryKey: ['conf-sum', projectId] });
      toast({ title: 'Conflict resolved', variant: 'success' });
    },
    onError: () => toast({ title: 'Could not resolve conflict', variant: 'error' }),
  });

  const assign = useMutation({
    mutationFn: async (id: string) => {
      const members = team.data ?? [];
      const assignee = members.find((m) => m.projectRole === 'manager' || m.projectRole === 'engineer') ?? members[0];
      if (!assignee) throw new Error('No team members to assign');
      await coordinationApi.assignConflict(id, assignee.id);
      return assignee;
    },
    onSuccess: (assignee) => {
      qc.invalidateQueries({ queryKey: ['conf', projectId] });
      toast({ title: `Assigned to ${assignee.name}`, variant: 'success' });
    },
    onError: () => toast({ title: 'Could not assign conflict', variant: 'error' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Coordinate — {sum.data?.total ?? 23} conflicts ({sum.data?.openCritical ?? 4} critical)</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv('conflicts.csv', (list.data ?? []).map((c) => [c.id, c.type, c.severity, c.status, c.title]), ['id', 'type', 'severity', 'status', 'title'])}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button loading={run.isPending} onClick={() => run.mutate()}>Run clash detection</Button>
        </div>
      </div>
      {run.data && (
        <Card><CardTitle>Last run {run.data.runId} — {run.data.runAt}</CardTitle>
          <p className="mt-1 text-sm text-text-muted">{run.data.statistics.totalClashes} clashes • {run.data.statistics.newClashes} new • {run.data.statistics.resolvedClashes} resolved since last run</p></Card>
      )}
      {list.isLoading ? <PageLoader /> : list.isError ? (
        <QueryErrorState title="Could not load conflicts" onRetry={() => list.refetch()} />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="No open conflicts" sub="Run clash detection to find coordination issues." />
      ) : (
        <div className="grid gap-3">
          {(list.data ?? []).map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={c.severity}>{c.severity}</Badge>
                <Badge tone="medium">{c.type}</Badge>
                <Badge tone="low">{c.status}</Badge>
                <p className="font-semibold">{c.title}</p>
              </div>
              <p className="mt-1 text-sm text-text-muted">{c.description}</p>
              {c.assignedTo && <p className="mt-1 text-xs text-text-muted">Assigned to {c.assignedTo}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" loading={assign.isPending} onClick={() => assign.mutate(c.id)}>Assign</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${projectId}/model-3d`)}>View in 3D</Button>
                <Button size="sm" loading={resolve.isPending} disabled={c.status === 'resolved'} onClick={() => resolve.mutate(c.id)}>Resolve</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Card><CardTitle>Conflict matrix (Arch / Struct / MEP / Elec / Plumb)</CardTitle>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-xs">
          {['—', 'S', 'M', 'E', 'P', 'A', 2, 5, 1, 0, 'S', '—', 7, 3, 2, 'M', '—', '—', 4, 1, 'E', '—', '—', '—', 0].map((v, i) => (
            <span key={i} className={`rounded p-2 ${typeof v === 'number' && v > 3 ? 'bg-red-100 font-bold dark:bg-red-500/20' : 'bg-surface-2'}`}>{v}</span>
          ))}
        </div></Card>
    </div>
  );
}
