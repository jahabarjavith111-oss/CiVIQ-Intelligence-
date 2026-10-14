import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/auth.api';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/app/config';

export function useAuth() {
  const store = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await authApi.me()).data,
    enabled: store.isAuthenticated && !store.user,
    retry: false,
  });

  const login = useMutation({
    mutationFn: async (vars: { email: string; password: string }) =>
      (await authApi.login({ ...vars })).data,
    onSuccess: (data) => {
      store.setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      navigate(ROUTES.DASHBOARD);
    },
  });

  const register = useMutation({
    mutationFn: async (vars: { email: string; password: string; name: string }) =>
      (await authApi.register(vars)).data,
    onSuccess: (data) => {
      store.setAuth(data.user, data.accessToken, data.refreshToken);
      navigate(ROUTES.DASHBOARD);
    },
  });

  const logout = useMutation({
    mutationFn: async () => authApi.logout().catch(() => null),
    onSuccess: () => {
      store.logout();
      queryClient.clear();
      navigate(ROUTES.LOGIN);
    },
  });

  return { ...store, meQuery, login, register, logout };
}
