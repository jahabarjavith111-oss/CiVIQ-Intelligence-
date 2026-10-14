import { useUiStore } from '@/store/uiStore';
import { X } from 'lucide-react';

export function Toasts() {
  const { toasts, dismissToast } = useUiStore();
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role={t.variant === 'error' ? 'alert' : 'status'} className="rounded-xl border border-border bg-surface p-3 text-text-primary shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="text-xs text-text-muted">{t.description}</p>}
            </div>
            <button aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}><X className="h-4 w-4 text-text-muted" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
