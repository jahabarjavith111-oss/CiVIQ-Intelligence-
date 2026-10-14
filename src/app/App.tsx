import { Providers } from './providers';
import { AppRoutes } from './routes';
import { Toasts } from '@/components/common/Toasts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function App() {
  return (
    <Providers>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
      <Toasts />
    </Providers>
  );
}
