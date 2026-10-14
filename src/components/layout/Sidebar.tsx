import { NavLink, useParams } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, FileImage, Box, Bot, Ruler, ListTree, IndianRupee, CalendarDays, GitMerge, GitCompareArrows, TriangleAlert, FlaskConical, BarChart3, Files, FileOutput, Activity, Users, Bell, ChevronLeft } from 'lucide-react';
import { MODULES } from '@/app/config';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/Logo';

const ICONS: Record<string, unknown> = {
  'layout-dashboard': LayoutDashboard, 'folder-kanban': FolderKanban, 'file-image': FileImage,
  cube: Box, bot: Bot, ruler: Ruler, 'list-tree': ListTree, 'dollar-sign': IndianRupee,
  calendar: CalendarDays, 'git-merge': GitMerge, 'git-compare': GitCompareArrows,
  'alert-triangle': TriangleAlert, 'flask-conical': FlaskConical, 'bar-chart-3': BarChart3,
  'file-text': Files, 'file-output': FileOutput,
  activity: Activity, users: Users, bell: Bell,
};

export function Sidebar() {
  const { projectId } = useParams();
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const toggle = useWorkspaceStore((s) => s.toggleSidebar);
  const activeProject = useWorkspaceStore((s) => s.activeProjectId) ?? projectId;

  const routeFor = (route: string) => {
    if (!activeProject) return route;
    if (route === '/model-3d') return `/projects/${activeProject}/model-3d`;
    if (route === '/copilot') return `/projects/${activeProject}/copilot`;
    return route;
  };

  return (
    <aside className={cn('hidden h-screen flex-col border-r border-border bg-surface lg:flex', collapsed ? 'w-16' : 'w-64')}>
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Logo variant="mark" />
        {!collapsed && <div><p className="font-bold leading-none">Civ<span className="text-blue-600 dark:text-sky-400">IQ</span></p><p className="text-[10px] text-text-muted">Construction Intelligence</p></div>}
        <button aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggle} className="ml-auto rounded p-1 text-text-muted hover:bg-surface-3"><ChevronLeft className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {MODULES.map((m) => {
          const Icon = ICONS[m.icon] as React.ComponentType<{ className?: string }>;
          return (
            <NavLink key={m.key} to={routeFor(m.route)}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-inverse text-on-inverse' : 'text-text-secondary hover:bg-surface-3')}>
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {!collapsed && <span className="truncate">{m.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      {!collapsed && <div className="border-t border-border p-3 text-[11px] text-text-muted">CivIQ v0.1 • 10-day MVP</div>}
    </aside>
  );
}
