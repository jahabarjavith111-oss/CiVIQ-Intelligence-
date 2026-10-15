import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCopilotStore } from '@/store/copilotStore';
import { useCopilot } from '@/hooks/useCopilot';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Send, Bot, User as UserIcon, ShieldCheck } from 'lucide-react';

const SUGGESTIONS = ['Quantity of concrete in L3?', 'Why is the project 12 days behind?', 'Top 3 risks and mitigations?', 'Beam B-204 vs duct clash — resolve?', 'What if steel +10%?'];

export default function CopilotPage() {
  const { projectId } = useParams();
  const activeId = useCopilotStore((s) => s.activeConversationId);
  const conversations = useCopilotStore((s) => s.conversations);
  const createLocalConversation = useCopilotStore((s) => s.createLocalConversation);

  useEffect(() => {
    if (!activeId) createLocalConversation(projectId);
  }, [activeId, createLocalConversation, projectId]);

  const conv = conversations.find((c) => c.id === activeId);
  const { send } = useCopilot(activeId ?? undefined, projectId);
  const [text, setText] = useState('');

  const ask = (q: string) => { if (!q.trim() || send.isPending) return; setText(''); send.mutate(q); };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="flex h-[640px] flex-col lg:col-span-2">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Bot className="h-5 w-5 text-blue-700 dark:text-sky-400" />
          <p className="font-bold">CivIQ Copilot</p>
          <Badge tone="low">intent + tools + evidence</Badge>
          {send.isPending && <Badge tone="medium">thinking…</Badge>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {(conv?.messages ?? []).length === 0 && (
            <div className="text-sm text-text-muted">
              <p>Ask about drawings, quantities, BOQ, cost, schedule, risks, clashes, revisions, the 3D model, what-ifs, or reports.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-3">{s}</button>)}
              </div>
            </div>
          )}
          {(conv?.messages ?? []).map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-sky-500/15"><Bot className="h-4 w-4 text-blue-700 dark:text-sky-400" /></span>}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-inverse text-on-inverse' : 'bg-surface-3'}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.intent && <p className="mt-1 text-[11px] opacity-60">intent: {m.intent} • <ShieldCheck className="inline h-3 w-3" /> {m.verification}</p>}
              </div>
              {m.role === 'user' && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3"><UserIcon className="h-4 w-4" /></span>}
            </div>
          ))}
          {send.isPending && <p className="text-xs text-text-muted">Retrieving project data → running tool → verifying…</p>}
        </div>
        <div className="flex gap-2 border-t border-border pt-3">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(text)}
            placeholder="Ask anything about this project…" className="h-11 flex-1 rounded-xl border border-strong px-3 text-sm outline-none focus:ring-2" />
          <Button aria-label="Send message" onClick={() => ask(text)} loading={send.isPending}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
      <Card className="h-fit">
        <p className="font-semibold">Evidence & verification</p>
        <p className="mt-1 text-xs text-text-muted">Every answer cites sources: drawings, model elements, BOQ, schedule, risks.</p>
        <div className="mt-3 space-y-2 text-xs">
          <div className="rounded-lg bg-surface-2 p-2">TK-101…TK-118 • E-2041…E-2310 • CB-2026-09</div>
          <div className="rounded-lg bg-surface-2 p-2">BL-01 baseline • CR-41 clash run • R-07 risk</div>
        </div>
        <p className="mt-3 text-xs text-text-muted">Pipeline: question → intent → retrieve → tool → verify → evidence → answer.</p>
      </Card>
    </div>
  );
}
