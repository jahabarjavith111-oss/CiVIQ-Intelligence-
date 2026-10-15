import { useState } from 'react';
import { useAdminAudit } from '../useAdmin';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/formatters';

const ACTIONS = ['auth.login', 'user.suspended', 'user.activated', 'user.role-changed', 'settings.updated', 'project.archived'];

export default function AdminAudit() {
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const q = useAdminAudit({ actor: actor || undefined, action: action || undefined });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Security & Audit Logs</h1>
      <Card>
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Filter by actor…" value={actor} onChange={(e) => setActor(e.target.value)} />
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>{ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <p className="self-center text-sm text-text-muted">{q.data?.total ?? 0} events</p>
        </div>
      </Card>
      <Card>
        <CardTitle>Trail</CardTitle>
        {q.isLoading ? <PageLoader /> : q.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load audit logs" error={q.error} onRetry={() => q.refetch()} /></div>
        ) : (q.data?.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No audit events" sub="Logins and admin actions are recorded here." /></div>
        ) : (
          <div className="mt-3"><Table head={['When', 'Actor', 'Action', 'Entity', 'Meta']}
            rows={(q.data?.data ?? []).map((a) => [
              formatDateTime(a.createdAt),
              `${a.actorName} `,
              <Badge key={a.id} tone={a.action.includes('suspend') || a.action.includes('archiv') ? 'critical' : 'low'}>{a.action}</Badge>,
              a.entityType ? `${a.entityType}${a.entityId ? ` • ${a.entityId.slice(0, 8)}` : ''}` : '—',
              <span key={`m-${a.id}`} className="max-w-64 truncate text-xs text-text-muted">{JSON.stringify(a.meta)}</span>,
            ])} /></div>
        )}
      </Card>
    </div>
  );
}
