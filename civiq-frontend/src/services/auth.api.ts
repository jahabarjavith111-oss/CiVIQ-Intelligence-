import { api } from './api';
import type { User, LoginCredentials, RegisterData, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest } from '@/types/auth';

export const authApi = {
  login: (credentials: LoginCredentials) => api.post<AuthResponse>('/auth/login', credentials),
  register: (data: RegisterData) => api.post<AuthResponse>('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),
  me: () => api.get<User>('/auth/me'),
  updateProfile: (data: Partial<User>) => api.patch<User>('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) => api.post('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (data: ForgotPasswordRequest) => api.post('/auth/forgot-password', data),
  resetPassword: (data: ResetPasswordRequest) => api.post('/auth/reset-password', data),
  verifyEmail: (data: VerifyEmailRequest) => api.post('/auth/verify-email', data),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
};