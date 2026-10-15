import { useQuery } from '@tanstack/react-query';
import { revisionsApi } from '@/services/revisions.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';

export default function RevisionsPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const q = useQuery({ queryKey: ['rev', projectId], queryFn: async () => (await revisionsApi.list(projectId)).data.data });
  if (q.isLoading) return <PageLoader />;
  if (q.isError) return <QueryErrorState title="Could not load revisions" onRetry={() => q.refetch()} />;
  if ((q.data ?? []).length === 0) return <div className="space-y-4"><h1 className="text-2xl font-bold">Revisions</h1><EmptyState title="No revisions yet" sub="Drawing revisions and their impacts appear here." /></div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Revisions — V1 → V2</h1>
      {(q.data ?? []).map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-2"><Badge tone="low">{r.status}</Badge><p className="font-semibold">{r.title}</p></div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {[['Cost', r.impacts.cost.description], ['Schedule', r.impacts.schedule.description], ['Material', r.impacts.material.description], ['Risk', r.impacts.risk.description]].map(([t, v]) => (
              <div key={t} className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">{t} impact</p><p className="font-bold">{v}</p></div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed bg-surface-2 text-xs text-text-muted">Drawing side-by-side diff (PDF.js overlay)</div>
            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed bg-surface-2 text-xs text-text-muted">3D geometry diff: +green / −red / ~amber</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
