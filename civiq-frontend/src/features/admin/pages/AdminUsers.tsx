import { useState } from 'react';
import { useAdminUsers, useSuspendUser, useActivateUser, useUpdateUserRole } from '../useAdmin';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate } from '@/utils/formatters';
import type { AdminUser } from '@/types/admin';

const ROLES = ['admin', 'project-manager', 'engineer', 'viewer'];

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('engineer');

  const q = useAdminUsers({ search: search || undefined, role: role || undefined, status: status || undefined });
  const suspend = useSuspendUser();
  const activate = useActivateUser();
  const changeRole = useUpdateUserRole();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>
      <Card>
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </Select>
          <p className="self-center text-sm text-text-muted">{q.data?.total ?? 0} users</p>
        </div>
      </Card>
      <Card>
        <CardTitle>Accounts</CardTitle>
        {q.isLoading ? <PageLoader /> : q.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load users" error={q.error} onRetry={() => q.refetch()} /></div>
        ) : (q.data?.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No users match" sub="Adjust search or filters." /></div>
        ) : (
          <div className="mt-3"><Table head={['Name', 'Email', 'Role', 'Projects', 'Status', 'Joined', '']}
            rows={(q.data?.data ?? []).map((u) => [
              u.name, <span key={u.id} className="font-mono text-xs">{u.email}</span>,
              <Badge key={`r-${u.id}`} tone={u.role === 'admin' ? 'critical' : 'low'}>{u.role}</Badge>,
              String(u.projectCount),
              <Badge key={`s-${u.id}`} tone={u.isActive ? 'low' : 'critical'}>{u.isActive ? 'active' : 'suspended'}</Badge>,
              formatDate(u.createdAt),
              <span key={`a-${u.id}`} className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { setRoleTarget(u); setNewRole(u.role); }}>Role</Button>
                {u.isActive
                  ? <Button size="sm" variant="destructive" loading={suspend.isPending} onClick={() => suspend.mutate(u.id)}>Suspend</Button>
                  : <Button size="sm" variant="secondary" loading={activate.isPending} onClick={() => activate.mutate(u.id)}>Activate</Button>}
              </span>,
            ])} /></div>
        )}
      </Card>
      <Dialog open={!!roleTarget} onClose={() => setRoleTarget(null)}>
        <h2 className="text-lg font-bold">Change role — {roleTarget?.email}</h2>
        <p className="mt-1 text-xs text-text-muted">Only one super admin is allowed. Demoting the last admin is blocked.</p>
        <div className="mt-3 space-y-3">
          <Select label="Role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Button className="w-full" loading={changeRole.isPending}
            onClick={() => roleTarget && changeRole.mutate({ id: roleTarget.id, role: newRole }, { onSuccess: () => setRoleTarget(null) })}>
            Save role
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
