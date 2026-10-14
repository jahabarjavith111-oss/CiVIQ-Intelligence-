import { ReactNode } from 'react';
export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-strong bg-surface p-10 text-center">
      <p className="font-semibold text-text-primary">{title}</p>
      {sub && <p className="mt-1 text-sm text-text-muted">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
