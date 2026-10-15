import { useProject } from '@/hooks/useProject';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useState } from 'react';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProjectSwitcher() {
  const { listQuery } = useProject();
  const activeId = useWorkspaceStore((s) => s.activeProjectId);
  const setActive = useWorkspaceStore((s) => s.setActiveProject);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const projects = listQuery.data ?? [];
  const active = projects.find((p) => p.id === activeId) ?? projects[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">
        <span className="max-w-48 truncate">{active?.name ?? 'Select project'}</span>
        <ChevronsUpDown className="h-4 w-4 text-text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-50 w-72 rounded-xl border border-border bg-surface p-2 shadow-xl">
          {projects.map((p) => (
            <button key={p.id} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-3"
              onClick={() => { setActive(p.id); setOpen(false); navigate(`/projects/${p.id}`); }}>
              <span className="truncate">{p.name}</span>
              <span className="text-[11px] text-text-muted">{p.status}</span>
            </button>
          ))}
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg bg-inverse px-3 py-2 text-sm text-on-inverse"
            onClick={() => { setOpen(false); navigate('/projects/new'); }}>
            <Plus className="h-4 w-4" /> New project
          </button>
        </div>
      )}
    </div>
  );
}
