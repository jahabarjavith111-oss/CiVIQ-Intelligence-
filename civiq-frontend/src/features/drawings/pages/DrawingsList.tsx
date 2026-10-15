import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDrawing } from '@/hooks/useDrawing';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { useUiStore } from '@/store/uiStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Upload, FileImage } from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';

export default function DrawingsList() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const { listQuery, upload } = useDrawing(projectId);
  const toast = useUiStore((s) => s.pushToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(
      { projectId, data: { projectId, file, type: 'architectural' } },
      { onSuccess: () => toast({ title: 'Drawing uploaded', description: file.name, variant: 'success' }) },
    );
  };

  if (listQuery.isLoading) return <PageLoader />;
  if (listQuery.isError) return <QueryErrorState title="Could not load drawings" onRetry={() => listQuery.refetch()} />;
  if ((listQuery.data ?? []).length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Drawing Intelligence</h1>
        </div>
        <EmptyState title="No drawings yet" sub="Upload a PDF or DWG to run AI analysis." />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drawing Intelligence</h1>
        <div>
          <Button loading={upload.isPending} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload PDF / DWG</Button>
          <input ref={fileRef} type="file" accept=".pdf,.dwg,.png,.jpg,.jpeg" className="hidden"
            onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(listQuery.data ?? []).map((d) => (
          <Link key={d.id} to={`/drawings/${d.id}`}>
            <Card className="transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-sky-500/15"><FileImage className="h-5 w-5 text-blue-700 dark:text-sky-400" /></span>
                <div><p className="font-semibold">{d.name}</p><p className="text-xs text-text-muted">{d.type} • v{d.version} • {d.pages} page(s)</p></div>
                <span className="ml-auto"><Badge tone={d.status === 'analyzed' ? 'low' : 'medium'}>{d.status}</Badge></span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
