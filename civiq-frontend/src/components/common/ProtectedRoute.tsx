import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  // Dev bypass: allow without login when MSW mock mode (comment out for prod)
  const bypass = import.meta.env.VITE_BYPASS_AUTH === 'true';
  if (!isAuthenticated && !bypass) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
