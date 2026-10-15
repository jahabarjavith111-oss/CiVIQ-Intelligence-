import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dialog({ open, onClose, children, className, label }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; label?: string }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>('button, [href], input, select, textarea');
      (first ?? panel)?.focus();
    }, 0);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label ?? 'Dialog'} tabIndex={-1}
        className={cn('w-full max-w-lg rounded-2xl bg-surface p-6 text-text-primary shadow-xl outline-none', className)} onClick={(e) => e.stopPropagation()}>
        <button aria-label="Close dialog" className="float-right rounded p-1 text-text-muted hover:bg-surface-3" onClick={onClose}><X className="h-4 w-4" /></button>
        {children}
      </div>
    </div>
  );
}

export function Modal(props: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  return <Dialog {...props} />;
}
