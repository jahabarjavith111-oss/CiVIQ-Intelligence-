import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteSchema, type InviteForm } from '@/utils/validators';
import { teamApi } from '@/services/team.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { NoProjectSelected } from '@/components/common/RequireProject';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useUiStore } from '@/store/uiStore';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, Trash2 } from 'lucide-react';

export default function TeamPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId);
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { register: regInvite, handleSubmit: handleInvite, reset: resetInvite, formState: { errors: inviteErrors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'engineer' },
  });

  const q = useQuery({ queryKey: ['team', projectId], queryFn: async () => (await teamApi.list(projectId!)).data, enabled: !!projectId });

  const invite = useMutation({
    mutationFn: (data: InviteForm) => teamApi.invite(projectId!, data).then((r) => r.data),
    onSuccess: (res) => { toast({ title: `Invited ${res.email}`, variant: 'success' }); setInviteOpen(false); resetInvite(); qc.invalidateQueries({ queryKey: ['team', projectId] }); },
    onError: () => toast({ title: 'Invite failed', variant: 'error' }),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => teamApi.remove(projectId!, userId),
    onSuccess: () => { toast({ title: 'Member removed', variant: 'success' }); qc.invalidateQueries({ queryKey: ['team', projectId] }); },
    onError: () => toast({ title: 'Could not remove member', variant: 'error' }),
  });

  if (!projectId) return <NoProjectSelected />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
        <Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /> Invite member</Button>
      </div>
      <Card>
        <CardTitle>{q.data?.length ?? 0} members</CardTitle>
        {q.isLoading ? <PageLoader /> : q.isError ? (
          <div className="mt-3"><QueryErrorState title="Could not load team" error={q.error} onRetry={() => q.refetch()} /></div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="mt-3"><EmptyState title="No team members yet" sub="Invite the first member to this project." /></div>
        ) : (
          <div className="mt-3">
            <Table head={['Name', 'Email', 'Role', 'Last active', '']}
              rows={(q.data ?? []).map((m) => [
                m.name, m.email,
                <Badge key={m.id} tone="low">{m.projectRole ?? m.role}</Badge>,
                m.lastActive ?? '—',
                <button key={`x-${m.id}`} aria-label={`Remove ${m.name}`} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15" onClick={() => remove.mutate(m.id)} title="Remove"><Trash2 className="h-4 w-4" /></button>,
              ])} />
          </div>
        )}
      </Card>
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} label="Invite to project">
        <h2 className="text-lg font-bold">Invite to project</h2>
        <form onSubmit={handleInvite((d) => invite.mutate(d))} className="mt-3 space-y-3">
          <Input label="Email" placeholder="teammate@company.com" {...regInvite('email')} error={inviteErrors.email?.message} />
          <Select label="Role" {...regInvite('role')}>
            <option value="manager">Manager</option><option value="engineer">Engineer</option><option value="viewer">Viewer</option>
          </Select>
          <Button type="submit" className="w-full" loading={invite.isPending}>Send invite</Button>
        </form>
      </Dialog>
    </div>
  );
}
