import { Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { formatCurrency } from '@/utils/formatters';
import { Plus } from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';

export default function ProjectsList() {
  const { listQuery } = useProject();
  if (listQuery.isLoading) return <PageLoader />;
  if (listQuery.isError) return <QueryErrorState title="Could not load projects" onRetry={() => listQuery.refetch()} />;
  const projects = listQuery.data ?? [];
  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projects</h1>
          <Link to="/projects/new"><Button><Plus className="h-4 w-4" /> New project</Button></Link>
        </div>
        <EmptyState title="No projects yet" sub="Create your first project to get started." action={<Link to="/projects/new"><Button>New project</Button></Link>} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link to="/projects/new"><Button><Plus className="h-4 w-4" /> New project</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`}>
            <Card className="transition hover:shadow-md">
              <div className="flex items-center justify-between"><h3 className="font-semibold">{p.name}</h3><Badge tone={p.status}>{p.status}</Badge></div>
              <p className="mt-1 text-xs text-text-muted">{p.memberCount} members • Health {p.health.overall}</p>
              <Progress value={p.progress} className="mt-3" />
              <p className="mt-2 text-sm">{p.progress}% • {formatCurrency(p.spent)} / {formatCurrency(p.budget)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
