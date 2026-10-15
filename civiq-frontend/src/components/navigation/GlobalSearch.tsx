import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { MODULES } from '@/app/config';

export function GlobalSearch({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const [q, setQ] = useState('');
  const results = q ? MODULES.filter((m) => m.label.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <div>
      <Input placeholder="Global search…" value={q} onChange={(e) => setQ(e.target.value)} />
      {q && (
        <div className="mt-2 rounded-xl border border-border bg-surface p-1 shadow">
          {results.map((r) => (
            <button key={r.key} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-3" onClick={() => onNavigate?.(r.route)}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
