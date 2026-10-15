import { useMutation, useQuery } from '@tanstack/react-query';
import { copilotApi } from '@/services/copilot.api';
import { useCopilotStore } from '@/store/copilotStore';
import { useUiStore } from '@/store/uiStore';
import type { CopilotIntent } from '@/types/copilot';

const KEYWORDS: { intent: CopilotIntent; keys: string[] }[] = [
  { intent: 'quantity_calculation', keys: ['quantity', 'how much concrete', 'how much steel', 'takeoff', 'measure'] },
  { intent: 'cost_analysis', keys: ['cost', 'budget', 'estimate', 'price', 'variance', 'forecast'] },
  { intent: 'schedule_analysis', keys: ['schedule', 'gantt', 'delay', 'critical path', 'milestone', 'duration'] },
  { intent: 'risk_analysis', keys: ['risk', 'mitigation', 'monte carlo', 'threat'] },
  { intent: 'conflict_analysis', keys: ['conflict', 'clash', 'coordination', 'interference'] },
  { intent: 'revision_analysis', keys: ['revision', 'change', 'v1', 'v2', 'diff'] },
  { intent: 'drawing_analysis', keys: ['drawing', 'plan', 'ocr', 'wall', 'column', 'door'] },
  { intent: 'model_query', keys: ['3d', 'model', 'element', 'floor', 'bim', 'ifc'] },
  { intent: 'what_if', keys: ['what if', 'scenario', 'simulate', 'if steel', 'what-if'] },
  { intent: 'report_question', keys: ['report', 'pdf', 'export'] },
  { intent: 'boq_analysis', keys: ['boq', 'rate analysis', 'work package', 'bill of quantities'] },
];

export function detectLocalIntent(message: string): CopilotIntent {
  const lower = message.toLowerCase();
  for (const { intent, keys } of KEYWORDS) {
    if (keys.some((k) => lower.includes(k))) return intent;
  }
  return 'project_question';
}

const MOCK_ANSWERS: Record<CopilotIntent, string> = {
  quantity_calculation: 'Based on the latest takeoff linked to drawings A-101…A-104 and the 3D model (L2–L5), total concrete is **1,240 m³** (footings 320 m³, columns 210 m³, slabs 710 m³). Evidence: Takeoff items TK-101…TK-118, Model elements E-2041…E-2310.',
  cost_analysis: 'Current forecast is **₹4.82 Cr vs ₹4.50 Cr budget (+7.1%)**. Drivers: steel +10% (+₹14.2L), labour productivity −5% (+₹6.8L). Material=58%, Labour=24%, Equipment=9%, Overhead+Tax=9%. Evidence: Cost breakdown CB-2026-09, variance VAR-14.',
  schedule_analysis: 'Project is **12 days behind baseline**. Critical path: Footings → Columns L2 → Slab L3 → MEP rough-in. SPI=0.91. At-risk milestones: Slab L5 (Oct 28), MEP rough-in L4 (Nov 06). Evidence: baseline BL-01 vs actual.',
  risk_analysis: 'Top risks: R-07 procurement delay (score 20, extreme), R-12 monsoon concreting (16, very-high), R-03 design coordination MEP (15, very-high). Mitigation completion 62%. Recommend expediting steel PO-118 and adding standby pumps.',
  conflict_analysis: 'Open clashes: **23 total** — 4 critical, 9 high. Worst: beam B-204 vs duct D-118 at L3 (+2.85m), clearance 0mm (need 150mm). Assigned to MEP lead, due Oct 12. Evidence: clash run CR-41.',
  revision_analysis: 'V1→V2: **14 added, 6 removed, 22 modified**. Cost impact +₹8.4L (+1.9%), schedule +4 days, material +38 t steel. Biggest change: shear wall SW-3 thickened 200→230mm.',
  drawing_analysis: 'Drawing A-102 (Arch, L3 plan): detected 48 walls, 22 columns, 14 doors, 10 windows, 36 dimensions @ 94% confidence. 2 low-confidence annotations flagged for review (grid C-4, note N-12).',
  model_query: 'Model queries L3: 214 elements (Arch 96, Struct 68, MEP 50). Selected beam B-204 (500×300, 6.2m, M25) links to BOQ item 4.2.3 (₹18,400) and activity SCH-118.',
  what_if: 'Scenario steel +10%, labour −5%, duration −20d: cost +₹21.0L (+4.6%), schedule recovers 14 days (net −6d vs baseline), risk score +3 (procurement). Recommend locking steel rate with supplier B.',
  report_question: 'I can generate: Project, Drawing Analysis, Takeoff, BOQ, Cost, Schedule, Conflict, Revision, Risk, AI Insights, or Complete report. Tell me the type + date range and I will queue it under /reports.',
  boq_analysis: 'BOQ total **₹4.50 Cr across 6 work packages** (Structure 38%, Finishes 22%, MEP 20%). 12 items unpriced, 3 rate analyses pending approval. Highest variance: WP-3 concrete (+6.2%).',
  project_question: 'Project "Greenview Residency" is 42% complete, health 76/100 (cost 71, schedule 68, quality 84). Budget ₹4.50 Cr, spent ₹1.92 Cr, forecast ₹4.82 Cr. 23 open clashes, 5 high risks, next milestone Slab L5 on Oct 28.',
};

