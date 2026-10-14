import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ZoomIn, ZoomOut } from 'lucide-react';

export interface EvidenceBox {
  id: string;
  page: number;
  x: number; // 0-1 normalized
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
}

const SAMPLE_EVIDENCE: EvidenceBox[] = [
  { id: 'e1', page: 1, x: 0.18, y: 0.22, w: 0.5, h: 0.08, label: 'Grid C-4 — verify offset 150mm', confidence: 78 },
  { id: 'e2', page: 1, x: 0.3, y: 0.55, w: 0.2, h: 0.12, label: 'Column C-12 500×300', confidence: 94 },
  { id: 'e3', page: 1, x: 0.62, y: 0.35, w: 0.18, h: 0.1, label: 'Door D-07 1200', confidence: 92 },
];

function drawSamplePlan(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const W = (canvas.width = 900);
  const H = (canvas.height = 620);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#cbd5e1';
  for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // outer walls
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 6;
  ctx.strokeRect(120, 90, 660, 420);
  // internal partitions
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(380, 90); ctx.lineTo(380, 510); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(120, 300); ctx.lineTo(380, 300); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(380, 300); ctx.lineTo(780, 300); ctx.stroke();
  // columns
  ctx.fillStyle = '#1e3a5f';
  [[120, 90], [380, 90], [640, 90], [780, 90], [120, 300], [380, 300], [640, 300], [780, 300], [120, 510], [380, 510], [640, 510], [780, 510]].forEach(([x, y]) => ctx.fillRect(x - 8, y - 8, 16, 16));
  // door gaps
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(230, 84, 46, 12); ctx.fillRect(560, 294, 46, 12);
  // dimensions
  ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 1.5; ctx.fillStyle = '#0d9488'; ctx.font = '13px sans-serif';
  ctx.beginPath(); ctx.moveTo(120, 60); ctx.lineTo(780, 60); ctx.stroke();
  ctx.fillText('22 000', 470, 52);
  ctx.beginPath(); ctx.moveTo(95, 90); ctx.lineTo(95, 510); ctx.stroke();
  ctx.fillText('14 000', 40, 305);
  ctx.fillStyle = '#64748b'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText('A-101 • SAMPLE PLAN (no PDF uploaded yet)', 200, 560);
}

/** Real PDF.js viewer. Renders fileUrl; falls back to a drawn sample plan when unreachable. */
export function PdfViewer({ fileUrl, evidence = SAMPLE_EVIDENCE }: { fileUrl?: string; evidence?: EvidenceBox[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [mode, setMode] = useState<'pdf' | 'sample' | 'loading'>('loading');
  const [hover, setHover] = useState<EvidenceBox | null>(null);
  const docRef = useRef<{ numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMode('loading');
      if (!fileUrl) { setMode('sample'); setPages(1); return; }
      try {
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
        const doc = await (pdfjs as { getDocument: (u: string) => { promise: Promise<never> } }).getDocument(fileUrl).promise;
        if (cancelled) return;
        docRef.current = doc as never;
        setPages((doc as unknown as { numPages: number }).numPages);
        setMode('pdf');
      } catch {
        if (!cancelled) setMode('sample');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fileUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (mode === 'sample' || mode === 'loading') {
      drawSamplePlan(canvas);
      return;
    }
    (async () => {
      const pg = await docRef.current!.getPage(Math.min(page, pages));
      const viewport = pg.getViewport({ scale: zoom });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pg.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    })();
  }, [mode, page, pages, zoom]);

  const boxes = evidence.filter((e) => e.page === page);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
        <span className="text-xs text-text-muted">Page {page} / {pages}</span>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        <span className="ml-auto flex items-center gap-1">
          <button aria-label="Zoom out" className="rounded p-1 hover:bg-surface-3" onClick={() => setZoom(Math.max(0.5, +(zoom - 0.2).toFixed(1)))}><ZoomOut className="h-4 w-4" /></button>
          <span className="text-xs">{Math.round(zoom * 100)}%</span>
          <button aria-label="Zoom in" className="rounded p-1 hover:bg-surface-3" onClick={() => setZoom(+(zoom + 0.2).toFixed(1))}><ZoomIn className="h-4 w-4" /></button>
        </span>
        <Badge tone={mode === 'pdf' ? 'low' : 'medium'}>{mode === 'pdf' ? 'PDF.js live' : mode === 'sample' ? 'sample plan' : 'loading…'}</Badge>
      </div>
      <div className="relative mt-3 overflow-auto rounded-xl border border-border bg-surface-2">
        <canvas ref={canvasRef} className="mx-auto block max-w-full" />
        {boxes.map((b) => (
          <div key={b.id}
            onMouseEnter={() => setHover(b)} onMouseLeave={() => setHover(null)}
            className="absolute cursor-pointer rounded border-2 border-dashed"
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, borderColor: b.confidence >= 90 ? '#0d9488' : '#f59e0b', background: 'rgba(13,148,136,0.08)' }} />
        ))}
        {hover && (
          <div className="absolute rounded-lg bg-inverse px-2 py-1 text-[11px] text-on-inverse"
            style={{ left: `${Math.min(hover.x * 100, 60)}%`, top: `calc(${hover.y * 100}% - 30px)` }}>
            {hover.label} • {hover.confidence}%
          </div>
        )}
      </div>
    </div>
  );
}
