import { useAdminOverview } from '../useAdmin';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { Users, FolderKanban, FileImage, Bot, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminOverview() {
  const q = useAdminOverview();

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <QueryErrorState title="Could not load platform overview" error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-blue-700 dark:text-sky-400" />
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-sm text-text-muted">Super-admin only • whole platform at a glance</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard title="Users" value={String(d.users.total)} sub={`${d.users.suspended} suspended`} icon={Users} />
        <StatCard title="Projects" value={String(d.projects.total)} icon={FolderKanban} />
        <StatCard title="Drawings" value={String(d.drawings.total)} icon={FileImage} />
        <StatCard title="Copilot chats" value={String(d.copilot.conversations)} sub={`${d.copilot.messages24h} msgs / 24h`} icon={Bot} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Users by role</CardTitle>
          <div className="mt-2 space-y-1.5">
            {d.users.byRole.map((r) => (
              <div key={r.key} className="flex items-center justify-between text-sm">
                <span className="font-mono">{r.key}</span><Badge tone={r.key === 'admin' ? 'critical' : 'low'}>{r.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Projects by status</CardTitle>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.projects.byStatus.map((s) => ({ s: s.key, v: s.count }))} layout="vertical">
                <XAxis type="number" hide /><YAxis type="category" dataKey="s" fontSize={11} width={80} /><Tooltip />
                <Bar dataKey="v" fill="#0d9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Drawing analyses</CardTitle>
          <div className="mt-2 space-y-1.5">
            {d.drawings.analysesByStatus.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="font-mono">{s.key}</span>
                <Badge tone={s.key === 'failed' ? 'critical' : s.key === 'completed' ? 'low' : 'medium'}>{s.count}</Badge>
              </div>
            ))}
            {d.drawings.analysesByStatus.length === 0 && <p className="text-sm text-text-muted">No analyses yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
