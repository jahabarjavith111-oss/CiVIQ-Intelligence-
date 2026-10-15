export const APP_NAME = 'CivIQ';
export const APP_DESCRIPTION = 'Construction Intelligence Platform';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  PROJECT_NEW: '/projects/new',
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,
  PROJECT_3D: (projectId: string) => `/projects/${projectId}/model-3d`,
  DRAWINGS: '/drawings',
  DRAWING_DETAIL: (id: string) => `/drawings/${id}`,
  DRAWING_ANALYZE: (id: string) => `/drawings/${id}/analyze`,
  MODEL_3D: '/model-3d',
  COPILOT: '/copilot',
  PROJECT_COPILOT: (projectId: string) => `/projects/${projectId}/copilot`,
  TAKEOFF: '/takeoff',
  BOQ: '/boq',
  COST: '/cost',
  SCHEDULE: '/schedule',
  COORDINATION: '/coordination',
  REVISIONS: '/revisions',
  RISKS: '/risks',
  SIMULATION: '/simulation',
  ANALYTICS: '/analytics',
  DOCUMENTS: '/documents',
  REPORTS: '/reports',
  ACTIVITY: '/activity',
  TEAM: '/team',
  NOTIFICATIONS: '/notifications',
  ONBOARDING: '/onboarding',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_PROJECTS: '/admin/projects',
  ADMIN_AI: '/admin/ai',
  ADMIN_HEALTH: '/admin/health',
  ADMIN_AUDIT: '/admin/audit',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_BILLING: '/admin/billing',
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
  MAINTENANCE: '/maintenance',
} as const;

export interface ModuleDef {
  key: string;
  label: string;
  icon: string;
  route: string;
  /** Required `resource:action` permission; null = any authenticated user. */
  perm: string | null;
}

