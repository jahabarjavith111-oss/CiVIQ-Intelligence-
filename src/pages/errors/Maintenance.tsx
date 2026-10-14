import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function Maintenance() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <p className="text-6xl font-bold">🛠</p>
      <p className="font-semibold">Under maintenance</p>
      <p className="text-text-muted">CivIQ is being upgraded. Back shortly.</p>
      <Link to="/dashboard"><Button variant="outline">Check status</Button></Link>
    </div>
  );
}
