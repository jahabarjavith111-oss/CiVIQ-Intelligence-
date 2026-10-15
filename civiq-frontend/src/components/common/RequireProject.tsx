import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { EmptyState } from './EmptyState';
import { Button } from '@/components/ui/Button';
import { FolderKanban, Plus } from 'lucide-react';

/** Active project selected in the workspace (null when nothing is selected). */
export function useActiveProjectId(): string | null {
  return useWorkspaceStore((s) => s.activeProjectId);
}

/**
 * Render instead of a feature page when no project is selected.
 * Prevents firing project-scoped queries that would 403 for users
 * with no project access (previously masked as "connection" errors).
 */
export function NoProjectSelected() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        title="No project selected"
        sub="Pick a project to view its data — or create a new one. New accounts see this until an admin invites them to a project."
        action={
          <div className="flex gap-2">
            <Link to="/projects">
              <Button variant="outline"><FolderKanban className="h-4 w-4" /> Browse projects</Button>
            </Link>
            <Link to="/projects/new">
              <Button><Plus className="h-4 w-4" /> New project</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
