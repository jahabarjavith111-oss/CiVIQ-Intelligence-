import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsApi, type ReportType } from '@/services/reports.api';
import { projectsApi } from '@/services/projects.api';
import { drawingsApi } from '@/services/drawings.api';
import { takeoffApi } from '@/services/takeoff.api';
import { boqApi } from '@/services/boq.api';
import { costApi } from '@/services/cost.api';
import { scheduleApi } from '@/services/schedule.api';
import { coordinationApi } from '@/services/coordination.api';
import { revisionsApi } from '@/services/revisions.api';
import { risksApi } from '@/services/risks.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useUiStore } from '@/store/uiStore';
import { escapeHtml, printReport } from '@/utils/export';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';

const TYPES: ReportType[] = ['project', 'drawing-analysis', 'takeoff', 'boq', 'cost', 'schedule', 'conflict', 'revision', 'risk', 'ai-insights', 'complete'];

const AI_INSIGHTS = [
  'Lock steel rate with Supplier B — a 10% surge adds ₹14.2L.',
  'Re-sequence MEP rough-in to recover 4 days on Slab L5.',
  'Resolve B-204 vs D-118 before the Friday pour.',
];

function table(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => escapeHtml(String(v));
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

async function buildSections(type: ReportType, projectId: string): Promise<{ heading: string; body: string }[]> {
  switch (type) {
    case 'project': {
      const [p, h] = await Promise.all([(await projectsApi.get(projectId)).data, (await projectsApi.getHealth(projectId)).data]);
      return [{ heading: 'Project summary', body: table(['Field', 'Value'], [
        ['Name', p.name], ['Status', p.status], ['Schedule', `${p.startDate} → ${p.endDate ?? '—'}`],
        ['Budget', formatCurrency(p.budget ?? 0)], ['Health', `${h.overall}/100 (cost ${h.cost}, schedule ${h.schedule}, quality ${h.quality})`],
      ]) }];
    }
    case 'drawing-analysis': {
      const drawings = (await drawingsApi.list(projectId)).data.data;
      return [{ heading: 'Drawings', body: table(['Name', 'Type', 'Version', 'Status'], drawings.map((d) => [d.name, d.type, d.version, d.status])) }];
    }
    case 'takeoff': {
      const summary = (await takeoffApi.getSummary(projectId)).data;
      return [{ heading: 'Takeoff summary', body: table(['Trade', 'Items', 'Quantity', 'Unit'], summary.map((s) => [s.trade, s.itemCount, s.totalQuantity, s.unit])) }];
    }
    case 'boq': {
      const s = (await boqApi.getSummary(projectId)).data;
      return [
        { heading: 'BOQ totals', body: `<p>${s.totalItems} items • Total ${formatCurrency(s.totalAmount)} ${escapeHtml(s.currency)}</p>` },
        { heading: 'Amount by trade', body: table(['Trade', 'Amount'], s.byTrade.map((t) => [t.trade, formatCurrency(t.amount)])) },
      ];
    }
    case 'cost': {
      const b = (await costApi.getBudgetSummary(projectId)).data;
      return [
        { heading: 'Budget', body: table(['Metric', 'Amount'], [
          ['Budget', formatCurrency(b.totalBudget)], ['Actual', formatCurrency(b.totalActual)],
          ['Committed', formatCurrency(b.totalCommitted)], ['Forecast', formatCurrency(b.totalForecast)],
        ]) },
        { heading: 'Variance by category', body: table(['Category', 'Budgeted', 'Actual', 'Variance'], b.byCategory.map((c) => [c.category, formatCurrency(c.budgeted), formatCurrency(c.actual), formatCurrency(c.variance)])) },
      ];
    }
    case 'schedule': {
      const s = (await scheduleApi.getSummary(projectId)).data;
      return [{ heading: 'Schedule', body: table(['Metric', 'Value'], [
        ['Progress', `${s.overallProgress}%`], ['SPI', String(s.SPI)], ['Variance', `${s.varianceDays} days`],
        ['Activities', `${s.completedActivities}/${s.totalActivities} complete`], ['Finish', `${s.projectFinish} (baseline ${s.baselineFinish})`],
      ]) }];
    }
    case 'conflict': {
      const [s, list] = await Promise.all([(await coordinationApi.getSummary(projectId)).data, (await coordinationApi.getConflicts(projectId)).data.data]);
      return [
        { heading: 'Coordination summary', body: `<p>${s.total} conflicts • ${s.openCritical} critical open • ${Math.round(s.resolutionRate * 100)}% resolution rate</p>` },
        { heading: 'Conflicts', body: table(['Title', 'Severity', 'Status'], list.map((c) => [c.title, c.severity, c.status])) },
      ];
    }
    case 'revision': {
      const revs = (await revisionsApi.list(projectId)).data.data;
      return [{ heading: 'Revisions', body: table(['Title', 'Status', 'Cost impact', 'Schedule impact'], revs.map((r) => [r.title, r.status, r.impacts.cost.description, r.impacts.schedule.description])) }];
    }
    case 'risk': {
      const [s, list] = await Promise.all([(await risksApi.getSummary(projectId)).data, (await risksApi.list(projectId)).data.data]);
      return [
        { heading: 'Risk summary', body: `<p>${s.totalRisks} risks • ${s.openHighRisks} high open • ${Math.round(s.mitigationCompletionRate * 100)}% mitigated</p>` },
        { heading: 'Register', body: table(['Code', 'Title', 'Score', 'Status'], list.map((r) => [r.code, r.title, r.score, r.status])) },
      ];
    }
    case 'ai-insights': {
      return [{ heading: 'AI insights', body: `<ul>${AI_INSIGHTS.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` }];
    }
    case 'complete': {
      const [p, b, s, rk, cf] = await Promise.all([
        (await projectsApi.get(projectId)).data,
        (await costApi.getBudgetSummary(projectId)).data,
        (await scheduleApi.getSummary(projectId)).data,
        (await risksApi.getSummary(projectId)).data,
        (await coordinationApi.getSummary(projectId)).data,
      ]);
      return [
        { heading: 'Project', body: `<p>${escapeHtml(p.name)} — ${escapeHtml(p.status)}, budget ${formatCurrency(p.budget ?? 0)}</p>` },
        { heading: 'Cost', body: `<p>Budget ${formatCurrency(b.totalBudget)} • Actual ${formatCurrency(b.totalActual)} • Forecast ${formatCurrency(b.totalForecast)}</p>` },
        { heading: 'Schedule', body: `<p>${s.overallProgress}% complete • SPI ${s.SPI} • ${s.varianceDays} days variance</p>` },
        { heading: 'Risks & conflicts', body: `<p>${rk.totalRisks} risks (${rk.openHighRisks} high open) • ${cf.total} conflicts (${cf.openCritical} critical open)</p>` },
        { heading: 'AI insights', body: `<ul>${AI_INSIGHTS.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` },
      ];
    }
  }
}

export default function ReportsPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  const [type, setType] = useState<ReportType>('complete');
  const list = useQuery({ queryKey: ['reports', projectId], queryFn: async () => (await reportsApi.list(projectId)).data });

  const generate = useMutation({
    mutationFn: async () => {
      const rep = (await reportsApi.generate(projectId, { name: `${type}-${Date.now()}`, type })).data;
      const sections = await buildSections(type, projectId);
      return { rep, sections };
    },
    onSuccess: ({ rep, sections }) => {
      qc.invalidateQueries({ queryKey: ['reports', projectId] });
      toast({ title: `${rep.name} ready`, variant: 'success' });
      printReport(rep.name, sections);
    },
    onError: () => toast({ title: 'Report generation failed', variant: 'error' }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card>
        <CardTitle>Report builder — generates a printable PDF via print dialog</CardTitle>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-64"><Select label="Report type" value={type} onChange={(e) => setType(e.target.value as ReportType)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
          <Button loading={generate.isPending} onClick={() => generate.mutate()}>Generate PDF</Button>
        </div>
      </Card>
      <Card>
        <CardTitle>Generated</CardTitle>
        {list.isLoading ? <PageLoader /> : list.isError ? (
          <div className="mt-2"><QueryErrorState title="Could not load reports" onRetry={() => list.refetch()} /></div>
        ) : (
          <div className="mt-2 space-y-2">
            {(list.data ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <Badge tone={r.status === 'ready' ? 'low' : 'medium'}>{r.status}</Badge>
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-text-muted">{r.type} • {formatDate(r.createdAt)}</span>
              </div>
            ))}
            {(list.data ?? []).length === 0 && <p className="text-sm text-text-muted">None yet — generate your first report above.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
