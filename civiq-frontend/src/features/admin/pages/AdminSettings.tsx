import { useState } from 'react';
import { useAdminSettings, useUpdateSetting } from '../useAdmin';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { formatDateTime } from '@/utils/formatters';

const LABELS: Record<string, { label: string; hint: string; secret?: boolean }> = {
  'upload.max_mb': { label: 'Max upload size (MB)', hint: 'Drawings and 3D models above this are rejected with 413. Range 1–1024.' },
  'ai.provider': { label: 'AI provider', hint: '"local" keyword responder or "openai-compatible". Takes effect immediately.' },
  'ai.model': { label: 'AI model', hint: 'Model name sent to the chat-completions endpoint.' },
  'ai.base_url': { label: 'AI base URL', hint: 'OpenAI-compatible endpoint, e.g. https://api.openai.com/v1. Empty = local mode.', secret: true },
  'ai.api_key': { label: 'AI API key', hint: 'Stored server-side, never exposed. Empty = local mode.', secret: true },
  announcement: { label: 'Platform announcement', hint: 'Banner text for all users. Empty hides it.' },
};

export default function AdminSettings() {
  const q = useAdminSettings();
  const save = useUpdateSetting();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <QueryErrorState title="Could not load platform settings" error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-text-muted">Applied immediately — no backend restart. Every change is audit-logged.</p>
      </div>
      {(q.data ?? []).map((s) => {
        const meta = LABELS[s.key] ?? { label: s.key, hint: '' };
        const shown = drafts[s.key] ?? String(s.value ?? '');
        return (
          <Card key={s.key}>
            <CardTitle>{meta.label} <span className="font-mono text-xs text-text-muted">{s.key}</span></CardTitle>
            <p className="mt-0.5 text-xs text-text-muted">{meta.hint}</p>
            <div className="mt-2 flex gap-2">
              <Input type={meta.secret ? 'password' : 'text'} value={shown}
                onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
                placeholder={meta.secret && shown ? '•••••• (unchanged)' : ''} />
              <Button
                loading={save.isPending}
                disabled={shown === String(s.value ?? '')}
                onClick={() => {
                  const v = s.key === 'upload.max_mb' ? Number(shown) : shown;
                  save.mutate({ key: s.key, value: v });
                }}>
                Save
              </Button>
            </div>
            {s.updatedAt && <p className="mt-1 text-[11px] text-text-muted">Last updated {formatDateTime(s.updatedAt)}</p>}
          </Card>
        );
      })}
    </div>
  );
}
