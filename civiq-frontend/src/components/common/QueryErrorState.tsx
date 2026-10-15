import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function QueryErrorState({ title = 'Could not load data', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-500/30 dark:bg-red-500/10">
      <TriangleAlert className="h-8 w-8 text-red-500" />
      <div>
        <p className="font-semibold text-red-900 dark:text-red-200">{title}</p>
        <p className="mt-1 text-sm text-red-700 dark:text-red-300/80">Check your connection and try again.</p>
      </div>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
    </div>
  );
}
