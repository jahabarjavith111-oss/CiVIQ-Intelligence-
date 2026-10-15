export interface DashboardHealth {
  overall: number;
  cost: number;
  schedule: number;
  quality: number;
  safety: number;
  risk: number;
}

export interface DashboardInsight {
  id: string;
  text: string;
  severity: 'info' | 'warning' | 'critical';
  link?: string;
  createdAt: string;
}

export interface DashboardMilestone {
  id: string;
  name: string;
  date: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'delayed' | 'done';
}
