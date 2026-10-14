import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app/App';

async function enableMocks() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MSW !== 'false') {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({ onUnhandledRequest: 'bypass' });
    } catch (err) {
      // Loud in dev: without the worker every API call 404s. Fix: `npx msw init public/`
      console.error('[MSW] mock worker failed to start — API calls will 404. Run `npx msw init public/` and restart.', err);
    }
  }
}

enableMocks().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
