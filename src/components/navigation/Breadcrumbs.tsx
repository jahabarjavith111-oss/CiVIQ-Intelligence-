import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segs = pathname.split('/').filter(Boolean).slice(0, 3);
  if (segs.length === 0) return null;
  return (
    <div className="mb-4 flex items-center gap-1 text-xs text-text-muted">
      <Link to="/dashboard" className="hover:text-text-secondary">Home</Link>
      {segs.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <span className={i === segs.length - 1 ? 'font-semibold text-text-primary' : ''}>{decodeURIComponent(s)}</span>
        </span>
      ))}
    </div>
  );
}
