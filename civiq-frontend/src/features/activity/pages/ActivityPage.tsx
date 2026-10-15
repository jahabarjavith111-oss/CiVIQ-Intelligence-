import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/services/activity.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { NoProjectSelected } from '@/components/common/RequireProject';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { timeAgo } from '@/utils/formatters';
import { useState } from 'react';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';

export default function ActivityPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId);
  const [filter, setFilter] = useState('');
  const q = useQuery({
    queryKey: ['activity', projectId, filter],
    queryFn: async () => (await activityApi.list(projectId!, { entityType: filter || undefined })).data.data,
    enabled: !!projectId,
  });

  if (!projectId) return <NoProjectSelected />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Activity</h1>
        <div className="w-56">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All events</option>
            {['drawing', 'model', 'boq', 'cost', 'schedule', 'conflict', 'revision', 'risk', 'team'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>
      <Card>
        <CardTitle>Project timeline</CardTitle>
        {q.isLoading ? <PageLoader /> : q.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load activity" error={q.error} onRetry={() => q.refetch()} /></div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No activity yet" sub="Events appear here as the team works." /></div>
        ) : (
          <ul className="mt-3 space-y-0">
            {(q.data ?? []).map((a, i) => (
              <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < (q.data ?? []).length - 1 && <span className="absolute left-[7px] top-5 h-full w-px bg-surface-3" />}
                <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-inverse bg-surface" />
                <div className="text-sm">
                  <p><b>{a.actorName}</b> {a.action} {a.entityName && <span className="font-medium text-blue-700 dark:text-sky-400">{a.entityName}</span>}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                    <Badge tone="low">{a.entityType}</Badge> {timeAgo(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
