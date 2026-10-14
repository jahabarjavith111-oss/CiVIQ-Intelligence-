import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAuthStore } from '@/store/authStore';
import { queryClient } from '@/app/queryClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || '/ws';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const authStore = getAuthStore();
        const token = authStore.getState().accessToken;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        // Safety net: dev servers and misconfigured backends answer unknown API
        // paths with the SPA shell (HTML, HTTP 200). Surface that as a real error
        // so queries show their error state instead of crashing on bad shapes.
        if (typeof response.data === 'string' && response.data.trimStart().toLowerCase().startsWith('<!doctype')) {
          return Promise.reject(
            new Error(`API returned HTML instead of JSON for ${response.config.url} — missing mock handler or wrong VITE_API_URL`)
          );
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            forceLogout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const authStore = getAuthStore();
      const refreshToken = authStore.getState().refreshToken;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
      const { accessToken } = response.data;

      authStore.getState().setTokens(accessToken, refreshToken);
      return accessToken;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  get<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  post<T = unknown>(url: string, data?: unknown) {
    return this.client.post<T>(url, data);
  }

  put<T = unknown>(url: string, data?: unknown) {
    return this.client.put<T>(url, data);
  }

  patch<T = unknown>(url: string, data?: unknown) {
    return this.client.patch<T>(url, data);
  }

  delete<T = unknown>(url: string) {
    return this.client.delete<T>(url);
  }

  upload<T = unknown>(url: string, formData: FormData, onProgress?: (progress: number) => void) {
    return this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
  }
}

export const api = new ApiClient();
export { API_BASE_URL, WS_BASE_URL };

/** Clear all client-side auth + cached data and send the user to login. */
export function forceLogout() {
  getAuthStore().getState().logout();
  queryClient.clear();
  window.location.href = '/login';
}