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
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
  MAINTENANCE: '/maintenance',
} as const;

export const MODULES = [
  { key: 'dashboard', label: 'Command Center', icon: 'layout-dashboard', route: ROUTES.DASHBOARD },
  { key: 'projects', label: 'Projects', icon: 'folder-kanban', route: ROUTES.PROJECTS },
  { key: 'drawings', label: 'Drawing Intelligence', icon: 'file-image', route: ROUTES.DRAWINGS },
  { key: 'model-3d', label: '3D Model', icon: 'cube', route: ROUTES.MODEL_3D },
  { key: 'copilot', label: 'Copilot', icon: 'bot', route: ROUTES.COPILOT },
  { key: 'takeoff', label: 'Takeoff', icon: 'ruler', route: ROUTES.TAKEOFF },
  { key: 'boq', label: 'BOQ', icon: 'list-tree', route: ROUTES.BOQ },
  { key: 'cost', label: 'Cost Intelligence', icon: 'dollar-sign', route: ROUTES.COST },
  { key: 'schedule', label: 'Schedule', icon: 'calendar', route: ROUTES.SCHEDULE },
  { key: 'coordination', label: 'Coordination', icon: 'git-merge', route: ROUTES.COORDINATION },
  { key: 'revisions', label: 'Revisions', icon: 'git-compare', route: ROUTES.REVISIONS },
  { key: 'risks', label: 'Risk Intelligence', icon: 'alert-triangle', route: ROUTES.RISKS },
  { key: 'simulation', label: 'Simulation', icon: 'flask-conical', route: ROUTES.SIMULATION },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-3', route: ROUTES.ANALYTICS },
  { key: 'documents', label: 'Documents', icon: 'file-text', route: ROUTES.DOCUMENTS },
  { key: 'reports', label: 'Reports', icon: 'file-output', route: ROUTES.REPORTS },
  { key: 'activity', label: 'Activity', icon: 'activity', route: ROUTES.ACTIVITY },
  { key: 'team', label: 'Team', icon: 'users', route: ROUTES.TEAM },
  { key: 'notifications', label: 'Notifications', icon: 'bell', route: ROUTES.NOTIFICATIONS },
] as const;

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