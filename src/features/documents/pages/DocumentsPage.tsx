import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi, type DocumentItem } from '@/services/reports.api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEMO_PROJECT_ID } from '@/utils/constants';
import { useUiStore } from '@/store/uiStore';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { downloadBlob } from '@/utils/export';
import { Upload, FolderOpen, Download, FileText } from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { EmptyState } from '@/components/common/EmptyState';

const FOLDER_ROUTES: Record<string, string> = {
  'Drawings': '/drawings',
  'BOQ & Cost': '/boq',
  'Reports': '/reports',
};

export default function DocumentsPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId) ?? DEMO_PROJECT_ID;
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => (await documentsApi.list(projectId)).data,
  });

  const upload = useMutation({
    mutationFn: (file: File) => documentsApi.upload(projectId, file).then((r) => r.data),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      toast({ title: 'Document uploaded', description: doc.name, variant: 'success' });
    },
    onError: () => toast({ title: 'Document upload failed', variant: 'error' }),
  });

  const dl = useMutation({
    mutationFn: (doc: DocumentItem) => documentsApi.download(doc.id).then((r) => ({ doc, blob: r.data as Blob })),
    onSuccess: ({ doc, blob }) => downloadBlob(doc.name, blob),
    onError: () => toast({ title: 'Download failed', variant: 'error' }),
  });

  const docs = q.data ?? [];
  const groups = docs.reduce<Record<string, DocumentItem[]>>((acc, d) => {
    const folder = d.folder ?? 'General';
    acc[folder] = [...(acc[folder] ?? []), d];
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div>
          <Button loading={upload.isPending} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>
          <input ref={fileRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
        </div>
      </div>
      {q.isLoading ? <PageLoader /> : q.isError ? (
        <QueryErrorState title="Could not load documents" onRetry={() => q.refetch()} />
      ) : docs.length === 0 ? (
        <EmptyState title="No documents yet" sub="Upload project files to organize them here." />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(groups).map(([folder, files]) => {
              const route = FOLDER_ROUTES[folder];
              const body = (
                <Card>
                  <p className="flex items-center gap-2 font-semibold"><FolderOpen className="h-4 w-4" /> {folder}</p>
                  <p className="mt-1 text-xs text-text-muted">{files.length} file(s) • Versioned • preview via PDF.js</p>
                </Card>
              );
              return route ? <Link key={folder} to={route}>{body}</Link> : <div key={folder}>{body}</div>;
            })}
          </div>
          <Card>
            <CardTitle>All files</CardTitle>
            <div className="mt-3 space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                  <span className="font-medium">{d.name}</span>
                  <Badge tone="low">v{d.version}</Badge>
                  <span className="text-xs text-text-muted">{d.folder}</span>
                  <Button size="sm" variant="ghost" className="ml-auto" aria-label={`Download ${d.name}`} loading={dl.isPending} onClick={() => dl.mutate(d)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
