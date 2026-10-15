import { useAdminHealth } from '../useAdmin';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { formatFileSize } from '@/utils/formatters';
import { Database, HardDrive, Brain, Server, Plug } from 'lucide-react';

function Row({ icon: Icon, label, ok, detail }: { icon: typeof Server; label: string; ok: boolean | null; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
      <Icon className="h-5 w-5 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-text-muted">{detail}</p>
      </div>
      <Badge tone={ok === null ? 'medium' : ok ? 'low' : 'critical'}>{ok === null ? 'unknown' : ok ? 'healthy' : 'down'}</Badge>
    </div>
  );
}

export default function AdminHealth() {
  const q = useAdminHealth();

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <QueryErrorState title="Could not load system health" error={q.error} onRetry={() => q.refetch()} />;
  const h = q.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-sm text-text-muted">{h.app} v{h.version} • {h.env} • auto-refreshes every 30s</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Row icon={Server} label="Backend API" ok detail="Serving this dashboard — reachable" />
        <Row icon={Database} label="PostgreSQL" ok={h.database.ok}
          detail={h.database.ok ? `${h.database.latencyMs} ms ping` : h.database.error ?? 'unreachable'} />
        <Row icon={HardDrive} label="File storage" ok detail={`${formatFileSize(h.storage.bytes)} in ${h.storage.dir}`} />
        <Row icon={Plug} label="Redis / job queue" ok={h.redis.ok}
          detail={h.redis.ok === null ? 'status unknown' : h.redis.ok ? `connected${h.redis.queueDepth !== null && h.redis.queueDepth !== undefined ? ` • ${h.redis.queueDepth} queued` : ''}` : 'unreachable — jobs run inline'} />
        <Row icon={Brain} label="Copilot AI" ok detail={`${h.ai.provider} • ${h.ai.model}`} />
      </div>
      <Card>
        <CardTitle>Background jobs</CardTitle>
        <p className="mt-1 text-sm text-text-muted">
          {h.redis.ok
            ? `RQ worker processes the "civiq" queue (${h.redis.queueDepth ?? 0} pending). Run a worker with: python -m app.jobs`
            : 'Redis is unreachable, so heavy jobs (analysis, clash, Monte Carlo) execute inline in the request. Start Redis + a worker for production load.'}
        </p>
      </Card>
    </div>
  );
}
