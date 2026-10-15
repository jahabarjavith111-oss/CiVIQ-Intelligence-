import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDrawingDetail } from '@/hooks/useDrawing';
import { drawingsApi } from '@/services/drawings.api';
import { useUiStore } from '@/store/uiStore';
import { PdfViewer } from '../components/PdfViewer';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/common/PageLoader';
import { QueryErrorState } from '@/components/common/QueryErrorState';

const ELEMENTS = [
  { t: 'Walls', c: 48, conf: 96 }, { t: 'Columns', c: 22, conf: 94 }, { t: 'Doors', c: 14, conf: 92 },
  { t: 'Windows', c: 10, conf: 91 }, { t: 'Dimensions', c: 36, conf: 89 }, { t: 'Annotations', c: 12, conf: 78 },
];

const OCR_FALLBACK = [
  '“GRID C-4 — verify offset 150mm” (title)',
  '“4500 c/c” (dimension, p1)',
  '“M25 / Fe550 — notes N-12” (spec)',
];

export default function DrawingDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);
  const { detailQuery, analysisQuery } = useDrawingDetail(id);
  const analyze = useMutation({
    mutationFn: () => drawingsApi.analyze(id!).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drawing', id, 'analysis'] });
      toast({ title: 'AI analysis complete', variant: 'success' });
    },
    onError: () => toast({ title: 'AI analysis failed', variant: 'error' }),
  });
  if (detailQuery.isLoading) return <PageLoader />;
  if (detailQuery.isError) return <QueryErrorState title="Could not load drawing" onRetry={() => detailQuery.refetch()} />;
  const d = detailQuery.data;
  const analysis = analysisQuery.data;
  const conf = analysis?.confidence ?? 0.94;
  const elementRows = analysis && analysis.elements.length > 0
    ? Object.entries(
        analysis.elements.reduce<Record<string, { c: number; sum: number }>>((acc, el) => {
          const cur = acc[el.type] ?? { c: 0, sum: 0 };
          acc[el.type] = { c: cur.c + 1, sum: cur.sum + el.confidence };
          return acc;
        }, {}),
      ).map(([t, v]) => ({ t: t[0].toUpperCase() + t.slice(1), c: v.c, conf: Math.round((v.sum / v.c) * 100) }))
    : ELEMENTS;
  const ocrRows = analysis && analysis.ocrText.length > 0
    ? analysis.ocrText.map((o) => `“${o.text}” (${o.type}, p${o.bbox.page})`)
    : OCR_FALLBACK;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex items-center justify-between">
          <CardTitle>{d?.name}</CardTitle>
          <Badge tone="low">confidence {Math.round(conf * 100)}%</Badge>
        </div>
        <div className="mt-3">
          <PdfViewer fileUrl={d?.fileUrl} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button loading={analyze.isPending} onClick={() => analyze.mutate()}>Run AI analysis</Button>
          <span className="self-center text-xs text-text-muted">Hover dashed regions for evidence • upload a PDF to render it live</span>
        </div>
      </Card>
      <Card>
        <CardTitle>Detected elements</CardTitle>
        <div className="mt-3 space-y-2">
          {elementRows.map((e) => (
            <div key={e.t} className="flex items-center justify-between text-sm">
              <span>{e.t} <span className="text-text-muted">×{e.c}</span></span>
              <Badge tone={e.conf >= 90 ? 'low' : 'medium'}>{e.conf}%</Badge>
            </div>
          ))}
        </div>
        <CardTitle><span className="mt-5 block">OCR excerpts</span></CardTitle>
        <ul className="mt-2 space-y-1 text-xs text-text-muted">
          {ocrRows.map((o) => <li key={o}>{o}</li>)}
        </ul>
      </Card>
    </div>
  );
}
