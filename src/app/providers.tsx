import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';
import { queryClient } from './queryClient';

function ThemeInit() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const apply = () => {
      const t = useUiStore.getState().theme;
      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInit />
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
