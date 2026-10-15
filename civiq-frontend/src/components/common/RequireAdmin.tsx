import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/utils/permissions';

/** Super-admin-only route branch. Non-admins are sent to the dashboard. */
export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const bypass = import.meta.env.VITE_BYPASS_AUTH === 'true';
  if (!isAuthenticated && !bypass) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin(user?.role) && !bypass) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
