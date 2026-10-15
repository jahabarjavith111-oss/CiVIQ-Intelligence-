import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/notifications.api';
import { useUiStore } from '@/store/uiStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useState } from 'react';
import { timeAgo } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { BellRing } from 'lucide-react';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState('all');
  const q = useQuery({
    queryKey: ['notifications', tab],
    queryFn: async () => (await notificationsApi.list({ unreadOnly: tab === 'unread' })).data,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast({ title: 'Could not mark as read', variant: 'error' }),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast({ title: 'Could not mark all as read', variant: 'error' }),
  });

  const items = q.data?.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications {q.data && q.data.unread > 0 && <Badge tone="critical">{q.data.unread} unread</Badge>}</h1>
        <Button variant="outline" onClick={() => markAll.mutate()}>Mark all read</Button>
      </div>
      <Tabs tabs={[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }]} active={tab} onChange={setTab} />
      {q.isLoading ? <PageLoader /> : q.isError ? (
        <QueryErrorState title="Could not load notifications" onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="All caught up" sub="New clashes, risks, mentions and assignments land here." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.read ? 'opacity-70' : 'border-l-4 border-l-blue-600'}>
              <div className="flex items-start gap-3">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{n.title} <Badge tone="low">{n.type}</Badge></p>
                  <p className="mt-0.5 text-sm text-text-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-text-muted">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {n.link && <Button size="sm" variant="outline" onClick={() => navigate(n.link!)}>Open</Button>}
                  {!n.read && <Button size="sm" variant="ghost" aria-label="Mark as read" onClick={() => markRead.mutate(n.id)}>✓</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
