import { User } from './auth';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'archived';
  location?: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  startDate: string;
  endDate?: string;
  budget?: number;
  currency: string;
  ownerId: string;
  members: ProjectMember[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  user?: User;
  role: 'owner' | 'manager' | 'engineer' | 'viewer';
  joinedAt: string;
}

export interface ProjectSettings {
  units: 'metric' | 'imperial';
  timezone: string;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  integrations: {
    bim360?: boolean;
    procore?: boolean;
    autodesk?: boolean;
  };
}

export interface CreateProjectData {
  name: string;
  description?: string;
  location?: Project['location'];
  startDate: string;
  endDate?: string;
  budget?: number;
  currency?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  status?: Project['status'];
}

export interface ProjectHealth {
  overall: number; // 0-100
  cost: number;
  schedule: number;
  quality: number;
  safety: number;
  risk: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: Project['status'];
  health: ProjectHealth;
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate?: string;
  memberCount: number;
}