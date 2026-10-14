import { useQuery, useMutation } from '@tanstack/react-query';
import { risksApi } from '@/services/risks.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { downloadCsv } from '@/utils/export';
import { formatCurrency } from '@/utils/formatters';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Download } from 'lucide-react';

export default function RisksPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const toast = useUiStore((s) => s.pushToast);
  const list = useQuery({ queryKey: ['risks', projectId], queryFn: async () => (await risksApi.list(projectId)).data.data });

  const mc = useMutation({
    mutationFn: () => risksApi.runMonteCarlo(projectId, { runs: 10000 }).then((r) => r.data),
    onSuccess: () => toast({ title: 'Monte Carlo complete (10,000 runs)', variant: 'success' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Risk Intelligence</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv('risks.csv', (list.data ?? []).map((r) => [r.code, r.title, r.category, r.score, r.rating, r.status]), ['code', 'title', 'category', 'score', 'rating', 'status'])}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button loading={mc.isPending} onClick={() => mc.mutate()}>Run Monte Carlo</Button>
        </div>
      </div>
      {mc.data && (
        <Card><CardTitle>Monte Carlo — {mc.data.runs.toLocaleString()} runs</CardTitle>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">P50 cost</p><p className="font-bold">{formatCurrency(mc.data.p50Cost)}</p></div>
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">P90 cost</p><p className="font-bold">{formatCurrency(mc.data.p90Cost)}</p></div>
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">P50 duration</p><p className="font-bold">{mc.data.p50Duration} days</p></div>
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-text-muted">P90 duration</p><p className="font-bold">{mc.data.p90Duration} days</p></div>
          </div></Card>
      )}
      <Card>
        <CardTitle>Heatmap (probability × impact)</CardTitle>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {Array.from({ length: 25 }, (_, i) => {
            const p = 5 - Math.floor(i / 5), im = (i % 5) + 1, s = p * im;
            const bg = s >= 20 ? 'bg-red-500 text-white' : s >= 12 ? 'bg-orange-400 text-white' : s >= 6 ? 'bg-amber-200 dark:bg-amber-500/25' : 'bg-emerald-100 dark:bg-emerald-500/20';
            return <span key={i} className={`rounded p-2 text-center text-xs font-bold ${bg}`}>{s}</span>;
          })}
        </div>
      </Card>
      <Card>
        <CardTitle>Risk register</CardTitle>
        {list.isLoading ? <PageLoader /> : list.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load risks" onRetry={() => list.refetch()} /></div>
        ) : (list.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No risks registered" sub="Identify the first project risk to get started." /></div>
        ) : (
          <div className="mt-3"><Table head={['Code', 'Title', 'Category', 'P×I', 'Rating', 'Status']}
            rows={(list.data ?? []).map((r) => [r.code, r.title, r.category, `${r.probability}×${r.impact}=${r.score}`, <Badge key={r.id} tone={r.rating.includes('high') || r.rating === 'extreme' ? 'critical' : 'medium'}>{r.rating}</Badge>, r.status])} /></div>
        )}
      </Card>
    </div>
  );
}
