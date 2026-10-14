export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'project-manager' | 'engineer' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  company?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export type UserRole = User['role'];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  'project-manager': ['projects:*', 'drawings:*', 'model-3d:*', 'copilot:*', 'takeoff:*', 'boq:*', 'cost:*', 'schedule:*', 'coordination:*', 'revisions:*', 'risks:*', 'simulation:*', 'analytics:*', 'documents:*', 'reports:*', 'team:*'],
  engineer: ['projects:read', 'drawings:*', 'model-3d:*', 'copilot:*', 'takeoff:*', 'boq:read', 'cost:read', 'schedule:read', 'coordination:*', 'revisions:read', 'risks:read', 'simulation:read', 'analytics:read', 'documents:*', 'reports:read'],
  viewer: ['projects:read', 'drawings:read', 'model-3d:read', 'copilot:read', 'takeoff:read', 'boq:read', 'cost:read', 'schedule:read', 'coordination:read', 'revisions:read', 'risks:read', 'simulation:read', 'analytics:read', 'documents:read', 'reports:read'],
};