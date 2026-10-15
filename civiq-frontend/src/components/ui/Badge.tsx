import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/utils/constants';

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const cls = (tone && STATUS_COLORS[tone]) || 'bg-surface-3 text-text-secondary';
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>{children}</span>;
}
