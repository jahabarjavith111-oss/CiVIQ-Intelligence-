import { http, HttpResponse } from 'msw';

const proj = {
  id: 'proj-greenview-01', name: 'Greenview Residency — Tower B',
  description: 'G+10 residential tower, 120 units', status: 'active',
  startDate: '2026-01-15', endDate: '2027-06-30', budget: 45000000, currency: 'INR',
  ownerId: 'u-1', members: [],
  settings: {
    units: 'metric', timezone: 'Asia/Kolkata', language: 'en',
    notifications: { email: true, push: true, inApp: true },
    integrations: {},
  },
  createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
};

const user = { id: 'u-1', email: 'demo@civiq.ai', name: 'Demo Engineer', role: 'project-manager', createdAt: '', updatedAt: '' };

export const handlers = [
  http.post('/api/auth/login', () => HttpResponse.json({ user, accessToken: 'mock-access', refreshToken: 'mock-refresh' })),
  http.post('/api/auth/register', () => HttpResponse.json({ user, accessToken: 'mock-access', refreshToken: 'mock-refresh' })),
  http.post('/api/auth/logout', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/refresh', () => HttpResponse.json({ accessToken: `mock-access-${Date.now()}`, refreshToken: 'mock-refresh' })),
  http.get('/api/auth/me', () => HttpResponse.json(user)),

  http.get('/api/projects', () => HttpResponse.json({ data: [{ id: proj.id, name: proj.name, status: proj.status, health: { overall: 76, cost: 71, schedule: 68, quality: 84, safety: 90, risk: 62 }, progress: 42, budget: 45000000, spent: 19200000, startDate: proj.startDate, endDate: proj.endDate, memberCount: 8 }], total: 1, page: 1, limit: 20 })),
  http.get('/api/projects/:id', () => HttpResponse.json(proj)),
  http.post('/api/projects', () => HttpResponse.json(proj)),
  http.get('/api/projects/:id/health', () => HttpResponse.json({ overall: 76, cost: 71, schedule: 68, quality: 84, safety: 90, risk: 62 })),

  http.get('/api/projects/:projectId/drawings', () => HttpResponse.json({ data: [
    { id: 'dwg-a101', projectId: 'proj-greenview-01', name: 'A-101 Ground Floor Plan', originalName: 'A-101.pdf', type: 'architectural', discipline: 'Arch', version: 2, status: 'analyzed', fileUrl: '/drawings/A-101.pdf', fileSize: 2400000, pages: 1, uploadedBy: 'u-1', createdAt: '', updatedAt: '' },
    { id: 'dwg-s201', projectId: 'proj-greenview-01', name: 'S-201 Framing L3', originalName: 'S-201.pdf', type: 'structural', discipline: 'Struct', version: 1, status: 'analyzed', fileUrl: '/drawings/S-201.pdf', fileSize: 1800000, pages: 1, uploadedBy: 'u-1', createdAt: '', updatedAt: '' },
  ], total: 2, page: 1, limit: 20 })),
  http.get('/api/drawings/:id', ({ params }) => HttpResponse.json({ id: params.id, projectId: 'proj-greenview-01', name: 'A-101', originalName: 'A-101.pdf', type: 'architectural', discipline: 'Arch', version: 2, status: 'analyzed', fileUrl: '', fileSize: 100, pages: 1, uploadedBy: 'u-1', createdAt: '', updatedAt: '' })),
  http.get('/api/drawings/:id/analysis', () => HttpResponse.json({ id: 'an-1', drawingId: 'dwg-a101', status: 'completed', elements: [], ocrText: [], confidence: 0.94 })),
  http.post('/api/projects/:projectId/drawings', async ({ request }) => {
    let name = `upload-${Date.now()}.pdf`;
    let size = 2048;
    let type = 'architectural';
    try {
      const form = await request.formData();
      const file = form.get('file');
      if (typeof File !== 'undefined' && file instanceof File) {
        if (file.name) name = file.name;
        if (file.size) size = file.size;
      }
      const t = form.get('type');
      if (typeof t === 'string' && t) type = t;
    } catch { /* non-multipart body: keep defaults */ }
    return HttpResponse.json({
      id: `dwg-${Date.now()}`, projectId: 'proj-greenview-01', name: name.replace(/\.[^.]+$/, '') || name,
      originalName: name, type, discipline: 'Arch', version: 1, status: 'uploaded',
      fileUrl: '', fileSize: size, pages: 1, uploadedBy: 'u-1',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),
  http.post('/api/drawings/:id/analyze', ({ params }) => HttpResponse.json({
    id: `an-${Date.now()}`, drawingId: params.id, status: 'completed', confidence: 0.94,
    processedAt: new Date().toISOString(),
    elements: [
      { id: 'el-1', type: 'wall', category: 'architecture', bbox: { x: 120, y: 80, width: 640, height: 24, page: 1 }, confidence: 0.97, properties: { material: 'AAC block 200mm' }, evidenceRegion: { page: 1, bbox: { x: 120, y: 80, width: 640, height: 24, page: 1 }, imageUrl: '' } },
      { id: 'el-2', type: 'column', category: 'structure', bbox: { x: 200, y: 200, width: 48, height: 48, page: 1 }, confidence: 0.95, properties: { size: '400x400', grade: 'M30' }, evidenceRegion: { page: 1, bbox: { x: 200, y: 200, width: 48, height: 48, page: 1 }, imageUrl: '' } },
      { id: 'el-3', type: 'door', category: 'architecture', bbox: { x: 420, y: 300, width: 90, height: 12, page: 1 }, confidence: 0.91, properties: { leaf: 'Flush door 900mm' }, evidenceRegion: { page: 1, bbox: { x: 420, y: 300, width: 90, height: 12, page: 1 }, imageUrl: '' } },
    ],
    ocrText: [
      { text: 'GROUND FLOOR PLAN', bbox: { x: 60, y: 40, width: 300, height: 28, page: 1 }, confidence: 0.99, type: 'title' },
      { text: 'GRID C-4', bbox: { x: 520, y: 60, width: 90, height: 18, page: 1 }, confidence: 0.72, type: 'note' },
    ],
  })),

  http.get('/api/projects/:projectId/models', () => HttpResponse.json([{ id: 'mdl-1', projectId: 'proj-greenview-01', name: 'Tower B — Federated', version: 3, fileUrl: '/models/sample.glb', format: 'glb', fileSize: 42000000, metadata: { units: 'metric', boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 30, y: 36, z: 20 } } }, floors: [], elements: [], conflicts: [], createdAt: '', updatedAt: '' }])),
  http.get('/api/models/:id', () => HttpResponse.json({ id: 'mdl-1', projectId: 'proj-greenview-01', name: 'Tower B', version: 3, fileUrl: '/models/sample.glb', format: 'glb', fileSize: 1, metadata: { units: 'metric', boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } }, floors: [], elements: [], conflicts: [], createdAt: '', updatedAt: '' })),
  http.get('/api/models/:id/elements', () => HttpResponse.json([])),
  http.get('/api/models/:id/conflicts', () => HttpResponse.json([])),

  http.get('/api/copilot/conversations', () => HttpResponse.json([])),

  http.get('/api/projects/:projectId/takeoff', () => HttpResponse.json({ data: takeoffDb, total: takeoffDb.length, page: 1, limit: 20 })),
  http.get('/api/projects/:projectId/takeoff/summary', () => HttpResponse.json([
    { trade: 'concrete', itemCount: 24, totalQuantity: 1240, unit: 'm3', lastUpdated: '' },
    { trade: 'steel', itemCount: 31, totalQuantity: 212, unit: 't', lastUpdated: '' },
    { trade: 'bricks', itemCount: 12, totalQuantity: 184000, unit: 'nos', lastUpdated: '' },
    { trade: 'tiles', itemCount: 9, totalQuantity: 8600, unit: 'm2', lastUpdated: '' },
  ])),

  http.get('/api/projects/:projectId/boq/work-packages', () => HttpResponse.json([
    { id: 'wp-1', projectId: 'proj-greenview-01', code: 'WP-01', name: 'Substructure', level: 0, order: 1, items: [], totalAmount: 6800000, currency: 'INR', createdAt: '', updatedAt: '' },
    { id: 'wp-2', projectId: 'proj-greenview-01', code: 'WP-02', name: 'Superstructure', level: 0, order: 2, items: [], totalAmount: 17200000, currency: 'INR', createdAt: '', updatedAt: '' },
  ])),
  http.get('/api/boq/work-packages/:id/items', ({ params }) => {
    const items = boqDb.filter((b) => b.workPackageId === params.id || b.workPackageId === undefined);
    return HttpResponse.json({ data: items, total: items.length, page: 1, limit: 20 });
  }),
  http.get('/api/projects/:projectId/boq/summary', () => HttpResponse.json({ totalItems: 148, totalAmount: 45000000, currency: 'INR',
    byWorkPackage: [
      { workPackageId: 'wp-1', name: 'Substructure', amount: 6800000 },
      { workPackageId: 'wp-2', name: 'Superstructure', amount: 17200000 },
    ],
    byTrade: [
      { trade: 'concrete', amount: 12400000 },
      { trade: 'steel', amount: 9800000 },
      { trade: 'masonry', amount: 5200000 },
      { trade: 'finishes', amount: 8600000 },
      { trade: 'mep', amount: 9000000 },
    ] })),

  http.get('/api/projects/:projectId/cost/budget', () => HttpResponse.json({ projectId: 'proj-greenview-01', totalBudget: 45000000, totalCommitted: 28000000, totalActual: 19200000, totalForecast: 48200000, remainingBudget: 25800000, budgetHealth: 'at-risk', currency: 'INR', byCategory: [{ category: 'material', budgeted: 26000000, actual: 11800000, variance: 1400000 }, { category: 'labour', budgeted: 10000000, actual: 4600000, variance: 680000 }], sCurve: [{ period: '2026-06', planned: 12000000, actual: 10500000, forecast: 11000000 }, { period: '2026-09', planned: 22000000, actual: 19200000, forecast: 20000000 }] })),
  http.get('/api/projects/:projectId/cost/s-curve', () => HttpResponse.json({
    planned: [
      { period: '2026-06', value: 12000000 }, { period: '2026-07', value: 16000000 },
      { period: '2026-08', value: 20000000 }, { period: '2026-09', value: 22000000 },
    ],
    actual: [
      { period: '2026-06', value: 10500000 }, { period: '2026-07', value: 14800000 },
      { period: '2026-08', value: 17200000 }, { period: '2026-09', value: 19200000 },
    ],
    forecast: [
      { period: '2026-06', value: 11000000 }, { period: '2026-07', value: 15200000 },
      { period: '2026-08', value: 18000000 }, { period: '2026-09', value: 20000000 },
    ],
  })),
  http.get('/api/projects/:projectId/cost/breakdown', () => HttpResponse.json([
    { id: 'cb-1', projectId: 'proj-greenview-01', category: 'material', subCategory: 'Steel & cement', budgeted: 26000000, actual: 11800000, committed: 15000000, forecast: 27900000, variance: 1400000, variancePercent: 5.4, currency: 'INR', period: '2026-10', details: [], updatedAt: '' },
    { id: 'cb-2', projectId: 'proj-greenview-01', category: 'labour', subCategory: 'Site labour', budgeted: 10000000, actual: 4600000, committed: 5200000, forecast: 10680000, variance: 680000, variancePercent: 6.8, currency: 'INR', period: '2026-10', details: [], updatedAt: '' },
    { id: 'cb-3', projectId: 'proj-greenview-01', category: 'equipment', subCategory: 'Tower crane & pumps', budgeted: 4200000, actual: 1500000, committed: 2100000, forecast: 4300000, variance: 100000, variancePercent: 2.4, currency: 'INR', period: '2026-10', details: [], updatedAt: '' },
    { id: 'cb-4', projectId: 'proj-greenview-01', category: 'overhead', subCategory: 'Site establishment', budgeted: 2600000, actual: 900000, committed: 1100000, forecast: 2600000, variance: 0, variancePercent: 0, currency: 'INR', period: '2026-10', details: [], updatedAt: '' },
  ])),
  http.get('/api/projects/:projectId/cost/variances', () => HttpResponse.json([])),

  http.get('/api/projects/:projectId/schedule/activities', () => HttpResponse.json({ data: [
    { id: 'sch-1', projectId: 'proj-greenview-01', wbsCode: '1.1', name: 'Footings', type: 'task', status: 'completed', progress: 100, startDate: '2026-02-01', endDate: '2026-03-10', earlyStart: '2026-02-01', earlyFinish: '2026-03-10', lateStart: '2026-02-01', lateFinish: '2026-03-10', duration: 28, remainingDuration: 0, totalFloat: 0, freeFloat: 0, isCritical: true, resources: [], predecessors: [], successors: [], constraints: [], createdAt: '', updatedAt: '' },
    { id: 'sch-2', projectId: 'proj-greenview-01', wbsCode: '1.2', name: 'Columns L2', type: 'task', status: 'in-progress', progress: 55, startDate: '2026-09-01', endDate: '2026-10-20', earlyStart: '2026-09-01', earlyFinish: '2026-10-20', lateStart: '2026-08-28', lateFinish: '2026-10-16', duration: 36, remainingDuration: 16, totalFloat: -4, freeFloat: 0, isCritical: true, resources: [], predecessors: [], successors: [], constraints: [], createdAt: '', updatedAt: '' },
  ], total: 2, page: 1, limit: 20 })),
  http.get('/api/projects/:projectId/schedule/summary', () => HttpResponse.json({ projectId: 'proj-greenview-01', totalActivities: 86, completedActivities: 36, inProgressActivities: 14, notStartedActivities: 36, overallProgress: 42, criticalPathDuration: 412, projectFinish: '2027-07-12', baselineFinish: '2027-06-30', varianceDays: 12, SPI: 0.91, milestones: [] })),
  http.get('/api/projects/:projectId/schedule/critical-path', () => HttpResponse.json({ activities: ['sch-1', 'sch-2'], totalDuration: 412, projectFinish: '2027-07-12' })),

  http.get('/api/projects/:projectId/coordination/conflicts', () => HttpResponse.json({ data: conflictDb, total: conflictDb.length, page: 1, limit: 20 })),
  http.patch('/api/coordination/conflicts/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status?: string; resolution?: string };
    const c = conflictDb.find((x) => x.id === params.id);
    if (c) {
      if (body.status) c.status = body.status;
      if (body.resolution !== undefined) c.resolution = body.resolution;
    }
    return HttpResponse.json(c ?? { ok: true });
  }),
  http.post('/api/coordination/conflicts/:id/assign', async ({ params, request }) => {
    const body = (await request.json()) as { userId?: string };
    const c = conflictDb.find((x) => x.id === params.id);
    if (c) {
      if (body.userId) c.assignedTo = body.userId;
      if (c.status === 'new') c.status = 'in-review';
    }
    return HttpResponse.json(c ?? { ok: true });
  }),
  http.get('/api/projects/:projectId/coordination/trends', () => HttpResponse.json([
    { date: '2026-06', total: 31, bySeverity: { critical: 6, high: 9 }, byStatus: { new: 12, resolved: 15 } },
    { date: '2026-07', total: 28, bySeverity: { critical: 5, high: 8 }, byStatus: { new: 9, resolved: 16 } },
    { date: '2026-08', total: 25, bySeverity: { critical: 4, high: 8 }, byStatus: { new: 7, resolved: 15 } },
    { date: '2026-09', total: 23, bySeverity: { critical: 4, high: 9 }, byStatus: { new: 6, resolved: 14 } },
  ])),
  http.get('/api/projects/:projectId/coordination/summary', () => HttpResponse.json({ projectId: 'proj-greenview-01', total: 23, bySeverity: [], byType: [], byStatus: [], openCritical: 4, resolutionRate: 0.61, avgResolutionTime: 6.2 })),

  http.get('/api/projects/:projectId/revisions', () => HttpResponse.json({ data: [{ id: 'rev-1', projectId: 'proj-greenview-01', fromVersion: 1, toVersion: 2, title: 'SW-3 thickened, grid C shifted', type: 'drawing', status: 'approved', changes: [], impacts: { cost: { magnitude: 'medium', value: 840000, percent: 1.9, description: '+₹8.4L', details: [] }, schedule: { magnitude: 'low', value: 4, percent: 1, description: '+4 days', details: [] }, material: { magnitude: 'medium', value: 38, percent: 4, description: '+38t steel', details: [] }, risk: { magnitude: 'low', value: 1, percent: 2, description: '', details: [] } }, submittedBy: 'u-1', submittedAt: '' }], total: 1 })),

  http.get('/api/projects/:projectId/risks', () => HttpResponse.json({ data: [
    { id: 'r-7', projectId: 'proj-greenview-01', code: 'R-07', title: 'Steel procurement delay', description: 'Supplier B backlog', category: 'procurement', probability: 4, impact: 5, score: 20, rating: 'very-high', status: 'mitigating', ownerId: 'u-1', ownerName: 'Demo', identifiedBy: 'u-1', identifiedAt: '', mitigations: [], triggers: [], relatedEntities: [], createdAt: '', updatedAt: '' },
  ], total: 1, page: 1, limit: 20 })),
  http.get('/api/projects/:projectId/risks/summary', () => HttpResponse.json({ projectId: 'proj-greenview-01', totalRisks: 14,
    byCategory: [
      { category: 'procurement', count: 3, avgScore: 16 },
      { category: 'design', count: 4, avgScore: 12 },
      { category: 'schedule', count: 3, avgScore: 11 },
      { category: 'cost', count: 2, avgScore: 10 },
      { category: 'safety', count: 2, avgScore: 8 },
    ],
    byRating: [
      { rating: 'very-high', count: 3 },
      { rating: 'high', count: 2 },
      { rating: 'medium', count: 6 },
      { rating: 'low', count: 3 },
    ],
    byStatus: [
      { status: 'mitigating', count: 6 },
      { status: 'monitoring', count: 4 },
      { status: 'identified', count: 3 },
      { status: 'closed', count: 1 },
    ],
    topRisks: [], openHighRisks: 5, mitigationCompletionRate: 0.62,
    riskTrend: [
      { date: '2026-06', totalScore: 168, count: 14 },
      { date: '2026-07', totalScore: 152, count: 14 },
      { date: '2026-08', totalScore: 139, count: 13 },
      { date: '2026-09', totalScore: 128, count: 14 },
    ] })),
  http.get('/api/projects/:projectId/risks/trends', () => HttpResponse.json([
    { date: '2026-06', totalScore: 168, count: 14, byCategory: { procurement: 52, design: 48, schedule: 34, cost: 22, safety: 12 } },
    { date: '2026-07', totalScore: 152, count: 14, byCategory: { procurement: 48, design: 44, schedule: 30, cost: 18, safety: 12 } },
    { date: '2026-08', totalScore: 139, count: 13, byCategory: { procurement: 44, design: 40, schedule: 28, cost: 16, safety: 11 } },
    { date: '2026-09', totalScore: 128, count: 14, byCategory: { procurement: 40, design: 36, schedule: 26, cost: 15, safety: 11 } },
  ])),

  http.get('/api/projects/:projectId/simulations', () => HttpResponse.json([])),
  http.post('/api/projects/:projectId/simulations', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: `sim-${Date.now()}`, projectId: 'proj-greenview-01', status: 'draft', createdBy: 'u-1', createdAt: new Date().toISOString(), ...body }, { status: 201 });
  }),
  http.post('/api/simulations/:id/run', ({ params }) => HttpResponse.json({
    id: params.id, status: 'completed',
    results: {
      costImpact: { value: 2100000, percent: 4.6, breakdown: [{ category: 'material', delta: 1420000 }, { category: 'labour', delta: 680000 }] },
      scheduleImpact: { days: -14, criticalPathChanged: true, newFinish: '2027-06-28' },
      riskImpact: { scoreDelta: 3, newRisks: ['procurement'] },
      materialImpact: { items: [{ trade: 'steel', delta: 21, unit: 't' }] },
    },
  })),
  http.get('/api/projects/:projectId/reports', () => HttpResponse.json([])),
  http.post('/api/projects/:projectId/reports', async ({ request }) => {
    const body = (await request.json()) as { name?: string; type?: string } & Record<string, unknown>;
    return HttpResponse.json({ id: `rep-${Date.now()}`, projectId: 'proj-greenview-01', status: 'ready', fileUrl: '', type: 'complete', config: { template: 'standard', sections: ['summary'] }, createdBy: 'u-1', createdAt: new Date().toISOString(), ...body }, { status: 201 });
  }),
  http.get('/api/projects/:projectId/documents', () => HttpResponse.json(docsDb)),
  http.post('/api/projects/:projectId/documents', async ({ request }) => {
    let name = `upload-${Date.now()}.pdf`;
    let size = 1024;
    let folder = 'General';
    try {
      const form = await request.formData();
      const file = form.get('file');
      if (typeof File !== 'undefined' && file instanceof File) {
        if (file.name) name = file.name;
        if (file.size) size = file.size;
      }
      const f = form.get('folder');
      if (typeof f === 'string' && f) folder = f;
    } catch { /* non-multipart body: keep defaults */ }
    const doc = { id: `doc-${Date.now()}`, projectId: 'proj-greenview-01', name, type: name.split('.').pop() ?? 'pdf', fileUrl: '', fileSize: size, version: 1, folder, uploadedBy: 'u-1', createdAt: new Date().toISOString() };
    docsDb.push(doc);
    return HttpResponse.json(doc, { status: 201 });
  }),
  http.get('/api/documents/:id/download', ({ params }) => {
    const doc = docsDb.find((d) => d.id === params.id);
    return HttpResponse.text(`CivIQ document export — ${doc?.name ?? params.id}\nGenerated ${new Date().toISOString()}\n`, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }),

  // ---- auth extras ----
  http.post('/api/auth/forgot-password', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/reset-password', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/verify-email', () => HttpResponse.json({ ok: true })),

  // ---- activity ----
  http.get('/api/projects/:projectId/activity', () => HttpResponse.json({ data: [
    { id: 'a-1', projectId: 'proj-greenview-01', actorId: 'u-2', actorName: 'Ananya', action: 'updated rate on', entityType: 'boq', entityId: 'bq-1', entityName: 'BOQ 4.2.3', createdAt: new Date(Date.now() - 2 * 60000).toISOString() },
    { id: 'a-2', projectId: 'proj-greenview-01', actorId: 'u-3', actorName: 'Site Bot', action: 'ran clash detection', entityType: 'conflict', entityName: 'CR-41 (3 new)', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'a-3', projectId: 'proj-greenview-01', actorId: 'u-4', actorName: 'Ravi', action: 'marked progress on', entityType: 'schedule', entityId: 'sch-2', entityName: 'Columns L2 → 55%', createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: 'a-4', projectId: 'proj-greenview-01', actorId: 'u-2', actorName: 'Ananya', action: 'approved', entityType: 'revision', entityName: 'V1 → V2', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ], total: 4, page: 1, limit: 20 })),

  // ---- team ----
  http.get('/api/projects/:projectId/team', () => HttpResponse.json(teamDb)),
  http.post('/api/projects/:projectId/team/invite', async ({ request }) => {
    const body = (await request.json()) as { email: string; role: string };
    return HttpResponse.json({ invited: true, email: body.email }, { status: 201 });
  }),
  http.delete('/api/projects/:projectId/team/:userId', ({ params }) => {
    const i = teamDb.findIndex((m) => m.id === params.userId);
    if (i >= 0) teamDb.splice(i, 1);
    return HttpResponse.json({ ok: true });
  }),

  // ---- notifications ----
  http.get('/api/notifications', () => HttpResponse.json({ data: notifDb, total: notifDb.length, unread: notifDb.filter((n) => !n.read).length })),
  http.post('/api/notifications/:id/read', ({ params }) => {
    const n = notifDb.find((x) => x.id === params.id);
    if (n) n.read = true;
    return HttpResponse.json(n ?? { ok: true });
  }),
  http.post('/api/notifications/read-all', () => {
    notifDb.forEach((n) => { n.read = true; });
    return HttpResponse.json({ ok: true });
  }),

  // ---- takeoff writes (in-memory) ----
  http.post('/api/projects/:projectId/takeoff', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const item = { id: `tk-${Date.now()}`, projectId: 'proj-greenview-01', status: 'draft', drawingReferences: [], modelReferences: [], createdBy: 'u-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body };
    takeoffDb.push(item);
    return HttpResponse.json(item, { status: 201 });
  }),
  http.patch('/api/takeoff/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const it = takeoffDb.find((t) => t.id === params.id);
    if (it) Object.assign(it, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(it ?? { ok: true });
  }),
  http.delete('/api/takeoff/:id', ({ params }) => {
    const i = takeoffDb.findIndex((t) => t.id === params.id);
    if (i >= 0) takeoffDb.splice(i, 1);
    return HttpResponse.json({ ok: true });
  }),

  // ---- boq writes (in-memory) ----
  http.post('/api/boq/work-packages/:wpId/items', async ({ params, request }) => {
    const body = (await request.json()) as { quantity: number; rate: number } & Record<string, unknown>;
    const item = { id: `bq-${Date.now()}`, workPackageId: params.wpId, status: 'draft', takeoffReferences: [], modelReferences: [], amount: (body.quantity ?? 0) * (body.rate ?? 0), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body };
    boqDb.push(item);
    return HttpResponse.json(item, { status: 201 });
  }),
  http.patch('/api/boq/items/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const it = boqDb.find((b) => b.id === params.id);
    if (it) {
      Object.assign(it, body, { updatedAt: new Date().toISOString() });
      it.amount = (it.quantity as number) * (it.rate as number);
    }
    return HttpResponse.json(it ?? { ok: true });
  }),
  http.delete('/api/boq/items/:id', ({ params }) => {
    const i = boqDb.findIndex((b) => b.id === params.id);
    if (i >= 0) boqDb.splice(i, 1);
    return HttpResponse.json({ ok: true });
  }),

  // ---- coordination / risks runs ----
  http.post('/api/projects/:projectId/coordination/clash-detection', () => HttpResponse.json({
    modelId: 'mdl-1', runId: `cr-${Date.now()}`, runAt: new Date().toISOString(), conflicts: [],
    statistics: { totalClashes: 23, newClashes: 3, resolvedClashes: 1, byType: { 'structural-vs-mep': 9 }, bySeverity: { critical: 4 } },
  })),
  http.post('/api/projects/:projectId/risks/monte-carlo', () => HttpResponse.json({
    simulationId: `mc-${Date.now()}`, runs: 10000, meanCost: 48200000, meanDuration: 424,
    p10Cost: 46100000, p50Cost: 48000000, p90Cost: 50800000,
    p10Duration: 402, p50Duration: 422, p90Duration: 448,
    costDistribution: [], durationDistribution: [], runAt: new Date().toISOString(),
  })),
  http.post('/api/projects/:projectId/cost/forecasts', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: `fc-${Date.now()}`, projectId: 'proj-greenview-01', isBaseline: false, createdBy: 'u-1', createdAt: new Date().toISOString(), ...body }, { status: 201 });
  }),
  http.post('/api/cost/forecasts/:id/run', () => HttpResponse.json({
    results: { totalForecast: 48200000, byCategory: [{ category: 'material', amount: 27900000 }], varianceFromBaseline: 3200000, confidence: 0.82 },
  })),

  // ---- copilot streaming (SSE fallback: returns full answer) ----
  http.post('/api/copilot/conversations/:id/messages', async ({ request }) => {
    const body = (await request.json()) as { content: string };
    return HttpResponse.json({
      message: { id: `m-${Date.now()}`, role: 'assistant', content: `Server echo (wire streaming here): ${body.content}`, evidence: [], verification: 'verified', createdAt: new Date().toISOString() },
    });
  }),

  // ---- super-admin platform (mock) ----
  http.get('/api/admin/overview', () => HttpResponse.json({
    users: { total: 5, byRole: [{ key: 'admin', count: 1 }, { key: 'project-manager', count: 1 }, { key: 'engineer', count: 3 }], suspended: 0 },
    projects: { total: 1, byStatus: [{ key: 'active', count: 1 }] },
    drawings: { total: 2, analysesByStatus: [{ key: 'completed', count: 2 }] },
    copilot: { conversations: 2, messages24h: 6 }, activity24h: 4,
  })),
  http.get('/api/admin/users', () => HttpResponse.json({ data: adminUsersDb, total: adminUsersDb.length, page: 1, limit: 20 })),
  http.patch('/api/admin/users/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const u = adminUsersDb.find((x) => x.id === params.id);
    if (!u) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
    if (body.role === 'admin' && adminUsersDb.some((x) => x.role === 'admin' && x.id !== u.id)) {
      return HttpResponse.json({ detail: 'Only one super admin is allowed' }, { status: 400 });
    }
    Object.assign(u, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(u);
  }),
  http.post('/api/admin/users/:id/suspend', ({ params }) => {
    const u = adminUsersDb.find((x) => x.id === params.id);
    if (!u) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
    u.isActive = false;
    return HttpResponse.json(u);
  }),
  http.post('/api/admin/users/:id/activate', ({ params }) => {
    const u = adminUsersDb.find((x) => x.id === params.id);
    if (!u) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
    u.isActive = true;
    return HttpResponse.json(u);
  }),
  http.get('/api/admin/projects', () => HttpResponse.json({ data: [{
    id: 'proj-greenview-01', name: 'Greenview Residency — Tower B', status: 'active',
    budget: 45000000, currency: 'INR', spent: 19200000, members: 8, drawings: 2,
    openConflicts: 23, openRisks: 5, ownerId: 'u-1', startDate: '2026-01-15', endDate: '2027-06-30',
  }], total: 1, page: 1, limit: 20 })),
  http.post('/api/admin/projects/:id/archive', ({ params }) => HttpResponse.json({ id: params.id, status: 'archived' })),
  http.get('/api/admin/ai/analyses', () => HttpResponse.json({ data: [{
    id: 'an-1', drawingId: 'dwg-a101', drawingName: 'A-101 Ground Floor Plan', projectId: 'proj-greenview-01',
    status: 'completed', confidence: 0.94, processedAt: new Date().toISOString(), error: null,
  }], total: 1, page: 1, limit: 20 })),
  http.get('/api/admin/ai/usage', () => HttpResponse.json({
    conversations: 2, assistantMessages: 5, failedVerifications: 0, negativeRatings: 0,
    byDay: [{ date: '2026-10-14', count: 3 }, { date: '2026-10-15', count: 2 }],
    byIntent: [{ intent: 'quantity_calculation', count: 2 }, { intent: 'cost_analysis', count: 2 }, { intent: 'project_question', count: 1 }],
  })),
  http.get('/api/admin/health', () => HttpResponse.json({
    app: 'CivIQ API', env: 'dev', version: '0.1.0',
    database: { ok: true, latencyMs: 1.2, error: null },
    storage: { bytes: 48200000, dir: './data/files' },
    redis: { ok: false, queueDepth: null },
    ai: { provider: 'local', model: 'keyword-responder' },
  })),
  http.get('/api/admin/settings', () => HttpResponse.json(adminSettingsDb)),
  http.put('/api/admin/settings', async ({ request }) => {
    const body = (await request.json()) as { key: string; value: { value: unknown } };
    const s = adminSettingsDb.find((x) => x.key === body.key);
    if (!s) return HttpResponse.json({ detail: 'Unknown setting key' }, { status: 400 });
    if (body.key === 'upload.max_mb') {
      const v = Number((body.value as { value: unknown }).value);
      if (!Number.isFinite(v) || v < 1 || v > 1024) return HttpResponse.json({ detail: 'upload.max_mb must be 1..1024' }, { status: 400 });
    }
    s.value = body.value;
    return HttpResponse.json(s);
  }),
  http.get('/api/admin/audit', () => HttpResponse.json({ data: [{
    id: 'al-1', actorId: 'u-1', actorName: 'Demo Engineer', actorRole: 'admin', action: 'auth.login',
    entityType: 'user', entityId: 'u-1', meta: {}, createdAt: new Date().toISOString(),
  }], total: 1, page: 1, limit: 20 })),
  http.get('/api/admin/billing', () => HttpResponse.json({ enabled: false, message: 'Subscription management is not enabled on this platform.' })),
];

