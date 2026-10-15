import { cn } from '@/lib/utils';

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.key === active);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next.key);
    e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next.key}"]`)?.focus();
  };
  return (
    <div role="tablist" onKeyDown={onKeyDown} className="flex gap-1 rounded-xl bg-surface-3 p-1">
      {tabs.map((t) => (
        <button key={t.key} role="tab" data-tab={t.key} aria-selected={active === t.key} tabIndex={active === t.key ? 0 : -1}
          onClick={() => onChange(t.key)}
          className={cn('rounded-lg px-4 py-2 text-sm font-medium transition', active === t.key ? 'bg-surface text-text-primary shadow' : 'text-text-muted hover:text-text-secondary')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
