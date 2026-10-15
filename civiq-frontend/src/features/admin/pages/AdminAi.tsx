import { useState } from 'react';
import { useAdminAi } from '../useAdmin';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/formatters';
import { Bot, MessagesSquare, TriangleAlert, ThumbsDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function AdminAi() {
  const [status, setStatus] = useState('');
  const { analyses, usage } = useAdminAi(status);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI Monitoring</h1>
      {usage.isLoading ? <PageLoader /> : usage.isError ? (
        <QueryErrorState title="Could not load AI usage" error={usage.error} onRetry={() => usage.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard title="Conversations" value={String(usage.data?.conversations ?? 0)} icon={Bot} />
            <StatCard title="Assistant answers" value={String(usage.data?.assistantMessages ?? 0)} icon={MessagesSquare} />
            <StatCard title="Failed verifications" value={String(usage.data?.failedVerifications ?? 0)} icon={TriangleAlert} />
            <StatCard title="Negative ratings" value={String(usage.data?.negativeRatings ?? 0)} icon={ThumbsDown} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Messages per day (14d)</CardTitle>
              <div className="h-52"><ResponsiveContainer width="100%" height="100%">
                <LineChart data={usage.data?.byDay ?? []}>
                  <XAxis dataKey="date" fontSize={10} tickFormatter={(d: string) => d.slice(5)} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer></div>
            </Card>
            <Card>
              <CardTitle>Answers by intent</CardTitle>
              <div className="h-52"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage.data?.byIntent ?? []} layout="vertical">
                  <XAxis type="number" hide /><YAxis type="category" dataKey="intent" fontSize={10} width={130} /><Tooltip />
                  <Bar dataKey="count" fill="#1e3a5f" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            </Card>
          </div>
        </>
      )}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Drawing-analysis jobs</CardTitle>
          <div className="w-44">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['pending', 'running', 'completed', 'failed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
        {analyses.isLoading ? <PageLoader /> : analyses.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load analysis jobs" error={analyses.error} onRetry={() => analyses.refetch()} /></div>
        ) : (analyses.data?.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No analysis jobs" sub="Drawing analyses appear here with status and errors." /></div>
        ) : (
          <div className="mt-3"><Table head={['Drawing', 'Status', 'Confidence', 'Processed', 'Error']}
            rows={(analyses.data?.data ?? []).map((a) => [
              a.drawingName,
              <Badge key={a.id} tone={a.status === 'failed' ? 'critical' : a.status === 'completed' ? 'low' : 'medium'}>{a.status}</Badge>,
              `${Math.round(a.confidence * 100)}%`,
              a.processedAt ? formatDateTime(a.processedAt) : '—',
              <span key={`e-${a.id}`} className="max-w-64 truncate text-xs text-red-600">{a.error ?? '—'}</span>,
            ])} /></div>
        )}
      </Card>
    </div>
  );
}
