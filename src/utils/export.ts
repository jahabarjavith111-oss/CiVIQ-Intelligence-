export function downloadCsv(filename: string, rows: (string | number)[][], headers: string[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function printReport(title: string, sections: { heading: string; body: string }[]) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  const safeTitle = escapeHtml(title);
  w.document.write(`<html><head><title>${safeTitle}</title><style>
    body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a}
    h1{font-size:24px}h2{font-size:16px;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    p,li{font-size:13px;color:#334155}table{border-collapse:collapse;width:100%;font-size:12px}
    td,th{border:1px solid #cbd5e1;padding:6px;text-align:left}
    .meta{color:#64748b;font-size:12px}
  </style></head><body>
    <h1>CivIQ — ${safeTitle}</h1><p class="meta">Generated ${escapeHtml(new Date().toLocaleString('en-IN'))} • ${escapeHtml(reportProjectName())}</p>
    ${sections.map((s) => `<h2>${escapeHtml(s.heading)}</h2><div>${s.body}</div>`).join('')}
    <script>window.onload=()=>window.print()</script>
  </body></html>`);
  w.document.close();
}

function reportProjectName(): string {
  try {
    const raw = localStorage.getItem('civiq-workspace');
    const parsed = raw ? (JSON.parse(raw) as { state?: { activeProjectId?: string } }) : null;
    return parsed?.state?.activeProjectId ?? 'Greenview Residency Tower B';
  } catch {
    return 'Greenview Residency Tower B';
  }
}
