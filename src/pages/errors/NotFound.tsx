import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <p className="text-6xl font-bold">404</p>
      <p className="text-text-muted">Page not found.</p>
      <Link to="/dashboard"><Button>Back to dashboard</Button></Link>
    </div>
  );
}