const _serverConvMap = new Map<string, string>();
function useCopilotServerMap() {
  return _serverConvMap;
}

export function useCopilot(conversationId?: string, projectId?: string) {
  const store = useCopilotStore();
  const toast = useUiStore((s) => s.pushToast);

  const conversationsQuery = useQuery({
    queryKey: ['copilot', 'conversations', projectId],
    queryFn: async () => {
      try {
        return (await copilotApi.getConversations(projectId)).data;
      } catch {
        return store.conversations;
      }
    },
  });

  // Maps local conversation ids -> server conversation ids (backend mode).
  const serverConv = useCopilotServerMap();

  const send = useMutation({
    mutationFn: async (content: string) => {
      const intent = detectLocalIntent(content);
      const backendMode = import.meta.env.VITE_USE_MSW === 'false';
      // Backend live: ensure a server conversation, send there, persist + compute for real.
      if (backendMode) {
        try {
          const localId = conversationId ?? 'default';
          let cid = serverConv.get(localId);
          if (!cid) {
            cid = (await copilotApi.createConversation(projectId)).data.id;
            serverConv.set(localId, cid);
          }
          const res = await copilotApi.sendMessage(cid, content, projectId ? { projectId } : undefined);
          return { intent, answer: res.data.message.content, server: true as const };
        } catch { /* fall through to local answer */ }
      }
      // simulate latency + streaming
      await new Promise((r) => setTimeout(r, 600));
      return { intent, answer: MOCK_ANSWERS[intent], server: false as const };
    },
    onSuccess: (res, content) => {
      const cid = conversationId ?? store.activeConversationId;
      if (!cid) return;
      const now = new Date().toISOString();
      store.appendMessage(cid, {
        id: `m-${Date.now()}-u`, conversationId: cid, role: 'user', content,
        evidence: [], verification: 'verified', createdAt: now,
      });
      store.appendMessage(cid, {
        id: `m-${Date.now()}-a`, conversationId: cid, role: 'assistant', content: res.answer,
        intent: res.intent,
        evidence: [{ id: `e-${Date.now()}`, type: 'document', sourceId: res.server ? 'api' : 'mock', sourceName: res.server ? 'CivIQ backend (PostgreSQL)' : 'Mock project data (MSW)', excerpt: res.answer.slice(0, 160), relevance: 0.9 }],
        verification: 'verified', createdAt: now,
      });
    },
    onError: () => toast({ title: 'Copilot could not answer', variant: 'error' }),
  });

  return { ...store, conversationsQuery, send, detectLocalIntent };
}