/** Sidebar modules; filtered per role by ROLE_PERMISSIONS (src/types/auth.ts). */
export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Command Center', icon: 'layout-dashboard', route: ROUTES.DASHBOARD, perm: null },
  { key: 'projects', label: 'Projects', icon: 'folder-kanban', route: ROUTES.PROJECTS, perm: 'projects:read' },
  { key: 'drawings', label: 'Drawing Intelligence', icon: 'file-image', route: ROUTES.DRAWINGS, perm: 'drawings:read' },
  { key: 'model-3d', label: '3D Model', icon: 'cube', route: ROUTES.MODEL_3D, perm: 'model-3d:read' },
  { key: 'copilot', label: 'Copilot', icon: 'bot', route: ROUTES.COPILOT, perm: 'copilot:read' },
  { key: 'takeoff', label: 'Takeoff', icon: 'ruler', route: ROUTES.TAKEOFF, perm: 'takeoff:read' },
  { key: 'boq', label: 'BOQ', icon: 'list-tree', route: ROUTES.BOQ, perm: 'boq:read' },
  { key: 'cost', label: 'Cost Intelligence', icon: 'dollar-sign', route: ROUTES.COST, perm: 'cost:read' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar', route: ROUTES.SCHEDULE, perm: 'schedule:read' },
  { key: 'coordination', label: 'Coordination', icon: 'git-merge', route: ROUTES.COORDINATION, perm: 'coordination:read' },
  { key: 'revisions', label: 'Revisions', icon: 'git-compare', route: ROUTES.REVISIONS, perm: 'revisions:read' },
  { key: 'risks', label: 'Risk Intelligence', icon: 'alert-triangle', route: ROUTES.RISKS, perm: 'risks:read' },
  { key: 'simulation', label: 'Simulation', icon: 'flask-conical', route: ROUTES.SIMULATION, perm: 'simulation:read' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-3', route: ROUTES.ANALYTICS, perm: 'analytics:read' },
  { key: 'documents', label: 'Documents', icon: 'file-text', route: ROUTES.DOCUMENTS, perm: 'documents:read' },
  { key: 'reports', label: 'Reports', icon: 'file-output', route: ROUTES.REPORTS, perm: 'reports:read' },
  { key: 'activity', label: 'Activity', icon: 'activity', route: ROUTES.ACTIVITY, perm: null },
  { key: 'team', label: 'Team', icon: 'users', route: ROUTES.TEAM, perm: null },
  { key: 'notifications', label: 'Notifications', icon: 'bell', route: ROUTES.NOTIFICATIONS, perm: null },
];

/** Super-admin-only section. Rendered iff user.role === 'admin'. */
export const ADMIN_MODULES: ModuleDef[] = [
  { key: 'admin-overview', label: 'Platform Overview', icon: 'shield', route: ROUTES.ADMIN, perm: null },
  { key: 'admin-users', label: 'Users', icon: 'users', route: ROUTES.ADMIN_USERS, perm: null },
  { key: 'admin-projects', label: 'All Projects', icon: 'folder-kanban', route: ROUTES.ADMIN_PROJECTS, perm: null },
  { key: 'admin-ai', label: 'AI Monitoring', icon: 'bot', route: ROUTES.ADMIN_AI, perm: null },
  { key: 'admin-health', label: 'System Health', icon: 'activity', route: ROUTES.ADMIN_HEALTH, perm: null },
  { key: 'admin-audit', label: 'Audit Logs', icon: 'file-text', route: ROUTES.ADMIN_AUDIT, perm: null },
  { key: 'admin-settings', label: 'Platform Settings', icon: 'settings', route: ROUTES.ADMIN_SETTINGS, perm: null },
  { key: 'admin-billing', label: 'Subscriptions', icon: 'dollar-sign', route: ROUTES.ADMIN_BILLING, perm: null },
];

export const PROJECT_STATUSES = ['planning', 'active', 'on-hold', 'completed', 'archived'] as const;
export const DRAWING_TYPES = ['architectural', 'structural', 'mep', 'electrical', 'plumbing', 'civil'] as const;
export const DRAWING_STATUSES = ['uploaded', 'processing', 'analyzed', 'approved', 'rejected'] as const;
export const RISK_CATEGORIES = ['cost', 'schedule', 'design', 'procurement', 'material', 'resource', 'quality', 'coordination', 'safety'] as const;
export const CONFLICT_TYPES = ['dimension', 'position', 'missing-element', 'clearance', 'routing'] as const;
export const REVISION_ACTIONS = ['added', 'removed', 'moved', 'modified'] as const;

export const PAGINATION_DEFAULT_PAGE_SIZE = 20;
export const PAGINATION_MAX_PAGE_SIZE = 100;

export const FILE_UPLOAD_MAX_SIZE = 100 * 1024 * 1024; // 100MB
export const FILE_UPLOAD_ALLOWED_TYPES = ['application/pdf', 'application/dwg', 'image/png', 'image/jpeg', 'model/gltf-binary', 'model/gltf+json'];

export const WS_RECONNECT_INTERVAL = 5000;
export const WS_MAX_RECONNECT_ATTEMPTS = 10;

export const COPILOT_INTENTS = [
  'drawing_analysis',
  'quantity_calculation',
  'boq_analysis',
  'cost_analysis',
  'schedule_analysis',
  'risk_analysis',
  'conflict_analysis',
  'revision_analysis',
  'model_query',
  'project_question',
  'what_if',
  'report_question',
] as const;

export const TRADE_CATEGORIES = [
  'concrete',
  'steel',
  'cement',
  'bricks',
  'sand',
  'aggregate',
  'tiles',
  'paint',
  'doors',
  'windows',
  'pipes',
  'electrical',
  'labour',
  'equipment',
] as const;

export const COST_CATEGORIES = [
  'material',
  'labour',
  'equipment',
  'transport',
  'overhead',
  'tax',
  'wastage',
  'markup',
] as const;

export const LAYER_CATEGORIES = [
  'architecture',
  'structure',
  'mep',
  'electrical',
  'plumbing',
] as const;

export const FLOOR_LABELS = ['B2', 'B1', 'GF', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', '9F', '10F', 'RF', 'PH'] as const;