const adminUsersDb: { id: string; email: string; name: string; role: string; isActive: boolean; projectCount: number; createdAt: string; updatedAt: string }[] = [
  { id: 'u-0', email: 'admin@civiq.ai', name: 'Platform Admin', role: 'admin', isActive: true, projectCount: 1, createdAt: '', updatedAt: '' },
  { id: 'u-1', email: 'demo@civiq.ai', name: 'Demo Engineer', role: 'project-manager', isActive: true, projectCount: 1, createdAt: '', updatedAt: '' },
  { id: 'u-2', email: 'ananya@acme.com', name: 'Ananya Rao', role: 'engineer', isActive: true, projectCount: 1, createdAt: '', updatedAt: '' },
  { id: 'u-3', email: 'ravi@acme.com', name: 'Ravi Kumar', role: 'engineer', isActive: true, projectCount: 0, createdAt: '', updatedAt: '' },
];

const adminSettingsDb: { key: string; value: { value: unknown }; updatedBy: string | null; updatedAt: string | null }[] = [
  { key: 'upload.max_mb', value: { value: 100 }, updatedBy: null, updatedAt: null },
  { key: 'ai.provider', value: { value: 'local' }, updatedBy: null, updatedAt: null },
  { key: 'ai.model', value: { value: 'keyword-responder' }, updatedBy: null, updatedAt: null },
  { key: 'ai.base_url', value: { value: '' }, updatedBy: null, updatedAt: null },
  { key: 'ai.api_key', value: { value: '' }, updatedBy: null, updatedAt: null },
  { key: 'announcement', value: { value: '' }, updatedBy: null, updatedAt: null },
];

