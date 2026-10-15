import axios from 'axios';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function QueryErrorState({ title = 'Could not load data', error, onRetry }: { title?: string; error?: unknown; onRetry?: () => void }) {
  const subtitle = describeError(error);
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-500/30 dark:bg-red-500/10">
      <TriangleAlert className="h-8 w-8 text-red-500" />
      <div>
        <p className="font-semibold text-red-900 dark:text-red-200">{title}</p>
        <p className="mt-1 text-sm text-red-700 dark:text-red-300/80">{subtitle}</p>
      </div>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Check your connection and try again.';
    if (error.response.status === 403) {
      return 'You do not have access to this project. Ask an admin to invite you, or pick another project.';
    }
    if (error.response.status === 401) return 'Your session expired. Please sign in again.';
    if (error.response.status === 404) return 'Not found. It may have been deleted or the link is wrong.';
    const detail = (error.response.data as { detail?: unknown })?.detail;
    if (typeof detail === 'string' && detail) return detail;
    return `Request failed (${error.response.status}). Try again.`;
  }
  return 'Check your connection and try again.';
}
