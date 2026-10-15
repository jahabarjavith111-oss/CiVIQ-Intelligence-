import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-border bg-surface p-5 shadow-sm', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-text-primary', className)}>{children}</h3>;
}

export function CardSub({ children }: { children: ReactNode }) {
  return <p className="text-xs text-text-muted">{children}</p>;
}
