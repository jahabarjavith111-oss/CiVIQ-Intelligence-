export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: 'admin' | 'project-manager' | 'engineer' | 'viewer';
  isActive: boolean;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CountItem {
  key: string;
  count: number;
}

export interface AdminOverview {
  users: { total: number; byRole: CountItem[]; suspended: number };
  projects: { total: number; byStatus: CountItem[] };
  drawings: { total: number; analysesByStatus: CountItem[] };
  copilot: { conversations: number; messages24h: number };
  activity24h: number;
}

export interface AdminProjectStat {
  id: string;
  name: string;
  status: string;
  budget?: number | null;
  currency: string;
  spent: number;
  members: number;
  drawings: number;
  openConflicts: number;
  openRisks: number;
  ownerId: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface AiAnalysisRow {
  id: string;
  drawingId: string;
  drawingName: string;
  projectId?: string | null;
  status: string;
  confidence: number;
  processedAt?: string | null;
  error?: string | null;
}

export interface AiUsage {
  conversations: number;
  assistantMessages: number;
  failedVerifications: number;
  negativeRatings: number;
  byDay: { date: string; count: number }[];
  byIntent: { intent: string; count: number }[];
}

export interface SystemHealth {
  app: string;
  env: string;
  version: string;
  database: { ok: boolean; latencyMs?: number | null; error?: string | null };
  storage: { bytes: number; dir: string };
  redis: { ok: boolean | null; queueDepth?: number | null };
  ai: { provider: string; model: string };
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
