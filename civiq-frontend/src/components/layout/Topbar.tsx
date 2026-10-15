import { Bell, Search, Command, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { notificationsApi } from '@/services/notifications.api';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const setPalette = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => (await notificationsApi.list({ unreadOnly: true, limit: 1 })).data.unread,
    refetchInterval: 60_000,
  });
  const unread = unreadQuery.data ?? 0;

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4">
      <ProjectSwitcher />
      <button onClick={() => setPalette(true)}
        className="hidden items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted md:flex">
        <Search className="h-4 w-4" /> Search projects, drawings, elements…
        <kbd className="ml-6 flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px]"><Command className="h-3 w-3" />K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <button aria-label="Notifications" onClick={() => navigate('/notifications')} className="relative rounded-lg p-2 text-text-secondary hover:bg-surface-3">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-inverse text-xs text-on-inverse"><User className="h-4 w-4" /></span>
          <span className="hidden text-sm font-medium sm:block">{user?.name ?? 'Demo Engineer'}</span>
          <button className="text-xs text-text-muted hover:text-text-secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>Logout</button>
        </div>
      </div>
    </header>
  );
}
