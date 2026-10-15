import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { costApi } from '@/services/cost.api';
import { scheduleApi } from '@/services/schedule.api';
import { takeoffApi } from '@/services/takeoff.api';
import { boqApi } from '@/services/boq.api';
import { risksApi } from '@/services/risks.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { NoProjectSelected } from '@/components/common/RequireProject';
import { Card, CardTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';

const TABS = [
  { key: 'cost', label: 'Cost' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'material', label: 'Material' },
  { key: 'labour', label: 'Labour' },
  { key: 'risk', label: 'Risk trends' },
];

interface LineKey { key: string; color: string; dashed?: boolean }
interface TabData {
  lineTitle: string;
  lineData: Record<string, string | number>[];
  lineKeys: LineKey[];
  barTitle: string;
  barData: Record<string, string | number>[];
  barKey: string;
  barColor: string;
  note?: string;
}

export default function AnalyticsPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId);
  const [tab, setTab] = useState('cost');
  const colors = useChartColors();

  const sCurve = useQuery({
    queryKey: ['analytics', projectId, 's-curve'],
    queryFn: async () => (await costApi.getSCurve(projectId!)).data,
    enabled: tab === 'cost' && !!projectId,
  });
  const breakdown = useQuery({
    queryKey: ['analytics', projectId, 'breakdown'],
    queryFn: async () => (await costApi.getBreakdown(projectId!)).data,
    enabled: tab === 'cost' && !!projectId,
  });
  const activities = useQuery({
    queryKey: ['analytics', projectId, 'activities'],
    queryFn: async () => (await scheduleApi.getActivities(projectId!)).data.data,
    enabled: tab === 'schedule' && !!projectId,
  });
  const schedSummary = useQuery({
    queryKey: ['analytics', projectId, 'sched-summary'],
    queryFn: async () => (await scheduleApi.getSummary(projectId!)).data,
    enabled: tab === 'schedule' && !!projectId,
  });
  const takeoffSummary = useQuery({
    queryKey: ['analytics', projectId, 'takeoff-summary'],
    queryFn: async () => (await takeoffApi.getSummary(projectId!)).data,
    enabled: tab === 'material' && !!projectId,
  });
  const boqSummary = useQuery({
    queryKey: ['analytics', projectId, 'boq-summary'],
    queryFn: async () => (await boqApi.getSummary(projectId!)).data,
    enabled: tab === 'labour' && !!projectId,
  });
  const riskTrends = useQuery({
    queryKey: ['analytics', projectId, 'risk-trends'],
    queryFn: async () => (await risksApi.getTrends(projectId!)).data,
    enabled: tab === 'risk' && !!projectId,
  });
  const riskSummary = useQuery({
    queryKey: ['analytics', projectId, 'risk-summary'],
    queryFn: async () => (await risksApi.getSummary(projectId!)).data,
    enabled: tab === 'risk' && !!projectId,
  });

  const activeQueries =
    tab === 'cost' ? [sCurve, breakdown]
    : tab === 'schedule' ? [activities, schedSummary]
    : tab === 'material' ? [takeoffSummary]
    : tab === 'labour' ? [boqSummary]
    : [riskTrends, riskSummary];

  const loading = activeQueries.some((q) => q.isLoading);
  const failed = activeQueries.some((q) => q.isError);
  const retryAll = () => activeQueries.forEach((q) => q.refetch());

  const data: TabData | null = (() => {
    if (tab === 'cost' && sCurve.data && breakdown.data) {
      return {
        lineTitle: 'S-curve — planned vs actual vs forecast (₹ L)',
        lineData: sCurve.data.planned.map((p, i) => ({
          m: p.period.slice(5),
          planned: Math.round(p.value / 100000),
          actual: Math.round((sCurve.data!.actual[i]?.value ?? 0) / 100000),
          forecast: Math.round((sCurve.data!.forecast[i]?.value ?? 0) / 100000),
        })),
        lineKeys: [
          { key: 'planned', color: colors.ink },
          { key: 'actual', color: colors.teal },
          { key: 'forecast', color: colors.amber, dashed: true },
        ],
        barTitle: 'Actual cost by category (₹)',
        barData: breakdown.data.map((b) => ({ m: b.subCategory, v: b.actual })),
        barKey: 'v',
        barColor: colors.teal,
      };
    }
    if (tab === 'schedule' && activities.data && schedSummary.data) {
      const s = schedSummary.data;
      return {
        lineTitle: 'Activity progress % by WBS',
        lineData: activities.data.map((a) => ({ m: a.wbsCode, v: a.progress })),
        lineKeys: [{ key: 'v', color: colors.ink }],
        barTitle: 'Activities by status',
        barData: [
          { m: 'Completed', v: s.completedActivities },
          { m: 'In progress', v: s.inProgressActivities },
          { m: 'Not started', v: s.notStartedActivities },
        ],
        barKey: 'v',
        barColor: colors.teal,
      };
    }
    if (tab === 'material' && takeoffSummary.data) {
      return {
        lineTitle: 'Takeoff quantity by trade',
        lineData: takeoffSummary.data.map((t) => ({ m: t.trade, v: t.totalQuantity })),
        lineKeys: [{ key: 'v', color: colors.ink }],
        barTitle: 'Item count by trade',
        barData: takeoffSummary.data.map((t) => ({ m: t.trade, v: t.itemCount })),
        barKey: 'v',
        barColor: colors.teal,
        note: 'Quantities use per-trade units (m³, t, nos, m²).',
      };
    }
    if (tab === 'labour' && boqSummary.data) {
      return {
        lineTitle: 'BOQ amount by trade (₹ L)',
        lineData: boqSummary.data.byTrade.map((t) => ({ m: t.trade, v: Math.round(t.amount / 100000) })),
        lineKeys: [{ key: 'v', color: colors.ink }],
        barTitle: 'BOQ amount by work package (₹ L)',
        barData: boqSummary.data.byWorkPackage.map((w) => ({ m: w.name, v: Math.round(w.amount / 100000) })),
        barKey: 'v',
        barColor: colors.teal,
      };
    }
    if (tab === 'risk' && riskTrends.data && riskSummary.data) {
      return {
        lineTitle: 'Total risk score trend',
        lineData: riskTrends.data.map((t) => ({ m: t.date.slice(5), v: t.totalScore })),
        lineKeys: [{ key: 'v', color: colors.red }],
        barTitle: 'Risks by category',
        barData: riskSummary.data.byCategory.map((c) => ({ m: c.category, v: c.count })),
        barKey: 'v',
        barColor: colors.amber,
      };
    }
    return null;
  })();

  const firstError = activeQueries.map((q) => q.error).find(Boolean);

  if (!projectId) return <NoProjectSelected />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {loading ? <PageLoader /> : failed ? (
        <QueryErrorState title="Could not load analytics" error={firstError} onRetry={retryAll} />
      ) : !data || (data.lineData.length === 0 && data.barData.length === 0) ? (
        <QueryErrorState title="No analytics data for this view" onRetry={retryAll} />
      ) : (
        <>
          {data.note && <p className="text-xs text-text-muted">{data.note}</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardTitle>{data.lineTitle}</CardTitle>
              <div className="h-60"><ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.lineData}>
                  <XAxis dataKey="m" tick={{ fill: colors.slate, fontSize: 12 }} /><YAxis tick={{ fill: colors.slate, fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.ink, borderRadius: 8, fontSize: 12 }} /><Legend />
                  {data.lineKeys.map((k) => (
                    <Line key={k.key} type="monotone" dataKey={k.key} stroke={k.color} strokeWidth={2} dot={false} strokeDasharray={k.dashed ? '5 5' : undefined} />
                  ))}
                </LineChart>
              </ResponsiveContainer></div></Card>
            <Card><CardTitle>{data.barTitle}</CardTitle>
              <div className="h-60"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.barData}>
                  <XAxis dataKey="m" tick={{ fill: colors.slate, fontSize: 12 }} /><YAxis tick={{ fill: colors.slate, fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.ink, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey={data.barKey} fill={data.barColor} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div></Card>
          </div>
        </>
      )}
    </div>
  );
}