const teamDb: { id: string; email: string; name: string; role: string; projectRole: string; lastActive: string; createdAt: string; updatedAt: string }[] = [
  { id: 'u-1', email: 'demo@civiq.ai', name: 'Demo Engineer', role: 'project-manager', projectRole: 'owner', lastActive: 'now', createdAt: '', updatedAt: '' },
  { id: 'u-2', email: 'ananya@acme.com', name: 'Ananya Rao', role: 'engineer', projectRole: 'manager', lastActive: '2m ago', createdAt: '', updatedAt: '' },
  { id: 'u-3', email: 'ravi@acme.com', name: 'Ravi Kumar', role: 'engineer', projectRole: 'engineer', lastActive: '1h ago', createdAt: '', updatedAt: '' },
];

const notifDb: { id: string; userId: string; type: string; title: string; body: string; link: string; read: boolean; createdAt: string }[] = [
  { id: 'n-1', userId: 'u-1', type: 'conflict', title: 'Critical clash: B-204 vs D-118', body: 'Zero clearance at L3 — blocks Friday pour.', link: '/coordination', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'n-2', userId: 'u-1', type: 'risk', title: 'R-07 steel procurement at 20 pts', body: 'Supplier B backlog — dual-source mitigation due.', link: '/risks', read: false, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'n-3', userId: 'u-1', type: 'schedule', title: 'Slab L5 at risk (Oct 28)', body: '12 days behind baseline BL-01.', link: '/schedule', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

interface MockDbRecord { id: string; [key: string]: unknown; }

const takeoffDb: MockDbRecord[] = [
  { id: 'tk-1', projectId: 'proj-greenview-01', trade: 'concrete', category: 'Footings', code: 'C-01', description: 'M25 footing concrete', unit: 'm3', quantity: 320, status: 'reviewed', drawingReferences: [], modelReferences: [], createdBy: 'u-1', createdAt: '', updatedAt: '' },
  { id: 'tk-2', projectId: 'proj-greenview-01', trade: 'steel', category: 'Columns', code: 'S-04', description: 'Fe550 rebar columns L2-L5', unit: 't', quantity: 86.4, status: 'draft', drawingReferences: [], modelReferences: [], createdBy: 'u-1', createdAt: '', updatedAt: '' },
];

const boqDb: MockDbRecord[] = [
  { id: 'bq-1', workPackageId: 'wp-2', code: '4.2.3', description: 'M25 RCC beam 500x300 incl. formwork', unit: 'm3', quantity: 46, rate: 18400, amount: 846400, takeoffReferences: [], modelReferences: [], status: 'priced', createdAt: '', updatedAt: '' },
];

const conflictDb: { id: string; projectId: string; type: string; severity: string; status: string; title: string; description: string; elements: unknown[]; assignedTo?: string; reportedBy: string; reportedAt: string; resolution?: string; attachments: unknown[]; comments: unknown[] }[] = [
  { id: 'cf-1', projectId: 'proj-greenview-01', type: 'structural-vs-mep', severity: 'critical', status: 'new', title: 'Beam B-204 vs Duct D-118 — zero clearance at L3', description: 'Duct clashes with beam soffit; needs reroute or notch.', elements: [], reportedBy: 'u-1', reportedAt: '', attachments: [], comments: [] },
];

const docsDb: { id: string; projectId: string; name: string; type: string; fileUrl: string; fileSize: number; version: number; folder: string; uploadedBy: string; createdAt: string }[] = [
  { id: 'doc-1', projectId: 'proj-greenview-01', name: 'A-101 Ground Floor Plan v2', type: 'pdf', fileUrl: '/drawings/A-101.pdf', fileSize: 2400000, version: 2, folder: 'Drawings', uploadedBy: 'u-1', createdAt: '2026-09-20T00:00:00Z' },
  { id: 'doc-2', projectId: 'proj-greenview-01', name: 'S-201 Framing L3 v1', type: 'pdf', fileUrl: '/drawings/S-201.pdf', fileSize: 1800000, version: 1, folder: 'Drawings', uploadedBy: 'u-1', createdAt: '2026-09-18T00:00:00Z' },
  { id: 'doc-3', projectId: 'proj-greenview-01', name: 'BOQ_Oct.xlsx', type: 'xlsx', fileUrl: '', fileSize: 184000, version: 1, folder: 'BOQ & Cost', uploadedBy: 'u-1', createdAt: '2026-10-02T00:00:00Z' },
  { id: 'doc-4', projectId: 'proj-greenview-01', name: 'Cost_Sep.pdf', type: 'pdf', fileUrl: '', fileSize: 420000, version: 1, folder: 'BOQ & Cost', uploadedBy: 'u-1', createdAt: '2026-09-30T00:00:00Z' },
];
