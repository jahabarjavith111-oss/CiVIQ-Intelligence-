import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function ServerError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <p className="text-6xl font-bold">500</p>
      <p className="text-text-muted">Something went wrong on our side. The team has been notified.</p>
      <div className="flex gap-2">
        <Link to="/dashboard"><Button>Back to dashboard</Button></Link>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    </div>
  );
}
