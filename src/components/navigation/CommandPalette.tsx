import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { MODULES } from '@/app/config';

export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.commandPaletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!open); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [open, setOpen]);

  if (!open) return null;
  const results = MODULES.filter((m) => m.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-24 max-w-xl overflow-hidden rounded-2xl bg-surface text-text-primary shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command or search modules…"
          className="w-full border-b border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted" />
        <div className="max-h-80 overflow-y-auto p-2">
          {results.map((m) => (
            <button key={m.key} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-surface-3"
              onClick={() => { navigate(m.route); setOpen(false); setQ(''); }}>
              <span>{m.label}</span><span className="text-xs text-text-muted">{m.route}</span>
            </button>
          ))}
          {results.length === 0 && <p className="p-4 text-sm text-text-muted">No results. Try “3D”, “BOQ”, “risk”…</p>}
        </div>
      </div>
    </div>
  );
}
