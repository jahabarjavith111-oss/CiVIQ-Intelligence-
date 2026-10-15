import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/admin.api';
import { useAdminProjects } from '../useAdmin';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useUiStore } from '@/store/uiStore';
import { formatCurrency } from '@/utils/formatters';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { apiErrorMessage } from '@/utils/errors';

export default function AdminProjects() {
  const [status, setStatus] = useState('');
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  const q = useAdminProjects(status);

  const archive = useMutation({
    mutationFn: (id: string) => adminApi.archiveProject(id).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'projects'] }); toast({ title: 'Project archived', variant: 'success' }); },
    onError: (e) => toast({ title: apiErrorMessage(e, 'Archive failed'), variant: 'error' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Project Monitoring</h1>
        <div className="w-52">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['planning', 'active', 'on-hold', 'completed', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <Card>
        <CardTitle>{q.data?.total ?? 0} projects platform-wide</CardTitle>
        {q.isLoading ? <PageLoader /> : q.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load projects" error={q.error} onRetry={() => q.refetch()} /></div>
        ) : (q.data?.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No projects" sub="Projects appear here once created." /></div>
        ) : (
          <div className="mt-3"><Table head={['Project', 'Status', 'Budget / spent', 'Members', 'Drawings', 'Conflicts', 'Risks', '']}
            rows={(q.data?.data ?? []).map((p) => [
              p.name,
              <Badge key={p.id} tone={p.status === 'active' ? 'low' : 'medium'}>{p.status}</Badge>,
              `${formatCurrency(p.budget ?? 0)} / ${formatCurrency(p.spent)}`,
              String(p.members), String(p.drawings),
              <Badge key={`c-${p.id}`} tone={p.openConflicts > 0 ? 'critical' : 'low'}>{p.openConflicts}</Badge>,
              <Badge key={`r-${p.id}`} tone={p.openRisks > 0 ? 'medium' : 'low'}>{p.openRisks}</Badge>,
              p.status === 'archived'
                ? <span key={`x-${p.id}`} className="text-xs text-text-muted">archived</span>
                : <Button key={`x-${p.id}`} size="sm" variant="outline" loading={archive.isPending} onClick={() => archive.mutate(p.id)}>Archive</Button>,
            ])} /></div>
        )}
      </Card>
    </div>
  );
}
