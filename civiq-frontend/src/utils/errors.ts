import axios from 'axios';

/** Human-readable message from an API failure (axios or otherwise). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Cannot reach the server. Check that the backend is running and CORS allows this origin.';
    }
    const data = err.response.data as { detail?: unknown; message?: string } | undefined;
    const detail = data?.detail ?? data?.message;
    if (typeof detail === 'string' && detail) return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string; loc?: (string | number)[] } | undefined;
      if (first?.msg) {
        const where = first.loc?.slice(1).join('.');
        return where ? `${where}: ${first.msg}` : first.msg;
      }
    }
    if (err.response.status === 401) return 'Invalid email or password.';
    if (err.response.status === 409) return 'This email is already registered. Try signing in instead.';
    return `Request failed (${err.response.status}).`;
  }
  return fallback;
}
