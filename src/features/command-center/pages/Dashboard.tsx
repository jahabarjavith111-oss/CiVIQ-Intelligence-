import { useQuery } from '@tanstack/react-query';
import { useProject } from '@/hooks/useProject';
import { useDashboard } from '../hooks/useDashboard';
import { activityApi } from '@/services/activity.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { formatCurrency, timeAgo } from '@/utils/formatters';
import { IndianRupee, CalendarDays, TriangleAlert, GitMerge, Bot, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, LineChart, Line } from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';

const FALLBACK_COST = [
  { m: 'Jun', planned: 120, actual: 105 }, { m: 'Jul', planned: 160, actual: 148 },
  { m: 'Aug', planned: 200, actual: 172 }, { m: 'Sep', planned: 220, actual: 192 },
];
const PROGRESS_TREND = [
  { m: 'Jun', v: 18 }, { m: 'Jul', v: 26 }, { m: 'Aug', v: 34 }, { m: 'Sep', v: 42 },
];
const FALLBACK_ACTIVITY = [
  { id: 'f1', actorName: 'Ananya', action: 'updated rate on', entityName: 'BOQ 4.2.3 → ₹18,400', createdAt: '' },
  { id: 'f2', actorName: 'Site Bot', action: 'ran', entityName: 'clash detection CR-41 (3 new)', createdAt: '' },
  { id: 'f3', actorName: 'Ravi', action: 'marked progress on', entityName: 'Columns L2 → 55%', createdAt: '' },
  { id: 'f4', actorName: 'Ananya', action: 'approved', entityName: 'revision V1 → V2', createdAt: '' },
];

export default function Dashboard() {
  const activeId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const { listQuery, healthQuery } = useProject(activeId);
  const { budget, schedule, risks, conflicts } = useDashboard(activeId);
  const activity = useQuery({
    queryKey: ['activity', activeId, 'recent'],
    queryFn: async () => (await activityApi.list(activeId, { limit: 4 })).data.data,
  });
  const colors = useChartColors();

  if (listQuery.isLoading) return <PageLoader />;
  if (listQuery.isError) return <QueryErrorState title="Could not load dashboard" onRetry={() => listQuery.refetch()} />;

  const projects = listQuery.data ?? [];
  const summary = projects[0];
  const health = healthQuery.data;
  const b = budget.data;
  const sched = schedule.data;
  const riskSum = risks.data;
  const confSum = conflicts.data;

  const budgetTotal = b?.totalBudget ?? summary?.budget ?? 45000000;
  const forecast = b?.totalForecast ?? 48200000;
  const variancePct = ((forecast - budgetTotal) / budgetTotal) * 100;

  const liveCost = (b?.sCurve ?? []).map((s) => ({
    m: s.period.slice(5), planned: Math.round(s.planned / 100000), actual: Math.round(s.actual / 100000),
  }));
  const costData = liveCost.length > 0 ? liveCost : FALLBACK_COST;
  const feed = (activity.data ?? []).length > 0 ? activity.data! : FALLBACK_ACTIVITY;
  const tipStyle = { contentStyle: { backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.ink, borderRadius: 8, fontSize: 12 } };
  const tick = { fill: colors.slate, fontSize: 12 };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-sm text-text-muted">{summary?.name ?? 'Select a project to begin'} • Health {health?.overall ?? 76}/100</p>
        </div>
        <Badge tone="active">● Live</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatCard title="Progress" value={`${summary?.progress ?? 42}%`} icon={Activity} progress={summary?.progress ?? 42} />
        <StatCard title="Budget" value={formatCurrency(budgetTotal)} sub={`Spent ${formatCurrency(b?.totalActual ?? summary?.spent ?? 19200000)}`} icon={IndianRupee} />
        <StatCard title="Forecast" value={formatCurrency(forecast)} sub={`${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}% vs budget`} icon={IndianRupee} />
        <StatCard title="Open risks" value={`${riskSum?.openHighRisks ?? 5} high`} sub={`${riskSum?.totalRisks ?? 14} total • ${Math.round((riskSum?.mitigationCompletionRate ?? 0.62) * 100)}% mitigated`} icon={TriangleAlert} />
        <StatCard title="Clashes" value={`${confSum?.total ?? 23} open`} sub={`${confSum?.openCritical ?? 4} critical`} icon={GitMerge} />
        <StatCard title="Next milestone" value="Slab L5" sub={`Oct 28 • ${sched?.varianceDays ?? 12}d behind`} icon={CalendarDays} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Cost — planned vs actual (₹ L)</CardTitle>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <XAxis dataKey="m" tick={tick} /><YAxis tick={tick} /><RTooltip {...tipStyle} />
                <Bar dataKey="planned" fill={colors.ink} radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" fill={colors.teal} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Progress %</CardTitle>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PROGRESS_TREND}>
                <XAxis dataKey="m" tick={tick} /><YAxis tick={tick} /><RTooltip {...tipStyle} />
                <Line type="monotone" dataKey="v" stroke={colors.ink} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>AI insights</CardTitle>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li className="flex gap-2"><Bot className="h-4 w-4 shrink-0 text-blue-600 dark:text-sky-400" /> Steel +10% adds ₹14.2L — lock rate with Supplier B.</li>
            <li className="flex gap-2"><Bot className="h-4 w-4 shrink-0 text-blue-600 dark:text-sky-400" /> Slab L5 at risk (Oct 28). Re-sequence MEP rough-in to recover 4 days.</li>
            <li className="flex gap-2"><Bot className="h-4 w-4 shrink-0 text-blue-600 dark:text-sky-400" /> 4 critical clashes block L3 pour — resolve B-204 vs D-118 first.</li>
          </ul>
        </Card>
        <Card>
          <CardTitle>Upcoming milestones</CardTitle>
          <div className="mt-3 space-y-3 text-sm">
            {[['Slab L5', 'Oct 28', 68], ['MEP rough-in L4', 'Nov 06', 30], ['Staircase C', 'Nov 14', 10]].map(([n, d, p]) => (
              <div key={n}><div className="flex justify-between"><span className="font-medium">{n}</span><span className="text-text-muted">{d}</span></div><Progress value={p as number} className="mt-1" /></div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Recent activity</CardTitle>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {feed.map((a) => (
              <li key={a.id}>• <b>{a.actorName}</b> {a.action} {a.entityName}
                {a.createdAt ? <span className="text-text-muted"> {timeAgo(a.createdAt)}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
