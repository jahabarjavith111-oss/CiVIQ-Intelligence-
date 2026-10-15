import { useQuery, useMutation } from '@tanstack/react-query';
import { costApi } from '@/services/cost.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { useUiStore } from '@/store/uiStore';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/formatters';
import { IndianRupee, TrendingUp, TriangleAlert } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { COST_CATEGORIES } from '@/app/config';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';

export default function CostPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const toast = useUiStore((s) => s.pushToast);
  const colors = useChartColors();
  const q = useQuery({ queryKey: ['budget', projectId], queryFn: async () => (await costApi.getBudgetSummary(projectId)).data });
  const forecast = useMutation({
    mutationFn: async () => {
      const sc = (await costApi.createForecastScenario(projectId, { name: `Steel +10% — ${Date.now()}`, description: 'quick scenario', isBaseline: false, assumptions: [{ category: 'material', factor: 1.1, reason: 'steel surge' }] })).data;
      return (await costApi.runForecast(sc.id)).data;
    },
    onSuccess: () => toast({ title: 'Forecast complete', variant: 'success' }),
    onError: () => toast({ title: 'Forecast run failed', variant: 'error' }),
  });
  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <QueryErrorState title="Could not load cost data" onRetry={() => q.refetch()} />;
  const b = q.data;
  const tick = { fill: colors.slate, fontSize: 11 };
  const tipStyle = { contentStyle: { backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.ink, borderRadius: 8, fontSize: 12 } };
  const curve = b.sCurve.map((s) => ({ m: s.period.slice(5), planned: s.planned / 100000, actual: s.actual / 100000, forecast: s.forecast / 100000 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Estimate — Cost Intelligence</h1>
        <Button loading={forecast.isPending} onClick={() => forecast.mutate()}>Run forecast (steel +10%)</Button>
      </div>
      {forecast.data && (
        <Card><CardTitle>Forecast result — confidence {Math.round(forecast.data.results.confidence * 100)}%</CardTitle>
          <p className="mt-1 text-sm">Total forecast <b>{formatCurrency(forecast.data.results.totalForecast)}</b> •
            variance from baseline <b>{formatCurrency(forecast.data.results.varianceFromBaseline)}</b></p></Card>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard title="Budget" value={formatCurrency(b.totalBudget)} icon={IndianRupee} />
        <StatCard title="Actual" value={formatCurrency(b.totalActual)} icon={IndianRupee} />
        <StatCard title="Forecast" value={formatCurrency(b.totalForecast)} sub="+7.1% variance" icon={TrendingUp} />
        <StatCard title="Health" value={b.budgetHealth} sub={`${formatCurrency(b.remainingBudget)} left`} icon={TriangleAlert} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Budget vs actual by category (₹)</CardTitle>
          <div className="h-60"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={b.byCategory.map((c) => ({ c: c.category, budgeted: c.budgeted / 100000, actual: c.actual / 100000 }))}>
              <XAxis dataKey="c" tick={tick} /><YAxis tick={tick} /><Tooltip {...tipStyle} />
              <Bar dataKey="budgeted" fill={colors.ink} radius={[6, 6, 0, 0]} /><Bar dataKey="actual" fill={colors.amber} radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer></div>
        </Card>
        <Card>
          <CardTitle>S-curve (₹ L)</CardTitle>
          <div className="h-60"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve}><XAxis dataKey="m" tick={tick} /><YAxis tick={tick} /><Tooltip {...tipStyle} />
              <Line type="monotone" dataKey="planned" stroke={colors.ink} dot={false} /><Line type="monotone" dataKey="actual" stroke={colors.teal} dot={false} /><Line type="monotone" dataKey="forecast" stroke={colors.amber} strokeDasharray="5 5" dot={false} />
            </LineChart></ResponsiveContainer></div>
        </Card>
      </div>
      <Card>
        <CardTitle>Cost categories</CardTitle>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">{COST_CATEGORIES.map((c) => <span key={c} className="rounded-full bg-surface-3 px-3 py-1 font-medium">{c}</span>)}</div>
        <p className="mt-2 text-xs text-text-muted">Material 58% • Labour 24% • Equipment 9% • Overhead + Tax + Wastage + Markup 9%</p>
      </Card>
    </div>
  );
}
